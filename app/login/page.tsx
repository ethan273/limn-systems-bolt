'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new auth system
    router.replace('/auth');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-xl font-semibold text-slate-900 mb-2">Redirecting...</div>
        <div className="text-slate-600">Taking you to the login page</div>
      </div>
    </div>
  );
}