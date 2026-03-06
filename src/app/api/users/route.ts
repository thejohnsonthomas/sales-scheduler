import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: {
      userSegments: { include: { segment: true } },
      userRegions: { include: { region: true } },
      capacityLimits: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'SOLUTION_ENGINEER', 'ACCOUNT_EXECUTIVE']).optional(),
  enabled: z.boolean().optional(),
  segmentIds: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
  maxMeetingsPerDay: z.number().min(1).max(20).optional(),
  maxMeetingsPerWeek: z.number().min(1).max(50).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { userId, ...data } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { role, enabled, segmentIds, regionIds, maxMeetingsPerDay, maxMeetingsPerWeek } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (enabled !== undefined) updateData.enabled = enabled;

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    if (segmentIds !== undefined) {
      await tx.userSegment.deleteMany({ where: { userId } });
      if (segmentIds.length > 0) {
        await tx.userSegment.createMany({
          data: segmentIds.map((segmentId) => ({ userId, segmentId })),
        });
      }
    }

    if (regionIds !== undefined) {
      await tx.userRegion.deleteMany({ where: { userId } });
      if (regionIds.length > 0) {
        await tx.userRegion.createMany({
          data: regionIds.map((regionId) => ({ userId, regionId })),
        });
      }
    }

    if (maxMeetingsPerDay !== undefined || maxMeetingsPerWeek !== undefined) {
      const limits = await tx.capacityLimit.findUnique({
        where: { userId },
      });
      const capData: Record<string, number> = {};
      if (maxMeetingsPerDay !== undefined) capData.maxMeetingsPerDay = maxMeetingsPerDay;
      if (maxMeetingsPerWeek !== undefined) capData.maxMeetingsPerWeek = maxMeetingsPerWeek;

      if (limits) {
        await tx.capacityLimit.update({
          where: { userId },
          data: capData,
        });
      } else {
        await tx.capacityLimit.create({
          data: {
            userId,
            maxMeetingsPerDay: maxMeetingsPerDay ?? 6,
            maxMeetingsPerWeek: maxMeetingsPerWeek ?? 25,
          },
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
