'use client';

// Ported from OLD app/routes/analytics/analytics.tsx (the AnalyticsContent shell:
// header + manual refresh + navigation tabs). React-Router <Outlet> + route-based
// tab navigation is replaced with App-Router-friendly local `activeTab` state that
// swaps between the Personal and Team Report panels. Header / tab JSX + Figma hex
// copied VERBATIM. Tab visibility rules (Personal always; Team Report only for
// workspace lead/owner) preserved exactly.

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRole } from '@/components/analytics/RoleContext';
import { ManualRefreshButton } from '@/components/analytics/ManualRefreshButton';
import { PersonalStats } from '@/components/analytics/PersonalStats';
import { TeamReport } from '@/components/analytics/TeamReport';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type AnalyticsTab = 'personal' | 'restricted';

export function AnalyticsDashboard() {
  const { isLoading, user } = useAuth();
  const { selectedRole } = useRole();

  const isAdmin = selectedRole === 'admin' || selectedRole === 'super_admin';

  // Determine workspace role for restricted access
  const currentWorkspaceId = typeof user?.currentWorkspace === 'string'
    ? user.currentWorkspace
    : user?.currentWorkspace?._id;

  const workspaceRole = (user?.workspaces as any[])?.find((w: any) =>
    w?.workspaceId?._id === currentWorkspaceId || w?.workspaceId === currentWorkspaceId
  )?.role || 'member';

  const isWorkspaceLead = workspaceRole === 'lead';
  const isWorkspaceOwner = workspaceRole === 'owner';
  const hasRestrictedAccess = isWorkspaceLead || isWorkspaceOwner;

  // Active tab. Non-restricted, non-admin users only ever see "personal".
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('personal');

  // Keep non-privileged users locked to the personal tab.
  useEffect(() => {
    if (!hasRestrictedAccess && activeTab === 'restricted') {
      setActiveTab('personal');
    }
  }, [hasRestrictedAccess, activeTab]);

  // Handle tab navigation
  const handleTabChange = (tab: AnalyticsTab) => {
    // Check if user has access to restricted tab
    if (tab === 'restricted' && !hasRestrictedAccess) {
      setActiveTab('personal');
      return;
    }
    setActiveTab(tab);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Determine which tabs to show based on selected role
  const showRestrictedTab = hasRestrictedAccess; // Leads and admins can see restricted
  const showPersonalTab = true; // All roles can see personal

  void isAdmin; // retained from original for parity; admin-only tabs are commented out

  return (
    <div className="min-h-screen bg-[#F9F9F9] p-[10px] md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Page Header with Manual Refresh Button and Role Switcher */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-[20px] md:text-2xl font-bold text-gray-900 font-['Inter']">
              Analytics Dashboard
            </h1>
            <p className="text-[13px] md:text-sm text-gray-600 mt-1 font-['Inter']">
              Monitor performance, workspace metrics, and leaderboard standings
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ManualRefreshButton userRole={user?.role} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Card className="border border-[#e9ecf1] rounded-[8px] bg-white">
          <div className="p-[10px] md:p-4">
            <div className="flex items-center gap-[10px] border-b-[0.5px] border-[#949291] overflow-x-auto scrollbar-visible">
              {/* Personal Tab */}
              {showPersonalTab && (
                <button
                  onClick={() => handleTabChange("personal")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === "personal"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Personal
                </button>
              )}

              {/* Restricted Tab - Only for Leads & Admins */}
              {showRestrictedTab && (
                <button
                  onClick={() => handleTabChange("restricted")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === "restricted"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Team Report
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Content Area - Renders the active tab panel */}
        <div className="w-full">
          {activeTab === 'restricted' && hasRestrictedAccess ? (
            <TeamReport />
          ) : (
            <PersonalStats />
          )}
        </div>
      </div>
    </div>
  );
}
