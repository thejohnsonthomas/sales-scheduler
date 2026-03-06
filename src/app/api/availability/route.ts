import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { findAvailableSlots } from '@/lib/scheduling-engine';
import { Role } from '@prisma/client';
import { parse, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN, Role.ACCOUNT_EXECUTIVE]);
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const aeId = searchParams.get('aeId');
  const segmentId = searchParams.get('segmentId');
  const regionId = searchParams.get('regionId');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const duration = searchParams.get('duration');

  if (!aeId || !segmentId || !regionId || !startDateStr || !endDateStr || !duration) {
    return NextResponse.json(
      { error: 'Missing required params: aeId, segmentId, regionId, startDate, endDate, duration' },
      { status: 400 }
    );
  }

  const durationNum = parseInt(duration, 10);
  if (isNaN(durationNum) || ![15, 30, 45, 60].includes(durationNum)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }

  let startDate: Date;
  let endDate: Date;
  try {
    startDate = startOfDay(parse(startDateStr, 'yyyy-MM-dd', new Date()));
    endDate = endOfDay(parse(endDateStr, 'yyyy-MM-dd', new Date()));
  } catch {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  try {
    const slots = await findAvailableSlots({
      aeId,
      segmentId,
      regionId,
      startDate,
      endDate,
      durationMinutes: durationNum,
    });
    return NextResponse.json({ slots });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to find slots' },
      { status: 400 }
    );
  }
}
