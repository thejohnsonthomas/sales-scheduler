'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/Nav';
import { useQuery } from '@tanstack/react-query';
export default function CapacityPage() {
  const { data: session, status } = useSession();
  const [type, setType] = useState<'se' | 'segment-region'>('se');

  const { data: capacityData } = useQuery({
    queryKey: ['capacity', type, session?.user?.id],
    queryFn: () =>
      fetch(`/api/capacity?type=${type}${type === 'se' ? `&seId=${session?.user?.id}` : ''}`).then(
        (r) => r.json()
      ),
    enabled: status === 'authenticated' && !!session?.user?.id,
  });

  const { data: forecastData } = useQuery({
    queryKey: ['capacity-forecast'],
    queryFn: () => fetch('/api/capacity?type=forecast').then((r) => r.json()),
    enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
  });

  const { data: alertsData } = useQuery({
    queryKey: ['capacity-alerts'],
    queryFn: () => fetch('/api/capacity?type=alerts').then((r) => r.json()),
    enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
  });

  const capacity = capacityData?.capacity;
  const capacities = capacityData?.capacities ?? [];
  const forecast = forecastData?.forecast ?? [];
  const alerts = alertsData?.alerts ?? [];

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === 'ADMIN';
  const isSE = session?.user?.role === 'SOLUTION_ENGINEER';

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Capacity Dashboard</h1>

        {isAdmin && alerts.length > 0 && (
          <div className="card mb-6 border-[var(--warning)]">
            <h2 className="font-semibold mb-4 text-[var(--warning)]">Capacity Alerts</h2>
            <ul className="space-y-2">
              {alerts.map((a: { message: string; severity: string }) => (
                <li
                  key={a.message}
                  className={`text-sm ${
                    a.severity === 'critical' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
                  }`}
                >
                  {a.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isSE && capacity && (
          <div className="card mb-6">
            <h2 className="font-semibold mb-4">My Workload</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)]">Max/Day</p>
                <p className="text-xl font-semibold">{capacity.maxPerDay}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Max/Week</p>
                <p className="text-xl font-semibold">{capacity.maxMeetingsPerWeek}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Booked This Week</p>
                <p className="text-xl font-semibold">{capacity.bookedThisWeek}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Remaining</p>
                <p className="text-xl font-semibold text-[var(--success)]">
                  {capacity.remainingThisWeek}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[var(--muted)] mb-2">Utilization</p>
              <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{ width: `${Math.min(100, capacity.utilizationPercent)}%` }}
                />
              </div>
              <p className="text-sm mt-1">{capacity.utilizationPercent.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setType('se')}
                className={`btn ${type === 'se' ? 'btn-primary' : 'btn-secondary'}`}
              >
                SE View
              </button>
              <button
                onClick={() => setType('segment-region')}
                className={`btn ${type === 'segment-region' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Segment/Region View
              </button>
            </div>

            {type === 'segment-region' && (
              <div className="card mb-6">
                <h2 className="font-semibold mb-4">Segment & Region Capacity</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2">Segment</th>
                        <th className="text-left py-2">Region</th>
                        <th className="text-left py-2">Capacity</th>
                        <th className="text-left py-2">Booked</th>
                        <th className="text-left py-2">Remaining</th>
                        <th className="text-left py-2">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacities.map(
                        (c: {
                          segmentName: string;
                          regionName: string;
                          totalCapacity: number;
                          currentBookings: number;
                          remainingCapacity: number;
                          utilizationPercent: number;
                        }) => (
                          <tr key={`${c.segmentName}-${c.regionName}`} className="border-b border-[var(--border)]">
                            <td className="py-2">{c.segmentName}</td>
                            <td className="py-2">{c.regionName}</td>
                            <td className="py-2">{c.totalCapacity}</td>
                            <td className="py-2">{c.currentBookings}</td>
                            <td className="py-2">{c.remainingCapacity}</td>
                            <td className="py-2">{c.utilizationPercent.toFixed(1)}%</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {forecast.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4">Capacity Forecast</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2">Segment</th>
                        <th className="text-left py-2">Region</th>
                        <th className="text-left py-2">Predicted Demand</th>
                        <th className="text-left py-2">Capacity</th>
                        <th className="text-left py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map(
                        (f: {
                          segmentName: string;
                          regionName: string;
                          predictedDemand: number;
                          capacity: number;
                          status: string;
                        }) => (
                          <tr key={`${f.segmentName}-${f.regionName}`} className="border-b border-[var(--border)]">
                            <td className="py-2">{f.segmentName}</td>
                            <td className="py-2">{f.regionName}</td>
                            <td className="py-2">{f.predictedDemand}</td>
                            <td className="py-2">{f.capacity}</td>
                            <td
                              className={`py-2 ${
                                f.status === 'Capacity Risk'
                                  ? 'text-[var(--danger)]'
                                  : f.status === 'Warning'
                                  ? 'text-[var(--warning)]'
                                  : 'text-[var(--success)]'
                              }`}
                            >
                              {f.status}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
