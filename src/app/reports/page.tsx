'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/Nav';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { status } = useSession();
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', view],
    queryFn: () => fetch(`/api/reports?view=${view}`).then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  const bySE = data?.bySE ?? [];
  const bySegment = data?.bySegment ?? [];
  const byRegion = data?.byRegion ?? [];
  const seChartData = bySE.map((r: { se: { name: string | null; email: string }; count: number }) => ({
    name: r.se?.name ?? r.se?.email ?? 'Unknown',
    count: r.count,
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('weekly')}
            className={`btn ${view === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`btn ${view === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Monthly
          </button>
        </div>

        {isLoading ? (
          <div className="text-[var(--muted)]">Loading reports...</div>
        ) : (
          <div className="space-y-8">
            <div className="card">
              <h2 className="font-semibold mb-4">
                Total Meetings: {data?.totalMeetings ?? 0}
              </h2>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">Meetings per SE</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                    <XAxis dataKey="name" tick={{ fill: '#a1a1aa' }} />
                    <YAxis tick={{ fill: '#a1a1aa' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181c',
                        border: '1px solid #2a2a2e',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#f4f4f5' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Meetings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2">SE</th>
                      <th className="text-left py-2">Meetings</th>
                      <th className="text-left py-2">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySE.map((r: { se: { name: string | null; email: string }; count: number; distribution: string }) => (
                      <tr key={r.se?.email} className="border-b border-[var(--border)]">
                        <td className="py-2">{r.se?.name ?? r.se?.email}</td>
                        <td className="py-2">{r.count}</td>
                        <td className="py-2">{r.distribution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-semibold mb-4">By Segment</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bySegment.map((s: { segment: { name: string }; count: number }) => ({
                          name: s.segment?.name,
                          count: s.count,
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name }) => name}
                      >
                        {bySegment.map((_: unknown, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181c',
                          border: '1px solid #2a2a2e',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <h2 className="font-semibold mb-4">By Region</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byRegion.map((r: { region: { name: string }; count: number }) => ({
                          name: r.region?.name,
                          count: r.count,
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name }) => name}
                      >
                        {byRegion.map((_: unknown, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181c',
                          border: '1px solid #2a2a2e',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
