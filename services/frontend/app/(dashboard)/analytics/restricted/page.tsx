'use client';

// Route: /analytics/restricted — Team Report screen, gated to workspace
// leads/owners and admins. Gate logic ported from OLD app/routes/analytics/
// analytics.tsx (hasRestrictedAccess = isWorkspaceLead || isWorkspaceOwner;
// admins also allowed). Non-eligible users are redirected to /analytics/personal.

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { TeamReport } from '@/components/analytics/TeamReport';

export default function RestrictedAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Determine workspace role for restricted access (mirrors OLD analytics.tsx)
  const hasRestrictedAccess = useMemo(() => {
    const currentWorkspaceId =
      typeof user?.currentWorkspace === 'string'
        ? user.currentWorkspace
        : (user?.currentWorkspace as any)?._id;

    const workspaceRole =
      (user?.workspaces as any[] | undefined)?.find(
        (w: any) =>
          w?.workspaceId?._id === currentWorkspaceId || w?.workspaceId === currentWorkspaceId
      )?.role || 'member';

    return workspaceRole === 'lead' || workspaceRole === 'owner';
  }, [user]);

  const allowed = isAdmin || hasRestrictedAccess;

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) {
      router.replace('/analytics/personal');
    }
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return <TeamReport />;
}
