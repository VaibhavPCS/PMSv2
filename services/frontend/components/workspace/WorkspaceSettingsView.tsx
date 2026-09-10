'use client';

// Full-page workspace settings screen. Loads the current workspace (same
// /workspace endpoint the projects list uses) then presents the General +
// Members + Delete surfaces as tabs. Ported from the OLD WorkspaceSettingsModal
// content (app/components/workspace/WorkspaceSettingsModal.tsx) into a page.

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { fetchData } from '@/lib/fetch-util';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { WorkspaceGeneralSettings } from '@/components/workspace/WorkspaceGeneralSettings';
import { WorkspaceMembersManager } from '@/components/workspace/WorkspaceMembersManager';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

export function WorkspaceSettingsView() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetchData('/workspace');
      // New backend: { status, data: { data: [...workspaces] } }. Old monolith:
      // { workspaces: [{ workspaceId }], currentWorkspace }. Support both, same as
      // the dashboard. There's usually no `currentWorkspace`, so resolve the active
      // one by the previously-selected id, else fall back to the first.
      const list: any[] =
        response?.data?.data ??
        (Array.isArray(response?.workspaces)
          ? response.workspaces.map((w: any) => w.workspaceId).filter(Boolean)
          : null) ??
        (Array.isArray(response?.data) ? response.data : null) ??
        (Array.isArray(response) ? response : []);

      const storedId =
        typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;
      const current =
        response?.currentWorkspace ||
        list.find((w: any) => (w?._id || w?.id) === storedId) ||
        list[0] ||
        null;

      setCurrentWorkspace(current);
      const cid = current?._id || current?.id;
      if (cid) localStorage.setItem('currentWorkspaceId', cid);
    } catch (error) {
      console.error('Failed to load workspace', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        setLoading(true);
        await loadWorkspace();
        setLoading(false);
      })();
    }
  }, [isAuthenticated, loadWorkspace]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);

  const tabTriggerClass =
    "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap opacity-60 data-[state=active]:opacity-100 data-[state=active]:border-b-[1px] data-[state=active]:border-[#f2761b]";

  return (
    <div className="bg-white rounded-[8px] min-h-[940px] mx-[10px] md:mx-[20px] mt-[20px] md:mt-[30px] p-[15px] md:p-[10px]">
      {/* Breadcrumb */}
      <div className="mb-[15px] md:mb-[25px]">
        <Breadcrumb />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 mb-[20px] md:mb-[25px]">
        <div className="bg-[#E5EFFF] p-2 md:p-3 rounded-lg">
          <Settings className="w-5 h-5 md:w-6 md:h-6 text-[#3a5afe]" />
        </div>
        <div>
          <h1 className="text-[20px] md:text-[24px] font-bold text-[#040110] font-['Inter']">
            Workspace Settings
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#040110] opacity-60 font-normal">
            {currentWorkspace?.name || 'Select Workspace'}
          </p>
        </div>
      </div>

      {isLoading || loading ? (
        <div className="flex items-center text-sm text-[#717182] py-[60px] justify-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading workspace…
        </div>
      ) : !currentWorkspace ? (
        <div className="flex flex-col items-center justify-center py-[100px]">
          <p className="text-[16px] text-[#717182] font-['Inter']">No workspace selected</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-hidden">
          <TabsList className="flex items-center gap-[10px] overflow-x-auto scrollbar-visible mb-[20px]">
            <TabsTrigger value="general" className={tabTriggerClass}>
              <Settings className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> General
            </TabsTrigger>
            <TabsTrigger value="members" className={tabTriggerClass}>
              <Users className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" /> Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <WorkspaceGeneralSettings
              workspace={currentWorkspace}
              onWorkspaceUpdated={(updated) =>
                setCurrentWorkspace((prev) =>
                  prev && prev._id === updated._id
                    ? { ...prev, name: updated.name, description: updated.description }
                    : prev
                )
              }
            />
          </TabsContent>

          <TabsContent value="members">
            <WorkspaceMembersManager workspaceId={currentWorkspace._id} showInvite />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default WorkspaceSettingsView;
