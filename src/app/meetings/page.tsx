'use client';

import { useSession } from 'next-auth/react';
import { Nav } from '@/components/Nav';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function MeetingsPage() {
  const { data: session, status } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => fetch('/api/meetings').then((r) => r.json()),
    enabled: status === 'authenticated',
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
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Meetings</h1>

        {isLoading ? (
          <div className="text-[var(--muted)]">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="card">
            <p className="text-[var(--muted)]">No meetings scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
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
            }) => (
              <div key={m.id} className="card flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {format(new Date(m.startTime), 'EEE, MMM d, yyyy')} at{' '}
                    {format(new Date(m.startTime), 'h:mm a')} -{' '}
                    {format(new Date(m.endTime), 'h:mm a')}
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    Customer: {m.customerEmail} • {m.durationMinutes} min
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {m.segment?.name} • {m.region?.name}
                  </p>
                  {m.se && (
                    <p className="text-sm mt-2">
                      SE: {m.se.name ?? m.se.email}
                    </p>
                  )}
                  {m.ae && (
                    <p className="text-sm">
                      AE: {m.ae.name ?? m.ae.email}
                    </p>
                  )}
                </div>
                <span className="px-2 py-1 rounded text-xs bg-[var(--success)]/20 text-[var(--success)]">
                  {m.status ?? 'scheduled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
