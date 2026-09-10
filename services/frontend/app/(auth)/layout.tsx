'use client';

import { useAuth } from '@/hooks/use-auth';

/**
 * Auth route-group layout.
 *
 * Ported from the old <AuthLayout /> (app/routes/auth/auth-layout.tsx):
 * - Shows a centered loading state while auth is resolving.
 * - Redirects already-authenticated users to /dashboard.
 * - Otherwise renders the page (each auth page owns its own AuthPanelLayout,
 *   so this layout is a transparent pass-through for the markup).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state with proper styling
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
}
