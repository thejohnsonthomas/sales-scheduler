import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth-utils';
import {
  getSECapacity,
  getSegmentRegionCapacity,
  forecastDemand,
  getCapacityAlerts,
} from '@/lib/capacity-forecast';

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'se';
  const seId = searchParams.get('seId');
  const segmentId = searchParams.get('segmentId') ?? undefined;
  const regionId = searchParams.get('regionId') ?? undefined;

  if (type === 'se') {
    const id = seId ?? session.user.id;
    if (session.user.role !== 'ADMIN' && id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const capacity = await getSECapacity(id);
    if (!capacity) return NextResponse.json({ error: 'SE not found' }, { status: 404 });
    return NextResponse.json({ capacity });
  }

  if (type === 'segment-region') {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const capacities = await getSegmentRegionCapacity(segmentId, regionId);
    return NextResponse.json({ capacities });
  }

  if (type === 'forecast') {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const forecast = await forecastDemand(segmentId, regionId, 7);
    return NextResponse.json({ forecast });
  }

  if (type === 'alerts') {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const alerts = await getCapacityAlerts();
    return NextResponse.json({ alerts });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
