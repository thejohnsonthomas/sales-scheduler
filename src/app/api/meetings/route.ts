import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { scheduleMeeting } from '@/lib/scheduling-engine';
import { createCalendarEvent } from '@/lib/calendar';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { parse } from 'date-fns';

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole([Role.ADMIN, Role.ACCOUNT_EXECUTIVE]);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const aeId = session.user.id;
  const body = await req.json();
  const { customerEmail, segmentId, regionId, durationMinutes, date } = body;

  if (!customerEmail || !segmentId || !regionId || !durationMinutes || !date) {
    return NextResponse.json(
      { error: 'Missing: customerEmail, segmentId, regionId, durationMinutes, date' },
      { status: 400 }
    );
  }

  const durationNum = parseInt(durationMinutes, 10);
  if (isNaN(durationNum) || ![15, 30, 45, 60].includes(durationNum)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }

  try {
    const { meetingId, seId } = await scheduleMeeting({
      aeId,
      customerEmail,
      segmentId,
      regionId,
      durationMinutes: durationNum,
      startTime: new Date(),
      date,
    });

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { ae: true, se: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 500 });
    }

    const summary = `Sales Demo - ${meeting.customerEmail}`;
    const description = `Demo meeting with ${meeting.customerEmail}. AE: ${meeting.ae.email}`;
    // SE is the organizer; AE and customer are participants so it shows on both calendars
    const attendees = [meeting.ae.email, meeting.customerEmail];

    let eventId: string | null = null;
    let calendarError: string | null = null;

    try {
      eventId = await createCalendarEvent(
        meeting.seId,
        summary,
        description,
        meeting.startTime,
        meeting.endTime,
        attendees
      );
      if (eventId) {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { googleEventId: eventId },
        });
      }
    } catch (calErr) {
      calendarError = calErr instanceof Error ? calErr.message : 'Calendar error';
    }

    return NextResponse.json({
      meetingId,
      seId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      calendarCreated: !!eventId,
      calendarError: calendarError || undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Scheduling failed' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireRole([Role.ADMIN, Role.ACCOUNT_EXECUTIVE, Role.SOLUTION_ENGINEER]);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = session.user.role;

  const where: Record<string, unknown> = { status: 'scheduled' };
  if (role === Role.ACCOUNT_EXECUTIVE) {
    where.aeId = session.user.id;
  } else if (role === Role.SOLUTION_ENGINEER) {
    where.seId = session.user.id;
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      ae: { select: { id: true, name: true, email: true } },
      se: { select: { id: true, name: true, email: true } },
      segment: true,
      region: true,
    },
    orderBy: { startTime: 'asc' },
  });

  return NextResponse.json({ meetings });
}
