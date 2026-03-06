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
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {session.user.role === Role.ACCOUNT_EXECUTIVE && (
            <>
              <a href="/schedule" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">Schedule Meeting</h2>
                <p className="text-sm text-[var(--muted)]">
                  Book a demo with a customer and Solution Engineer
                </p>
              </a>
              <a href="/meetings" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">My Meetings</h2>
                <p className="text-sm text-[var(--muted)]">
                  View your scheduled meetings
                </p>
              </a>
            </>
          )}
          {session.user.role === Role.SOLUTION_ENGINEER && (
            <>
              <a href="/meetings" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">My Meetings</h2>
                <p className="text-sm text-[var(--muted)]">
                  View your assigned demos
                </p>
              </a>
              <a href="/capacity" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">Workload</h2>
                <p className="text-sm text-[var(--muted)]">
                  See your capacity and utilization
                </p>
              </a>
            </>
          )}
          {session.user.role === Role.ADMIN && (
            <>
              <a href="/admin" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">Admin Panel</h2>
                <p className="text-sm text-[var(--muted)]">
                  Manage users, roles, segments, and regions
                </p>
              </a>
              <a href="/reports" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">Reports</h2>
                <p className="text-sm text-[var(--muted)]">
                  Analytics and meeting distribution
                </p>
              </a>
              <a href="/capacity" className="card block hover:border-[var(--accent)] transition-colors">
                <h2 className="font-semibold mb-2">Capacity Forecast</h2>
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
