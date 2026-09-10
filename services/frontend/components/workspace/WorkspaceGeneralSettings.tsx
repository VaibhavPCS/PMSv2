'use client';

// Workspace "General" + "Delete" settings surface ported from the OLD
// WorkspaceSettingsModal general/delete tabs into a full-page form.
// Consumed by app/(dashboard)/workspace/page.tsx.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchData, putData, deleteData } from '@/lib/fetch-util';

interface WorkspaceGeneralSettingsProps {
  workspace: { _id: string; name: string; description?: string } | null;
  onWorkspaceUpdated?: (ws: { _id: string; name: string; description?: string }) => void;
}

const getErrorMessage = (
  error: any,
  fallback: string,
  specific?: Record<number, string>
) => {
  const status = error?.response?.status as number | undefined;
  const backendMessage = error?.response?.data?.message as string | undefined;
  if (backendMessage) return backendMessage;
  if (error?.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';
  if (specific && status && specific[status]) return specific[status];
  if (status === 401) return 'Unauthorized. Please sign in again.';
  if (status === 404) return 'Not found.';
  if (status === 403) return 'Forbidden. You do not have permission to perform this action.';
  if (status === 500) return 'Server error. Please try again later.';
  return error?.message || fallback;
};

export function WorkspaceGeneralSettings({
  workspace,
  onWorkspaceUpdated,
}: WorkspaceGeneralSettingsProps) {
  const router = useRouter();
  const workspaceId = workspace?._id;

  const [generalName, setGeneralName] = useState('');
  const [generalDescription, setGeneralDescription] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadWorkspaceDetails = async () => {
    try {
      const res = await fetchData(`/workspace/${workspaceId}`);
      const ws = res.workspace;
      setGeneralName(ws?.name || workspace?.name || '');
      setGeneralDescription(ws?.description || workspace?.description || '');
    } catch (error: any) {
      console.error('Failed to load workspace details', error);
      toast.error(
        getErrorMessage(error, 'Failed to load workspace details', {
          404: 'Workspace not found',
          403: "You don't have access to this workspace",
        })
      );
    }
  };

  const handleUpdateWorkspace = async () => {
    const name = generalName.trim();
    if (!name) {
      toast.error('Workspace name is required');
      return;
    }
    if (!workspaceId) return;
    setSavingGeneral(true);
    try {
      const res = await putData(`/workspace/${workspaceId}`, {
        name,
        description: generalDescription.trim(),
      });
      toast.success(res?.message || 'Workspace updated');
      onWorkspaceUpdated?.({
        _id: workspaceId as string,
        name,
        description: generalDescription.trim(),
      });
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, 'Failed to update workspace', {
          403: 'Only owners and admins can update workspace',
        })
      );
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    const confirmRemove = window.confirm(
      `Delete workspace "${generalName || workspace?.name || ''}"? This action cannot be undone.`
    );
    if (!confirmRemove) return;
    setDeleting(true);
    try {
      const res = await deleteData(`/workspace/${workspaceId}`);
      toast.success(res?.message || 'Workspace deleted');
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, 'Failed to delete workspace', {
          403: 'Only the owner can delete the workspace.',
        })
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-[20px]">
      {/* General Card */}
      <div className="bg-white border border-gray-200 rounded-[12px] p-[15px] md:p-[20px]">
        <h2 className="text-[16px] md:text-[18px] font-semibold font-['Inter'] text-[#040110] mb-[15px]">
          General
        </h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
              Workspace name
            </Label>
            <Input
              type="text"
              value={generalName}
              onChange={(e) => setGeneralName(e.target.value)}
              placeholder="Workspace name"
              className="h-[40px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
              Description
            </Label>
            <textarea
              value={generalDescription}
              onChange={(e) => setGeneralDescription(e.target.value)}
              placeholder="Short description"
              className="h-[90px] w-full border border-[#d5d7da] rounded-[8px] px-[10px] py-[8px] text-[14px]"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleUpdateWorkspace}
              disabled={savingGeneral}
              className="bg-[#3a5afe] hover:bg-[#334fdc] text-white font-['Inter']"
            >
              {savingGeneral ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-white border border-red-200 rounded-[12px] p-[15px] md:p-[20px]">
        <h2 className="text-[16px] md:text-[18px] font-semibold font-['Inter'] text-red-700 mb-[15px]">
          Delete Workspace
        </h2>
        <div className="space-y-3">
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            Deleting a workspace is irreversible. All projects and data inside may become
            inaccessible.
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleDeleteWorkspace}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white font-['Inter']"
            >
              {deleting ? 'Deleting…' : 'Delete Workspace'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceGeneralSettings;
