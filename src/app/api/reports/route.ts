import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') ?? 'weekly';

  const now = new Date();
  const periodStart = view === 'monthly' ? startOfMonth(now) : startOfWeek(now, { weekStartsOn: 1 });
  const periodEnd = view === 'monthly' ? endOfMonth(now) : endOfWeek(now, { weekStartsOn: 1 });

  const meetings = await prisma.meeting.findMany({
    where: {
      status: 'scheduled',
      startTime: { gte: periodStart },
      endTime: { lte: periodEnd },
    },
    include: {
      se: { select: { id: true, name: true, email: true } },
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
    view,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totalMeetings: total,
    bySE: seReport,
    bySegment: segmentReport,
    byRegion: regionReport,
    bySegmentRegion: segmentRegionReport,
  });
}
