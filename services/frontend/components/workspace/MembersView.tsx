'use client';

// Full-page Members management screen (Next.js App Router port of the OLD
// app/routes/members/members.tsx stub, fleshed out with the real member
// table / roles / invite / remove behaviour from the OLD WorkspaceSettingsModal).
// Loads the current workspace then composes WorkspaceMembersManager.

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { fetchData, postData } from '@/lib/fetch-util';
import { Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { WorkspaceSelector } from '@/components/project/WorkspaceSelector';
import { CreateWorkspaceModal } from '@/components/layout/CreateWorkspaceModal';
import { WorkspaceMembersManager } from '@/components/workspace/WorkspaceMembersManager';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  members?: Array<{ userId: any; role: string; joinedAt?: string }>;
}

export function MembersView() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetchData('/workspace');
      const rawList = response?.data?.data ?? response?.data ?? response?.workspaces ?? [];
      const workspaceList = (Array.isArray(rawList) ? rawList : [])
        .map((w: any) => w?.workspaceId ?? w)
        .filter(Boolean);
      setWorkspaces(workspaceList);
      const storedId =
        typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;
      const resolvedCurrent =
        response?.currentWorkspace ??
        (storedId ? workspaceList.find((w: any) => w?._id === storedId) : null) ??
        workspaceList[0] ??
        null;
      setCurrentWorkspace(resolvedCurrent || null);
      if (resolvedCurrent?._id) {
        localStorage.setItem('currentWorkspaceId', resolvedCurrent._id);
      }
    } catch (error) {
      console.error('Failed to load workspaces', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        setLoading(true);
        await fetchWorkspaces();
        setLoading(false);
      })();
    }
  }, [isAuthenticated, fetchWorkspaces]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);

  const switchWorkspace = async (workspaceId: string) => {
    try {
      await postData('/workspace/switch', { workspaceId });
      localStorage.setItem('currentWorkspaceId', workspaceId);
      await fetchWorkspaces();
    } catch (error) {
      console.error('Failed to switch workspace', error);
    }
  };

  const handleCreateWorkspace = () => setShowCreateWorkspaceModal(true);

  const handleWorkspaceChange = (workspaceId: string) => {
    if (workspaceId === 'create-new-workspace') {
      handleCreateWorkspace();
      return;
    }
    switchWorkspace(workspaceId);
  };

  return (
    <div className="bg-white rounded-[8px] min-h-[940px] mx-[10px] md:mx-[20px] mt-[20px] md:mt-[30px] p-[15px] md:p-[10px]">
      {/* Breadcrumb */}
      <div className="mb-[15px] md:mb-[25px]">
        <Breadcrumb />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[15px] md:gap-0 mb-[20px] md:mb-[25px]">
        <div className="flex flex-col gap-[5px]">
          <h1 className="text-[20px] md:text-[24px] font-bold text-[#040110] font-['Inter']">
            Members
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#040110] opacity-60 font-normal">
            Manage employees, roles, and access for this workspace.
          </p>
        </div>
        <div className="flex items-center gap-[10px]">
          <WorkspaceSelector
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onSwitchWorkspace={handleWorkspaceChange}
            onCreateWorkspaceClick={handleCreateWorkspace}
            canCreateWorkspace={user?.role === 'admin'}
          />
        </div>
      </div>

      {isLoading || loading ? (
        <div className="flex items-center text-sm text-[#717182] py-[60px] justify-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading members…
        </div>
      ) : !currentWorkspace ? (
        <div className="flex flex-col items-center justify-center py-[100px]">
          <p className="text-[16px] text-[#717182] font-['Inter']">No workspace selected</p>
        </div>
      ) : (
        <WorkspaceMembersManager workspaceId={currentWorkspace._id} showInvite />
      )}

      <CreateWorkspaceModal
        open={showCreateWorkspaceModal}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onWorkspaceCreated={() => {
          fetchWorkspaces();
          setShowCreateWorkspaceModal(false);
        }}
      />
    </div>
  );
}

export default MembersView;
