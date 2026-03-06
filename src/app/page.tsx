import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Role } from '@prisma/client';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-[var(--muted)] mb-8">Welcome back. Pick an action below.</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {session.user.role === Role.ACCOUNT_EXECUTIVE && (
            <>
              <a href="/schedule" className="card-lively block border-l-4 border-l-[var(--accent)]">
                <h2 className="font-semibold text-lg mb-2">Schedule Meeting</h2>
                <p className="text-sm text-[var(--muted)]">
                  Book a demo with a customer and Solution Engineer
                </p>
              </a>
              <a href="/meetings" className="card-lively block border-l-4 border-l-[var(--success)]">
                <h2 className="font-semibold text-lg mb-2">My Meetings</h2>
                <p className="text-sm text-[var(--muted)]">
                  View your scheduled meetings
                </p>
              </a>
            </>
          )}
          {session.user.role === Role.SOLUTION_ENGINEER && (
            <>
              <a href="/meetings" className="card-lively block border-l-4 border-l-[var(--accent)]">
                <h2 className="font-semibold text-lg mb-2">My Meetings</h2>
                <p className="text-sm text-[var(--muted)]">
                  View your assigned demos
                </p>
              </a>
              <a href="/capacity" className="card-lively block border-l-4 border-l-[var(--success)]">
                <h2 className="font-semibold text-lg mb-2">Workload</h2>
                <p className="text-sm text-[var(--muted)]">
                  See your capacity and utilization
                </p>
              </a>
            </>
          )}
          {session.user.role === Role.ADMIN && (
            <>
              <a href="/admin" className="card-lively block border-l-4 border-l-[var(--accent)]">
                <h2 className="font-semibold text-lg mb-2">Admin Panel</h2>
                <p className="text-sm text-[var(--muted)]">
                  Manage users, roles, segments, and regions
                </p>
              </a>
              <a href="/reports" className="card-lively block border-l-4 border-l-[var(--gradient-end)]">
                <h2 className="font-semibold text-lg mb-2">Reports</h2>
                <p className="text-sm text-[var(--muted)]">
                  Analytics and meeting distribution
                </p>
              </a>
              <a href="/capacity" className="card-lively block border-l-4 border-l-[var(--success)]">
                <h2 className="font-semibold text-lg mb-2">Capacity Forecast</h2>
                <p className="text-sm text-[var(--muted)]">
                  SE capacity and demand forecasting
                </p>
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
