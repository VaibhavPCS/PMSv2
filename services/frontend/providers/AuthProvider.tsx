'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMe } from '@/hooks/useAuth';
import type { User } from '@shared/types';
import { ROUTES } from '@shared/constants';

const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.HOME];

interface AuthContextValue {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useMe();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (isLoading) return;
    if (isError && !isPublicRoute) {
      router.replace(ROUTES.LOGIN);
    }
    if (user && isPublicRoute && pathname !== ROUTES.HOME) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isLoading, isError, user, isPublicRoute, pathname, router]);
  
  useEffect(() => {
    const onForceLogout = () => router.replace(ROUTES.LOGIN);
    window.addEventListener('force-logout', onForceLogout);
    return () => window.removeEventListener('force-logout', onForceLogout);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}