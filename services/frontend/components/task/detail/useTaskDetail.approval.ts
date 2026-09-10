'use client';

// Approval, reject, and reassign handler helpers extracted from useTaskDetail.ts.
// Only imported by useTaskDetail.ts — not part of the public hook API.

import React from 'react';
import { buildApiUrl } from '@/lib/config';
import { toast } from 'sonner';
import type { Task } from './types';

// ---------------------------------------------------------------------------
// Approve task
// ---------------------------------------------------------------------------

export async function handleApproveHelper(
  task: Task | null,
  setIsApproving: React.Dispatch<React.SetStateAction<boolean>>,
  fetchTaskDetails: () => Promise<void>
): Promise<void> {
  if (!task) return;
  try {
    setIsApproving(true);
    const response = await fetch(buildApiUrl(`/task/${task._id}/approve`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
    });
    if (!response.ok) throw new Error('Failed to approve task');
    toast.success('Task approved successfully');
    await fetchTaskDetails();
  } catch (error) {
    console.error('Failed to approve task:', error);
    toast.error('Failed to approve task');
  } finally {
    setIsApproving(false);
  }
}

// ---------------------------------------------------------------------------
// Reject task
// ---------------------------------------------------------------------------

interface RejectParams {
  task: Task | null;
  rejectionReason: string;
  rejectionFiles: File[];
  rejectionLink: string;
  rejectReassigneeId: string;
  rejectDueDate: string;
  rejectionFileInputRef: React.RefObject<HTMLInputElement | null>;
  setIsRejecting: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRejectDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setRejectionReason: React.Dispatch<React.SetStateAction<string>>;
  setRejectReassigneeId: React.Dispatch<React.SetStateAction<string>>;
  setRejectStartDate: React.Dispatch<React.SetStateAction<string>>;
  setRejectDueDate: React.Dispatch<React.SetStateAction<string>>;
  setRejectProjectEnd: React.Dispatch<React.SetStateAction<Date | null>>;
  setRejectionFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setRejectionLink: React.Dispatch<React.SetStateAction<string>>;
  fetchTaskDetails: () => Promise<void>;
  formatErrorMessageDate: (msg: string) => string;
}

export async function handleRejectHelper(p: RejectParams): Promise<void> {
  if (!p.rejectionReason.trim()) {
    toast.error('Please provide a reason for rejection');
    return;
  }

  const attachmentType = p.task?.rejectionAttachmentType || 'either';
  const hasFile = p.rejectionFiles.length > 0;
  const hasLink = p.rejectionLink.trim();

  if (attachmentType === 'file' && !hasFile) {
    toast.error('File attachment is required for rejection');
    return;
  }
  if (attachmentType === 'link' && !hasLink) {
    toast.error('Link is required for rejection (Figma/GitHub)');
    return;
  }

  if (hasLink) {
    const figmaPattern = /^https?:\/\/(www\.)?figma\.com\//i;
    const githubPattern = /^https?:\/\/(www\.)?github\.com\//i;
    if (!figmaPattern.test(p.rejectionLink) && !githubPattern.test(p.rejectionLink)) {
      toast.error('Only Figma and GitHub links are allowed');
      return;
    }
  }

  try {
    p.setIsRejecting(true);
    let response: Response;
    if (hasFile) {
      const formData = new FormData();
      formData.append('reason', p.rejectionReason.trim());
      if (p.rejectReassigneeId) formData.append('reassigneeId', p.rejectReassigneeId);
      if (p.rejectDueDate) formData.append('newDueDate', p.rejectDueDate);
      if (hasLink) formData.append('rejectionLink', p.rejectionLink.trim());
      p.rejectionFiles.forEach((file) => formData.append('rejectionFiles', file));
      response = await fetch(buildApiUrl(`/task/${p.task?._id}/reject`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
        body: formData,
      });
    } else {
      response = await fetch(buildApiUrl(`/task/${p.task?._id}/reject`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
        },
        body: JSON.stringify({
          reason: p.rejectionReason.trim(),
          reassigneeId: p.rejectReassigneeId || undefined,
          newDueDate: p.rejectDueDate || undefined,
          rejectionLink: hasLink ? p.rejectionLink.trim() : undefined,
        }),
      });
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to reject task' }));
      throw new Error(errorData.message || 'Failed to reject task');
    }
    toast.success('Task rejected successfully');
    p.setShowRejectDialog(false);
    p.setRejectionReason('');
    p.setRejectReassigneeId('');
    p.setRejectStartDate('');
    p.setRejectDueDate('');
    p.setRejectProjectEnd(null);
    p.setRejectionFiles([]);
    p.setRejectionLink('');
    if (p.rejectionFileInputRef.current) p.rejectionFileInputRef.current.value = '';
    await p.fetchTaskDetails();
  } catch (error: any) {
    console.error('Failed to reject task:', error);
    toast.error(p.formatErrorMessageDate(error?.message || 'Failed to reject task'));
  } finally {
    p.setIsRejecting(false);
  }
}

// ---------------------------------------------------------------------------
// Reassign task
// ---------------------------------------------------------------------------

interface ReassignParams {
  task: Task | null;
  reassignAssigneeId: string;
  reassignDueDate: string;
  setIsReassigning: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReassignDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setReassignAssigneeId: React.Dispatch<React.SetStateAction<string>>;
  setReassignDueDate: React.Dispatch<React.SetStateAction<string>>;
  setReassignProjectEnd: React.Dispatch<React.SetStateAction<Date | null>>;
  fetchTaskDetails: () => Promise<void>;
  formatErrorMessageDate: (msg: string) => string;
}

export async function handleReassignTaskHelper(p: ReassignParams): Promise<void> {
  if (!p.reassignAssigneeId || !p.reassignDueDate) {
    toast.error('Please select an assignee and due date');
    return;
  }
  try {
    p.setIsReassigning(true);
    const response = await fetch(buildApiUrl(`/task/${p.task?._id}/reassign`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({ assigneeId: p.reassignAssigneeId, dueDate: p.reassignDueDate }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to reassign task' }));
      throw new Error(errorData.message || 'Failed to reassign task');
    }
    toast.success('Task reassigned successfully');
    p.setShowReassignDialog(false);
    p.setReassignAssigneeId('');
    p.setReassignDueDate('');
    p.setReassignProjectEnd(null);
    await p.fetchTaskDetails();
  } catch (error: any) {
    console.error('Failed to reassign task:', error);
    toast.error(p.formatErrorMessageDate(error?.message || 'Failed to reassign task'));
  } finally {
    p.setIsReassigning(false);
  }
}
