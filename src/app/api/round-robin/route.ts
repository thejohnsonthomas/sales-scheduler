import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const segmentId = searchParams.get('segmentId');
  const regionId = searchParams.get('regionId');

  if (!segmentId || !regionId) {
    return NextResponse.json({ error: 'segmentId and regionId required' }, { status: 400 });
  }

  const state = await prisma.roundRobinState.findMany({
    where: { segmentId, regionId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { orderIndex: 'asc' },
  });

  return NextResponse.json({ roundRobin: state });
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { segmentId, regionId, userIds } = body;

  if (!segmentId || !regionId || !Array.isArray(userIds)) {
    return NextResponse.json({ error: 'segmentId, regionId, userIds (array) required' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.roundRobinState.deleteMany({ where: { segmentId, regionId } });
    await tx.roundRobinState.createMany({
      data: userIds.map((userId: string, idx: number) => ({
        segmentId,
        regionId,
        userId,
        orderIndex: idx,
      })),
    });
  });

  return NextResponse.json({ success: true });
}
