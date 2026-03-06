'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const DURATIONS = [15, 30, 45, 60];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (US)' },
  { value: 'America/Chicago', label: 'Central (US)' },
  { value: 'America/Denver', label: 'Mountain (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

function formatSlotInTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string
): { dateLabel: string; timeLabel: string } {
  const utcDate = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const zoned = toZonedTime(utcDate, timezone);
  return {
    dateLabel: format(zoned, 'dd MMM yy'),
    timeLabel: format(zoned, 'h:mm a'),
  };
}

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [customerEmail, setCustomerEmail] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string } | null>(null);
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; date: string }[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null);

  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: () => fetch('/api/segments').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => fetch('/api/regions').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/me').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const searchSlots = async () => {
    if (!me?.id || !segmentId || !regionId || !startDate || !endDate) return;
    setSlotsError(null);
    const res = await fetch(
      `/api/availability?aeId=${me.id}&segmentId=${segmentId}&regionId=${regionId}&startDate=${startDate}&endDate=${endDate}&duration=${duration}`
    );
    const data = await res.json();
    if (!res.ok) {
      setSlots([]);
      setSlotsError(data.error ?? 'Failed to load slots');
      return;
    }
    if (data.slots) {
      setSlots(data.slots);
      setSlotsError(null);
    } else {
      setSlots([]);
    }
  };

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const date = selectedSlot ? `${selectedSlot.date}T${selectedSlot.startTime}` : '';
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail,
          segmentId,
          regionId,
          durationMinutes: duration,
          date,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to schedule');
      }
      return res.json();
    },
    onSuccess: (data: { calendarCreated?: boolean; calendarError?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedSlot(null);
      setCustomerEmail('');
      searchSlots();
      if (data?.calendarCreated === false && data?.calendarError) {
        setCalendarWarning(
          `Meeting saved but could not add to Google Calendar: ${data.calendarError}. Please add it to your calendar manually.`
        );
        setTimeout(() => setCalendarWarning(null), 12000);
      } else {
        setCalendarWarning(null);
      }
    },
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setEndDate(nextWeek.toISOString().slice(0, 10));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const aeRegions = me?.regions ?? [];
  const canSchedule = aeRegions.some((r: { id: string }) => r.id === regionId);
  const hasNoRegions = aeRegions.length === 0;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
          Schedule Meeting
        </h1>
        <p className="text-[var(--muted)] mb-8">Book a demo on the SE&apos;s calendar; you and the customer are added as participants.</p>

        <div className="card-lively mb-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="input"
              placeholder="customer@company.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Segment</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="input"
              >
                <option value="">Select segment</option>
                {(segments?.segments ?? []).map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="input"
              >
                <option value="">Select region</option>
                {(regions?.regions ?? []).map((r: { id: string; name: string }) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input max-w-xs"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="input"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          {hasNoRegions && (
            <p className="text-sm text-[var(--warning)]">
              You have no regions assigned. Contact an admin to get access.
            </p>
          )}
          <button
            onClick={searchSlots}
            disabled={!segmentId || !regionId || !startDate || !endDate || !canSchedule}
            className="btn-primary w-full sm:w-auto"
          >
            Find Available Slots
          </button>
        </div>

        {slotsError && (
          <div className="card mb-8 border-[var(--warning)] bg-[var(--warning-soft)]">
            <p className="text-sm text-[var(--warning)]">{slotsError}</p>
          </div>
        )}
        {calendarWarning && (
          <div className="card mb-8 border-[var(--warning)] bg-[var(--warning-soft)]">
            <p className="text-sm text-[var(--warning)]">{calendarWarning}</p>
          </div>
        )}
        {slots.length > 0 && (
          <div className="card-lively mb-8 border-l-4 border-l-[var(--accent)]">
            <h2 className="font-semibold text-lg mb-1">Available Slots</h2>
            <p className="text-sm text-[var(--muted)] mb-5">
              Date: DD Mon YY · Time: 12hr · Timezone: {TIMEZONES.find((t) => t.value === timezone)?.label ?? timezone}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
              {slots.map((slot) => {
                const { dateLabel, timeLabel } = formatSlotInTimezone(slot.date, slot.startTime, timezone);
                const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={`${slot.date}-${slot.startTime}`}
                    onClick={() => setSelectedSlot({ date: slot.date, startTime: slot.startTime })}
                    className={`p-3 rounded-xl text-sm border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/50 shadow-lg shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--card-hover)]'
                    }`}
                  >
                    <span className="block font-semibold text-[var(--text)]">{dateLabel}</span>
                    <span className="block text-[var(--muted)] mt-0.5">{timeLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedSlot && (() => {
          const { dateLabel, timeLabel } = formatSlotInTimezone(selectedSlot.date, selectedSlot.startTime, timezone);
          return (
          <div className="card-lively border-[var(--success)]/30 bg-[var(--success-soft)]/30">
            <p className="mb-1 font-medium">Selected slot</p>
            <p className="text-[var(--muted)] mb-5">
              {dateLabel} at {timeLabel}
            </p>
            <button
              onClick={() => scheduleMutation.mutate()}
              disabled={!customerEmail || scheduleMutation.isPending}
              className="btn-primary"
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm & Schedule'}
            </button>
            {scheduleMutation.isError && (
              <p className="mt-3 text-[var(--danger)] text-sm">
                {(scheduleMutation.error as Error).message}
              </p>
            )}
          </div>
          );
        })()}
      </main>
    </div>
  );
}
