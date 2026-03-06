import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const regions = await prisma.region.findMany({
    include: {
      _count: { select: { userRegions: true, meetings: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ regions });
}
