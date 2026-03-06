import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      enabled: true,
      role: { in: [Role.ACCOUNT_EXECUTIVE, Role.SOLUTION_ENGINEER] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userRegions: { include: { region: true } },
      userSegments: { include: { segment: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ users });
}
