import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
  parseISO,
} from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const periodType = searchParams.get('periodType') ?? 'week';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const weekStartParam = searchParams.get('weekStart');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const seId = searchParams.get('seId');
  const aeId = searchParams.get('aeId');
  const regionId = searchParams.get('regionId');
  const segmentId = searchParams.get('segmentId');

  let periodStart: Date;
  let periodEnd: Date;

  const now = new Date();

  if (periodType === 'daterange' && startDateParam && endDateParam) {
    periodStart = startOfDay(parseISO(startDateParam));
    periodEnd = endOfDay(parseISO(endDateParam));
  } else if (periodType === 'week' && weekStartParam) {
    const weekDate = parseISO(weekStartParam);
    periodStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    periodEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  } else if (periodType === 'month' && monthParam && yearParam) {
    const m = parseInt(monthParam, 10);
    const y = parseInt(yearParam, 10);
    const monthDate = new Date(y, m - 1, 1);
    periodStart = startOfMonth(monthDate);
    periodEnd = endOfMonth(monthDate);
  } else if (periodType === 'week') {
    periodStart = startOfWeek(now, { weekStartsOn: 1 });
    periodEnd = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  }

  const where: Prisma.MeetingWhereInput = {
    status: 'scheduled',
    startTime: { gte: periodStart },
    endTime: { lte: periodEnd },
  };

  if (seId) where.seId = seId;
  if (aeId) where.aeId = aeId;
  if (regionId) where.regionId = regionId;
  if (segmentId) where.segmentId = segmentId;

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      se: { select: { id: true, name: true, email: true } },
      ae: { select: { id: true, name: true, email: true } },
      segment: true,
      region: true,
    },
  });

  const bySe = new Map<string, { se: { id: string; name: string | null; email: string }; count: number }>();
  const bySegment = new Map<string, { segment: { id: string; name: string }; count: number }>();
  const byRegion = new Map<string, { region: { id: string; name: string }; count: number }>();
  const bySegmentRegion = new Map<string, { segment: string; region: string; count: number }>();

  for (const m of meetings) {
    const seKey = m.seId;
    if (!bySe.has(seKey)) {
      bySe.set(seKey, { se: m.se, count: 0 });
    }
    bySe.get(seKey)!.count++;

    const segKey = m.segmentId;
    if (!bySegment.has(segKey)) {
      bySegment.set(segKey, { segment: m.segment, count: 0 });
    }
    bySegment.get(segKey)!.count++;

    const regKey = m.regionId;
    if (!byRegion.has(regKey)) {
      byRegion.set(regKey, { region: m.region, count: 0 });
    }
    byRegion.get(regKey)!.count++;

    const srKey = `${m.segmentId}-${m.regionId}`;
    if (!bySegmentRegion.has(srKey)) {
      bySegmentRegion.set(srKey, {
        segment: m.segment.name,
        region: m.region.name,
        count: 0,
      });
    }
    bySegmentRegion.get(srKey)!.count++;
  }

  const total = meetings.length;
  const seReport = Array.from(bySe.values()).map((v) => ({
    ...v,
    distribution: total > 0 ? ((v.count / total) * 100).toFixed(1) + '%' : '0%',
  }));

  const segmentReport = Array.from(bySegment.values()).map((v) => ({
    ...v,
    distribution: total > 0 ? ((v.count / total) * 100).toFixed(1) + '%' : '0%',
  }));

  const regionReport = Array.from(byRegion.values()).map((v) => ({
    ...v,
    distribution: total > 0 ? ((v.count / total) * 100).toFixed(1) + '%' : '0%',
  }));

  const segmentRegionReport = Array.from(bySegmentRegion.values());

  return NextResponse.json({
    periodType,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalMeetings: total,
    bySE: seReport,
    bySegment: segmentReport,
    byRegion: regionReport,
    bySegmentRegion: segmentRegionReport,
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
