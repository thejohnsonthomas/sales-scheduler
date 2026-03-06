import { google } from 'googleapis';
import { prisma } from './prisma';
import { addMinutes, formatISO } from 'date-fns';

const BUFFER_MINUTES = 10;

export async function getCalendarClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { refreshToken: true },
  });

  if (!user?.refreshToken) {
    throw new Error('Google Calendar not connected. Please reconnect your account.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({ refresh_token: user.refreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return calendar;
}

export interface BusySlot {
  start: Date;
  end: Date;
}

export async function getBusySlots(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<BusySlot[]> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: formatISO(startDate),
      timeMax: formatISO(endDate),
      items: [{ id: 'primary' }],
    },
  });

  const busy = response.data.calendars?.primary?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({
      start: new Date(b.start!),
      end: new Date(b.end!),
    }));
}

export function addBufferToBusySlots(slots: BusySlot[]): BusySlot[] {
  return slots.map((slot) => ({
    start: addMinutes(slot.start, -BUFFER_MINUTES),
    end: addMinutes(slot.end, BUFFER_MINUTES),
  }));
}

export function mergeOverlappingSlots(slots: BusySlot[]): BusySlot[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BusySlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = current.end > last.end ? current.end : last.end;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

export async function createCalendarEvent(
  userId: string,
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendees: string[]
) {
  const calendar = await getCalendarClient(userId);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary,
      description,
      start: {
        dateTime: formatISO(startTime),
        timeZone: 'UTC',
      },
      end: {
        dateTime: formatISO(endTime),
        timeZone: 'UTC',
      },
      attendees: attendees.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  });

  return event.data.id ?? null;
}

export async function checkSlotAvailability(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const bufferStart = addMinutes(startTime, -BUFFER_MINUTES);
  const bufferEnd = addMinutes(endTime, BUFFER_MINUTES);
  const busySlots = await getBusySlots(userId, bufferStart, bufferEnd);
  const withBuffer = addBufferToBusySlots(busySlots);
  const merged = mergeOverlappingSlots(withBuffer);

  for (const slot of merged) {
    if (slot.start < bufferEnd && slot.end > bufferStart) {
      return false;
    }
  }
  return true;
}
