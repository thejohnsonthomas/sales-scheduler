'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Role } from '@prisma/client';

export function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== 'authenticated' || !session) return null;

  const isAdmin = session.user.role === Role.ADMIN;
  const isAE = session.user.role === Role.ACCOUNT_EXECUTIVE;
  const isSE = session.user.role === Role.SOLUTION_ENGINEER;

  const navItems = [
    ...(isAE || isAdmin ? [{ href: '/schedule', label: 'Schedule Meeting' }] : []),
    ...(isSE || isAE || isAdmin ? [{ href: '/meetings', label: 'My Meetings' }] : []),
    ...(isSE || isAdmin ? [{ href: '/capacity', label: 'Capacity' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ...(isAdmin ? [{ href: '/reports', label: 'Reports' }] : []),
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-semibold text-lg">
              Sales Scheduler
            </Link>
            <div className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)]">
              {session.user.name ?? session.user.email}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-[var(--border)]">
              {session.user.role.replace('_', ' ')}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
