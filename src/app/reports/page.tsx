'use client';

import { useState, useMemo } from 'react';
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
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import type { Role } from '@prisma/client';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

type PeriodType = 'daterange' | 'week' | 'month';

const defaultWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const now = new Date();
const defaultMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const emptyFilters = {
  periodType: 'week' as PeriodType,
  startDate: '',
  endDate: '',
  weekStart: defaultWeekStart,
  month: defaultMonthVal,
  seId: '',
  aeId: '',
  regionId: '',
  segmentId: '',
};

function buildWeeks(): { value: string; label: string }[] {
  const weeks: { value: string; label: string }[] = [];
  let d = new Date();
  for (let i = 0; i < 26; i++) {
    const mon = startOfWeek(d, { weekStartsOn: 1 });
    const sun = endOfWeek(d, { weekStartsOn: 1 });
    weeks.push({
      value: format(mon, 'yyyy-MM-dd'),
      label: `${format(mon, 'dd MMM')} – ${format(sun, 'dd MMM yyyy')}`,
    });
    d.setDate(d.getDate() - 7);
  }
  return weeks;
}

function buildMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  let d = new Date();
  for (let i = 0; i < 24; i++) {
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: format(d, 'MMMM yyyy'),
    });
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

const WEEKS = buildWeeks();
const MONTHS = buildMonths();

export default function ReportsPage() {
  const { status } = useSession();
  const [filters, setFilters] = useState(emptyFilters);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('periodType', filters.periodType);
    if (filters.periodType === 'daterange' && filters.startDate && filters.endDate) {
      p.set('startDate', filters.startDate);
      p.set('endDate', filters.endDate);
    } else if (filters.periodType === 'week') {
      p.set('weekStart', filters.weekStart);
    } else if (filters.periodType === 'month') {
      const [y, m] = (filters.month || defaultMonthVal).split('-');
      p.set('month', m);
      p.set('year', y);
    }
    if (filters.seId) p.set('seId', filters.seId);
    if (filters.aeId) p.set('aeId', filters.aeId);
    if (filters.regionId) p.set('regionId', filters.regionId);
    if (filters.segmentId) p.set('segmentId', filters.segmentId);
    return p.toString();
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', queryParams],
    queryFn: () => fetch(`/api/reports?${queryParams}`).then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: segmentsData } = useQuery({
    queryKey: ['segments'],
    queryFn: () => fetch('/api/segments').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => fetch('/api/regions').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const ses = useMemo(() => (usersData?.users ?? []).filter((u: { role: Role }) => u.role === 'SOLUTION_ENGINEER'), [usersData]);
  const aes = useMemo(() => (usersData?.users ?? []).filter((u: { role: Role }) => u.role === 'ACCOUNT_EXECUTIVE'), [usersData]);
  const segments = segmentsData?.segments ?? [];
  const regions = regionsData?.regions ?? [];

  const updateFilter = (key: keyof typeof filters, value: string | PeriodType) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ ...emptyFilters });
  };

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

        {/* Filters */}
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Filters</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Period type */}
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Period type</label>
              <select
                className="input w-full"
                value={filters.periodType}
                onChange={(e) => updateFilter('periodType', e.target.value as PeriodType)}
              >
                <option value="daterange">Date range</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>

            {filters.periodType === 'daterange' && (
              <>
                <div>
                  <label className="block text-sm text-[var(--muted)] mb-1">Start date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={filters.startDate}
                    onChange={(e) => updateFilter('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--muted)] mb-1">End date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={filters.endDate}
                    onChange={(e) => updateFilter('endDate', e.target.value)}
                  />
                </div>
              </>
            )}

            {filters.periodType === 'week' && (
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Week</label>
                <select
                  className="input w-full"
                  value={filters.weekStart}
                  onChange={(e) => updateFilter('weekStart', e.target.value)}
                >
                  {WEEKS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filters.periodType === 'month' && (
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Month</label>
                <select
                  className="input w-full"
                  value={filters.month || defaultMonthVal}
                  onChange={(e) => updateFilter('month', e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Filter by SE</label>
              <select
                className="input w-full"
                value={filters.seId}
                onChange={(e) => updateFilter('seId', e.target.value)}
              >
                <option value="">All SEs</option>
                {ses.map((u: { id: string; name: string | null; email: string }) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Filter by AE</label>
              <select
                className="input w-full"
                value={filters.aeId}
                onChange={(e) => updateFilter('aeId', e.target.value)}
              >
                <option value="">All AEs</option>
                {aes.map((u: { id: string; name: string | null; email: string }) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Filter by Market</label>
              <select
                className="input w-full"
                value={filters.regionId}
                onChange={(e) => updateFilter('regionId', e.target.value)}
              >
                <option value="">All Markets</option>
                {regions.map((r: { id: string; name: string }) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Filter by Segment</label>
              <select
                className="input w-full"
                value={filters.segmentId}
                onChange={(e) => updateFilter('segmentId', e.target.value)}
              >
                <option value="">All Segments</option>
                {segments.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Reset filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-[var(--muted)]">Loading reports...</div>
        ) : (
          <div className="space-y-8">
            <div className="card">
              <h2 className="font-semibold mb-4">
                Total Meetings: {data?.totalMeetings ?? 0}
                {data?.periodStart && data?.periodEnd && (
                  <span className="text-sm font-normal text-[var(--muted)] ml-2">
                    ({format(parseISO(data.periodStart), 'dd MMM yyyy')} – {format(parseISO(data.periodEnd), 'dd MMM yyyy')})
                  </span>
                )}
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
