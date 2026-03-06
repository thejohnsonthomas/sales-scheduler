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
    <nav className="relative z-10 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-bold text-lg bg-gradient-to-r from-[var(--accent)] to-[var(--gradient-end)] bg-clip-text text-transparent"
            >
              Sales Scheduler
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)] max-w-[140px] truncate">
              {session.user.name ?? session.user.email}
            </span>
            <span className="badge bg-[var(--accent-soft)] text-[var(--accent)]">
              {session.user.role.replace('_', ' ')}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
