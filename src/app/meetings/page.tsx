'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/Nav';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => fetch('/api/meetings').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const addToCalendarMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/calendar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add to calendar');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setCalendarError(null);
    },
    onError: (err: Error) => setCalendarError(err.message),
  });

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  const meetings = data?.meetings ?? [];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
          My Meetings
        </h1>
        <p className="text-[var(--muted)] mb-8">Meetings live on the SE&apos;s calendar with you and the customer as participants.</p>

        {isLoading ? (
          <div className="card-lively text-center py-12">
            <p className="text-[var(--muted)]">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="card-lively text-center py-12">
            <p className="text-[var(--muted)]">No meetings scheduled.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {calendarError && (
              <div className="card border-[var(--warning)] bg-[var(--warning-soft)]">
                <p className="text-sm text-[var(--warning)]">{calendarError}</p>
              </div>
            )}
            {meetings.map((m: {
              id: string;
              startTime: string;
              endTime: string;
              customerEmail: string;
              durationMinutes: number;
              segment: { name: string };
              region: { name: string };
              ae?: { name: string | null; email: string };
              se?: { name: string | null; email: string };
              status?: string;
              googleEventId?: string | null;
            }) => (
              <div key={m.id} className="card-lively flex justify-between items-start gap-6 border-l-4 border-l-[var(--accent)]">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg">
                    {format(new Date(m.startTime), 'EEE, MMM d, yyyy')} at{' '}
                    {format(new Date(m.startTime), 'h:mm a')} – {format(new Date(m.endTime), 'h:mm a')}
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-2">
                    Customer: {m.customerEmail} · {m.durationMinutes} min
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {m.segment?.name} · {m.region?.name}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {m.se && (
                      <span className="text-sm text-[var(--accent)]">
                        SE: {m.se.name ?? m.se.email}
                      </span>
                    )}
                    {m.ae && (
                      <span className="text-sm text-[var(--muted)]">
                        AE: {m.ae.name ?? m.ae.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  {!m.googleEventId && (
                    <button
                      type="button"
                      onClick={() => addToCalendarMutation.mutate(m.id)}
                      disabled={addToCalendarMutation.isPending}
                      className="text-sm btn-secondary py-2"
                    >
                      {addToCalendarMutation.isPending ? 'Adding…' : 'Add to calendar'}
                    </button>
                  )}
                  <span className="badge-success">
                    {m.status ?? 'scheduled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
