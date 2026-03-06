import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCalendarEvent } from '@/lib/calendar';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { ae: true, se: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  if (meeting.googleEventId) {
    return NextResponse.json(
      { error: 'Meeting already has a calendar event', calendarCreated: true },
      { status: 400 }
    );
  }

  const isAE = meeting.aeId === session.user.id;
  const isSE = meeting.seId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  if (!isAE && !isSE && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const summary = `Sales Demo - ${meeting.customerEmail}`;
  const description = `Demo meeting with ${meeting.customerEmail}. AE: ${meeting.ae.email}`;
  const attendees = [meeting.ae.email, meeting.customerEmail];

  try {
    const eventId = await createCalendarEvent(
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
      return NextResponse.json({ calendarCreated: true, eventId });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Calendar error';
    return NextResponse.json(
      { error: `Could not add to calendar: ${msg}. Ensure the SE has signed in with Google.`, calendarCreated: false },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Could not create calendar event.', calendarCreated: false },
    { status: 400 }
  );
}
