'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { initSuperTokens } from '@/lib/supertokens';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { BadgeProvider } from './BadgeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSuperTokens();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <BadgeProvider>{children}</BadgeProvider>
        <Toaster position="top-right" theme="light" />
      </AuthProvider>
    </QueryProvider>
  );
}
