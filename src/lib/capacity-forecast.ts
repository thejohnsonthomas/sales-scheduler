import { prisma } from './prisma';
import { startOfWeek, subDays, addDays, format } from 'date-fns';

export interface SECapacity {
  seId: string;
  seName: string;
  maxPerDay: number;
  maxPerWeek: number;
  bookedToday: number;
  bookedThisWeek: number;
  remainingToday: number;
  remainingThisWeek: number;
  utilizationPercent: number;
}

export interface SegmentRegionCapacity {
  segmentId: string;
  segmentName: string;
  regionId: string;
  regionName: string;
  totalCapacity: number;
  currentBookings: number;
  remainingCapacity: number;
  utilizationPercent: number;
  seCount: number;
}

export interface ForecastResult {
  segmentId: string | null;
  segmentName: string | null;
  regionId: string | null;
  regionName: string | null;
  forecastDate: string;
  predictedDemand: number;
  capacity: number;
  status: 'Safe' | 'Warning' | 'Capacity Risk';
  daysUntilRisk?: number;
}

export async function getSECapacity(seId: string): Promise<SECapacity | null> {
  const se = await prisma.user.findUnique({
    where: { id: seId },
    include: { capacityLimits: true },
  });

  if (!se || se.role !== 'SOLUTION_ENGINEER') return null;

  const limits = se.capacityLimits;
  const maxPerDay = limits?.maxMeetingsPerDay ?? 6;
  const maxPerWeek = limits?.maxMeetingsPerWeek ?? 25;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = addDays(todayStart, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const [bookedToday, bookedThisWeek] = await Promise.all([
    prisma.meeting.count({
      where: {
        seId,
        status: 'scheduled',
        startTime: { gte: todayStart },
        endTime: { lt: todayEnd },
      },
    }),
    prisma.meeting.count({
      where: {
        seId,
        status: 'scheduled',
        startTime: { gte: weekStart },
        endTime: { lt: weekEnd },
      },
    }),
  ]);

  const remainingToday = Math.max(0, maxPerDay - bookedToday);
  const remainingThisWeek = Math.max(0, maxPerWeek - bookedThisWeek);
  const utilizationPercent = Math.min(100, (bookedThisWeek / maxPerWeek) * 100);

  return {
    seId: se.id,
    seName: se.name ?? se.email,
    maxPerDay,
    maxPerWeek,
    bookedToday,
    bookedThisWeek,
    remainingToday,
    remainingThisWeek,
    utilizationPercent,
  };
}

export async function getSegmentRegionCapacity(
  segmentId?: string,
  regionId?: string
): Promise<SegmentRegionCapacity[]> {
  const ses = await prisma.user.findMany({
    where: {
      role: 'SOLUTION_ENGINEER',
      enabled: true,
      ...(segmentId && {
        userSegments: { some: { segmentId } },
      }),
      ...(regionId && {
        userRegions: { some: { regionId } },
      }),
    },
    include: {
      userSegments: { include: { segment: true } },
      userRegions: { include: { region: true } },
      capacityLimits: true,
    },
  });

  const segmentRegionMap = new Map<string, { ses: typeof ses; segment: { id: string; name: string }; region: { id: string; name: string } }>();

  for (const se of ses) {
    for (const us of se.userSegments) {
      for (const ur of se.userRegions) {
        const key = `${us.segmentId}-${ur.regionId}`;
        if (!segmentRegionMap.has(key)) {
          segmentRegionMap.set(key, {
            ses: [],
            segment: us.segment,
            region: ur.region,
          });
        }
        if (segmentId && us.segmentId !== segmentId) continue;
        if (regionId && ur.regionId !== regionId) continue;
        segmentRegionMap.get(key)!.ses.push(se);
      }
    }
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const results: SegmentRegionCapacity[] = [];

  for (const [, { ses: segmentSes, segment, region }] of segmentRegionMap) {
    let totalCapacity = 0;
    for (const se of segmentSes) {
      const limits = se.capacityLimits;
      totalCapacity += limits?.maxMeetingsPerWeek ?? 25;
    }

    const currentBookings = await prisma.meeting.count({
      where: {
        seId: { in: segmentSes.map((s) => s.id) },
        segmentId: segment.id,
        regionId: region.id,
        status: 'scheduled',
        startTime: { gte: weekStart },
        endTime: { lt: weekEnd },
      },
    });

    const remainingCapacity = Math.max(0, totalCapacity - currentBookings);
    const utilizationPercent = totalCapacity > 0 ? (currentBookings / totalCapacity) * 100 : 0;

    results.push({
      segmentId: segment.id,
      segmentName: segment.name,
      regionId: region.id,
      regionName: region.name,
      totalCapacity,
      currentBookings,
      remainingCapacity,
      utilizationPercent,
      seCount: segmentSes.length,
    });
  }

  return results;
}

export async function forecastDemand(
  segmentId?: string,
  regionId?: string,
  forecastDays: number = 7
): Promise<ForecastResult[]> {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const meetings = await prisma.meeting.findMany({
    where: {
      status: 'scheduled',
      startTime: { gte: thirtyDaysAgo },
      ...(segmentId && { segmentId }),
      ...(regionId && { regionId }),
    },
    select: {
      startTime: true,
      segmentId: true,
      regionId: true,
      segment: true,
      region: true,
    },
  });

  const dailyCounts = new Map<string, number>();
  for (const m of meetings) {
    const key = `${m.segmentId}-${m.regionId}-${format(m.startTime, 'yyyy-MM-dd')}`;
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const segmentRegionKeys = new Set<string>();
  for (const m of meetings) {
    segmentRegionKeys.add(`${m.segmentId}-${m.regionId}`);
  }

  const capacities = await getSegmentRegionCapacity(segmentId, regionId);
  const capacityMap = new Map(
    capacities.map((c) => [`${c.segmentId}-${c.regionId}`, c])
  );

  const results: ForecastResult[] = [];
  const forecastDate = addDays(new Date(), forecastDays);

  for (const cap of capacities) {
    const key = `${cap.segmentId}-${cap.regionId}`;
    const recentKeys: string[] = [];
    for (let d = 0; d < 30; d++) {
      const dte = subDays(new Date(), d);
      recentKeys.push(`${cap.segmentId}-${cap.regionId}-${format(dte, 'yyyy-MM-dd')}`);
    }
    const recentCounts = recentKeys
      .map((k) => dailyCounts.get(k) ?? 0)
      .filter((n) => n > 0);
    const avgDaily = recentCounts.length > 0
      ? recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length
      : 0;
    const predictedDemand = Math.round(avgDaily * 5);

    const status =
      predictedDemand > cap.totalCapacity
        ? 'Capacity Risk'
        : predictedDemand > cap.totalCapacity * 0.9
        ? 'Warning'
        : 'Safe';

    let daysUntilRisk: number | undefined;
    if (status === 'Capacity Risk' && cap.remainingCapacity > 0) {
      const burnRate = avgDaily > 0 ? cap.remainingCapacity / avgDaily : 999;
      daysUntilRisk = Math.floor(burnRate);
    }

    results.push({
      segmentId: cap.segmentId,
      segmentName: cap.segmentName,
      regionId: cap.regionId,
      regionName: cap.regionName,
      forecastDate: format(forecastDate, 'yyyy-MM-dd'),
      predictedDemand,
      capacity: cap.totalCapacity,
      status,
      daysUntilRisk,
    });
  }

  return results;
}

export async function getCapacityAlerts(): Promise<
  { message: string; severity: 'warning' | 'critical'; segmentId: string; regionId: string }[]
> {
  const forecasts = await forecastDemand(undefined, undefined, 7);
  const alerts: { message: string; severity: 'warning' | 'critical'; segmentId: string; regionId: string }[] = [];

  for (const f of forecasts) {
    if (f.status === 'Capacity Risk' && f.segmentId && f.regionId) {
      alerts.push({
        message: `${f.segmentName} segment in ${f.regionName} will exceed SE capacity in ${f.daysUntilRisk ?? '?'} days.`,
        severity: 'critical',
        segmentId: f.segmentId,
        regionId: f.regionId,
      });
    } else if (f.status === 'Warning' && f.segmentId && f.regionId) {
      alerts.push({
        message: `${f.segmentName} segment in ${f.regionName} is approaching capacity.`,
        severity: 'warning',
        segmentId: f.segmentId,
        regionId: f.regionId,
      });
    }
  }

  return alerts;
}
