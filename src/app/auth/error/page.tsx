'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="card max-w-md w-full mx-4 text-center">
        <h1 className="text-2xl font-bold mb-2 text-[var(--danger)]">Authentication Error</h1>
        <p className="text-[var(--muted)] mb-6">
          {error === 'AccessDenied'
            ? 'Your account has been disabled. Please contact an administrator.'
            : 'An error occurred during sign in. Please try again.'}
        </p>
        <Link href="/auth/signin" className="btn-primary inline-block">
          Try Again
        </Link>
      </div>
    </div>
  );
}
