import { prisma } from './prisma';
import {
  getBusySlots,
  addBufferToBusySlots,
  mergeOverlappingSlots,
  checkSlotAvailability,
} from './calendar';
import { addMinutes, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { getCacheKey, getCachedSlots, setCachedSlots, invalidateAvailability } from './availability-cache';

const BUFFER_MINUTES = 10;
const MEETING_DURATIONS = [15, 30, 45, 60];

export interface SlotSearchParams {
  aeId: string;
  segmentId: string;
  regionId: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  date: string;
}

export async function findAvailableSlots(params: SlotSearchParams): Promise<AvailableSlot[]> {
  const { aeId, segmentId, regionId, startDate, endDate, durationMinutes } = params;

  if (!MEETING_DURATIONS.includes(durationMinutes)) {
    throw new Error(`Invalid duration. Must be one of: ${MEETING_DURATIONS.join(', ')}`);
  }

  const cacheKey = getCacheKey(
    aeId,
    segmentId,
    regionId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd'),
    durationMinutes
  );

  // Skip cache so we always use current calendar data (avoids stale "all slots")
  // const cached = getCachedSlots(cacheKey);
  // if (cached) return cached as AvailableSlot[];

  const [ae, segment, region] = await Promise.all([
    prisma.user.findUnique({
      where: { id: aeId },
      include: { userRegions: { where: { regionId } } },
    }),
    prisma.segment.findUnique({ where: { id: segmentId } }),
    prisma.region.findUnique({ where: { id: regionId } }),
  ]);

  if (!ae || !segment || !region) {
    throw new Error('Invalid AE, segment, or region');
  }

  const aeInRegion = ae.userRegions.some((ur) => ur.regionId === regionId);
  if (!aeInRegion) {
    throw new Error('AE is not assigned to this region');
  }

  const ses = await prisma.user.findMany({
    where: {
      role: 'SOLUTION_ENGINEER',
      enabled: true,
      refreshToken: { not: null },
      userSegments: { some: { segmentId } },
      userRegions: { some: { regionId } },
    },
    include: { capacityLimits: true },
  });

  if (ses.length === 0) {
    throw new Error(
      'No Solution Engineers with Google Calendar connected for this segment and region. Assign SEs to this segment/region and ask them to sign in with Google once.'
    );
  }

  const aeBusySlots = await getBusySlots(aeId, startDate, endDate);
  const aeBusyWithBuffer = addBufferToBusySlots(aeBusySlots);
  const aeMergedBusy = mergeOverlappingSlots(aeBusyWithBuffer);

  // Only SEs with calendar connected can be considered for availability
  const allSesBusy: { seId: string; slots: { start: Date; end: Date }[] | null }[] = [];
  for (const se of ses) {
    try {
      const seBusy = await getBusySlots(se.id, startDate, endDate);
      const seBusyWithBuffer = addBufferToBusySlots(seBusy);
      allSesBusy.push({
        seId: se.id,
        slots: mergeOverlappingSlots(seBusyWithBuffer),
      });
    } catch {
      // SE has no Google Calendar connected - do not count as available
      allSesBusy.push({ seId: se.id, slots: null });
    }
  }

  const sesWithCalendar = allSesBusy.filter((s) => s.slots !== null);
  if (sesWithCalendar.length === 0) {
    throw new Error(
      'No Solution Engineers with Google Calendar connected for this segment and region. Ask SEs to sign in with Google once to connect their calendar.'
    );
  }

  const existingMeetings = await prisma.meeting.findMany({
    where: {
      segmentId,
      regionId,
      status: 'scheduled',
      startTime: { gte: startDate },
      endTime: { lte: addMinutes(endDate, durationMinutes + BUFFER_MINUTES * 2) },
    },
  });

  const meetingBusySlots = existingMeetings.map((m) => ({
    start: addMinutes(m.startTime, -BUFFER_MINUTES),
    end: addMinutes(m.endTime, BUFFER_MINUTES),
  }));
  const meetingMerged = mergeOverlappingSlots(meetingBusySlots);

  const slots: AvailableSlot[] = [];
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  for (const day of days) {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    let current = new Date(Math.max(dayStart.getTime(), startDate.getTime()));

    while (addMinutes(current, durationMinutes + BUFFER_MINUTES * 2) <= dayEnd) {
      const slotEnd = addMinutes(current, durationMinutes);
      if (slotEnd > endDate) break;

      const slotStartBuffer = addMinutes(current, -BUFFER_MINUTES);
      const slotEndBuffer = addMinutes(slotEnd, BUFFER_MINUTES);

      const isAeBusy = aeMergedBusy.some(
        (b) => b.start < slotEndBuffer && b.end > slotStartBuffer
      );
      if (isAeBusy) {
        current = addMinutes(current, 15);
        continue;
      }

      const isMeetingConflict = meetingMerged.some(
        (b) => b.start < slotEndBuffer && b.end > slotStartBuffer
      );
      if (isMeetingConflict) {
        current = addMinutes(current, 15);
        continue;
      }

      let atLeastOneSeAvailable = false;
      for (let i = 0; i < allSesBusy.length; i++) {
        const seBusy = allSesBusy[i].slots;
        if (seBusy === null) continue; // SE calendar not connected - skip
        const hasConflict = seBusy.some(
          (b) => b.start < slotEndBuffer && b.end > slotStartBuffer
        );
        if (!hasConflict) {
          atLeastOneSeAvailable = true;
          break;
        }
      }

      if (atLeastOneSeAvailable) {
        slots.push({
          startTime: format(current, "HH:mm"),
          endTime: format(slotEnd, "HH:mm"),
          date: format(current, 'yyyy-MM-dd'),
        });
      }

      current = addMinutes(current, 15);
    }
  }

  setCachedSlots(cacheKey, slots);
  return slots;
}

export async function assignSE(
  segmentId: string,
  regionId: string,
  startTime: Date,
  endTime: Date
): Promise<string> {
  const ses = await prisma.user.findMany({
    where: {
      role: 'SOLUTION_ENGINEER',
      enabled: true,
      refreshToken: { not: null },
      userSegments: { some: { segmentId } },
      userRegions: { some: { regionId } },
    },
    include: { capacityLimits: true },
  });

  let weekStart = new Date(startTime);
  weekStart.setHours(0, 0, 0, 0);
  while (weekStart.getDay() !== 1) {
    weekStart.setDate(weekStart.getDate() - 1);
  }

  const meetingCounts = await prisma.meeting.groupBy({
    by: ['seId'],
    where: {
      seId: { in: ses.map((s) => s.id) },
      status: 'scheduled',
      startTime: { gte: weekStart },
      endTime: { lte: addMinutes(weekStart, 7 * 24 * 60) },
    },
    _count: true,
  });

  const countMap = new Map(meetingCounts.map((m) => [m.seId, m._count]));

  const availabilityChecks = await Promise.all(
    ses.map(async (se) => ({
      se,
      available: await checkSlotAvailability(se.id, startTime, endTime).catch(() => false),
    }))
  );

  const seCandidates = availabilityChecks
    .filter((c) => c.available)
    .map((c) => c.se);

  if (seCandidates.length === 0) {
    throw new Error(
      'No SE available for this time slot. Ensure SEs have signed in with Google (to connect Calendar), and are assigned to this segment and region.'
    );
  }

  seCandidates.sort((a, b) => {
    const countA = countMap.get(a.id) ?? 0;
    const countB = countMap.get(b.id) ?? 0;
    if (countA !== countB) return countA - countB;

    const limitsA = a.capacityLimits;
    const limitsB = b.capacityLimits;
    const maxA = limitsA?.maxMeetingsPerWeek ?? 25;
    const maxB = limitsB?.maxMeetingsPerWeek ?? 25;
    const utilA = countA / maxA;
    const utilB = countB / maxB;
    return utilA - utilB;
  });

  const roundRobin = await prisma.roundRobinState.findMany({
    where: { segmentId, regionId },
    orderBy: { orderIndex: 'asc' },
  });

  let selectedSe = seCandidates[0];
  if (roundRobin.length > 0) {
    const rrOrder = roundRobin.map((r) => r.userId);
    const firstInRotation = rrOrder.find((id) => seCandidates.some((s) => s.id === id));
    if (firstInRotation) {
      const idx = seCandidates.findIndex((s) => s.id === firstInRotation);
      if (idx >= 0) {
        const rotationStart = rrOrder.indexOf(seCandidates[0].id);
        const nextIdx = rotationStart >= 0 ? (rotationStart + 1) % rrOrder.length : 0;
        const nextId = rrOrder[nextIdx];
        const nextSe = seCandidates.find((s) => s.id === nextId);
        if (nextSe) selectedSe = nextSe;
      }
    }
  }

  return selectedSe.id;
}

export async function scheduleMeeting(params: {
  aeId: string;
  customerEmail: string;
  segmentId: string;
  regionId: string;
  durationMinutes: number;
  startTime: Date;
  date: string;
}): Promise<{ meetingId: string; seId: string }> {
  const { aeId, customerEmail, segmentId, regionId, durationMinutes, date } = params;
  const [datePart, timePart] = date.includes('T') ? date.split('T') : [date, '09:00'];
  const startTime = new Date(`${datePart}T${timePart}:00.000Z`);
  const endTime = addMinutes(startTime, durationMinutes);

  const seId = await assignSE(segmentId, regionId, startTime, endTime);

  const aeAvailable = await checkSlotAvailability(aeId, startTime, endTime);
  if (!aeAvailable) {
    throw new Error('AE is no longer available for this slot');
  }

  const seAvailable = await checkSlotAvailability(seId, startTime, endTime);
  if (!seAvailable) {
    throw new Error('SE is no longer available for this slot');
  }

  const meeting = await prisma.meeting.create({
    data: {
      aeId,
      seId,
      customerEmail,
      segmentId,
      regionId,
      durationMinutes,
      startTime,
      endTime,
      status: 'scheduled',
    },
    include: {
      ae: true,
      se: true,
    },
  });

  invalidateAvailability(aeId, segmentId, regionId);

  return { meetingId: meeting.id, seId };
}
