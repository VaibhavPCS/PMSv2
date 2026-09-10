'use client';

// Comment and handover handler helpers extracted from useTaskDetail.ts.
// Only imported by useTaskDetail.ts — not part of the public hook API.

import React from 'react';
import { buildApiUrl } from '@/lib/config';
import { toast } from 'sonner';
import type { Comment, Task } from './types';

// ---------------------------------------------------------------------------
// Handover helpers
// ---------------------------------------------------------------------------

export async function fetchHandoverEntriesHelper(
  taskId: string | undefined,
  setHandoverEntries: React.Dispatch<React.SetStateAction<any[] | undefined>>
): Promise<void> {
  if (!taskId) return;
  try {
    const response = await fetch(buildApiUrl(`/task/${taskId}/handover-entries`), {
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
    });
    if (response.ok) {
      const data = await response.json();
      setHandoverEntries(data.entries || []);
    }
  } catch (error) {
    console.error('Failed to fetch handover entries:', error);
  }
}

interface SubmitHandoverParams {
  task: Task | null;
  newHandoverContent: string;
  handoverSelectedFiles: File[];
  setSubmittingHandover: React.Dispatch<React.SetStateAction<boolean>>;
  setNewHandoverContent: React.Dispatch<React.SetStateAction<string>>;
  setHandoverSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  fetchHandoverEntries: () => Promise<void>;
}

export async function handleSubmitHandoverEntryHelper(p: SubmitHandoverParams): Promise<void> {
  if (!p.task) return;
  if (!p.newHandoverContent.trim()) {
    toast.error('Please add a message');
    return;
  }
  try {
    p.setSubmittingHandover(true);
    const formData = new FormData();
    formData.append('content', p.newHandoverContent.trim());
    p.handoverSelectedFiles.forEach((file) => formData.append('attachments', file));
    const response = await fetch(buildApiUrl(`/task/${p.task._id}/handover-entries`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to add handover entry' }));
      throw new Error(errorData.message || 'Failed to add handover entry');
    }
    toast.success('Handover entry added successfully');
    p.setNewHandoverContent('');
    p.setHandoverSelectedFiles([]);
    await p.fetchHandoverEntries();
  } catch (error: any) {
    console.error('Failed to add handover entry:', error);
    toast.error(error?.message || 'Failed to add handover entry');
  } finally {
    p.setSubmittingHandover(false);
  }
}

// ---------------------------------------------------------------------------
// Comment helpers
// ---------------------------------------------------------------------------

export async function fetchCommentsHelper(
  taskId: string | undefined,
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>
): Promise<void> {
  try {
    const response = await fetch(buildApiUrl(`/comments/task/${taskId}`), {
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
    });
    if (response.ok) {
      const data = await response.json();
      setComments(data.comments || []);
    } else {
      console.error('Failed to fetch comments:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error);
  }
}

interface AddCommentParams {
  taskId: string | undefined;
  newComment: string;
  selectedFiles: File[];
  replyingTo: Comment | null;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setReplyingTo: React.Dispatch<React.SetStateAction<Comment | null>>;
  fetchComments: () => Promise<void>;
}

export async function handleAddCommentHelper(p: AddCommentParams): Promise<void> {
  if (!p.newComment.trim() && p.selectedFiles.length === 0) {
    toast.error('Please enter a message or attach files');
    return;
  }
  try {
    p.setIsSubmitting(true);
    const formData = new FormData();
    formData.append('content', p.newComment.trim());
    formData.append('taskId', p.taskId!);
    if (p.replyingTo) formData.append('parentCommentId', p.replyingTo._id);
    p.selectedFiles.forEach((file) => formData.append('attachments', file));
    const response = await fetch(buildApiUrl('/comments'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to add comment');
    p.setNewComment('');
    p.setSelectedFiles([]);
    p.setReplyingTo(null);
    await p.fetchComments();
    toast.success('Comment added successfully');
  } catch (error) {
    console.error('Failed to add comment:', error);
    toast.error('Failed to add comment');
  } finally {
    p.setIsSubmitting(false);
  }
}

export async function handleEditCommentHelper(
  commentId: string,
  content: string,
  fetchComments: () => Promise<void>
): Promise<void> {
  try {
    const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to edit comment');
    await fetchComments();
    toast.success('Comment updated');
  } catch (error) {
    console.error('Failed to edit comment:', error);
    toast.error('Failed to edit comment');
  }
}

export async function handleDeleteCommentHelper(
  commentId: string,
  fetchComments: () => Promise<void>
): Promise<void> {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  try {
    const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
    });
    if (!response.ok) throw new Error('Failed to delete comment');
    await fetchComments();
    toast.success('Comment deleted');
  } catch (error) {
    console.error('Failed to delete comment:', error);
    toast.error('Failed to delete comment');
  }
}

export async function handleLoadRepliesHelper(
  parentCommentId: string,
  setReplies: React.Dispatch<React.SetStateAction<Record<string, Comment[]>>>
): Promise<void> {
  try {
    const response = await fetch(buildApiUrl(`/comments/${parentCommentId}/replies`), {
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
    });
    if (response.ok) {
      const data = await response.json();
      setReplies((prev) => ({ ...prev, [parentCommentId]: data.comments || [] }));
    }
  } catch (error) {
    console.error('Failed to load replies:', error);
  }
}

interface TaskAttachmentsParams {
  filesList: FileList | null;
  task: Task | null;
  taskAttachmentsInputRef: React.RefObject<HTMLInputElement | null>;
  setIsUploadingTaskAttachments: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTaskDetails: () => Promise<void>;
}

export async function handleTaskAttachmentsSelectHelper(p: TaskAttachmentsParams): Promise<void> {
  if (!p.filesList || !p.task?._id) return;
  const remainingSlots = Math.max(0, 10 - (p.task.attachments?.length || 0));
  if (remainingSlots <= 0) {
    toast.error('Maximum attachments reached', { description: 'You can attach up to 10 files' });
    return;
  }
  if (p.filesList.length > remainingSlots) {
    toast.error('Too many files', { description: `You can add ${remainingSlots} more attachment(s)` });
  }
  const files = Array.from(p.filesList).slice(0, Math.min(3, remainingSlots));
  const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
  if (oversized.length > 0) {
    toast.error('File too large', { description: `${oversized.map((f) => f.name).join(', ')} exceeds 5MB limit` });
    return;
  }
  p.setIsUploadingTaskAttachments(true);
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('attachments', f));
    const response = await fetch(buildApiUrl(`/task/${p.task._id}/attachments`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to upload attachments' }));
      throw new Error(errorData.message || 'Failed to upload attachments');
    }
    toast.success('Attachments uploaded successfully');
    if (p.taskAttachmentsInputRef.current) p.taskAttachmentsInputRef.current.value = '';
    await p.fetchTaskDetails();
  } catch (error: any) {
    toast.error(error?.message || 'Failed to upload attachments');
  } finally {
    p.setIsUploadingTaskAttachments(false);
  }
}
