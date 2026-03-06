import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userSegments: { include: { segment: true } },
      userRegions: { include: { region: true } },
      capacityLimits: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    enabled: user.enabled,
    segments: user.userSegments.map((us) => us.segment),
    regions: user.userRegions.map((ur) => ur.region),
    capacityLimits: user.capacityLimits,
  });
}
