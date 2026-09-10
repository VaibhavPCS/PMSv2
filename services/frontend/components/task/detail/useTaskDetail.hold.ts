'use client';

// Hold, resume and subtask handler helpers extracted from useTaskDetail.ts.
// Only imported by useTaskDetail.ts — not part of the public hook API.

import React from 'react';
import { buildApiUrl } from '@/lib/config';
import { toast } from 'sonner';
import type { Task, Subtask, TaskPriority } from './types';

// ---------------------------------------------------------------------------
// Hold task
// ---------------------------------------------------------------------------

interface PutOnHoldParams {
  task: Task | null;
  holdReason: string;
  setIsHolding: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHoldDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setHoldReason: React.Dispatch<React.SetStateAction<string>>;
  fetchTaskDetails: () => Promise<void>;
}

export async function handlePutOnHoldHelper(p: PutOnHoldParams): Promise<void> {
  if (!p.task) return;
  if (!p.holdReason.trim()) {
    toast.error('Please provide a reason for putting the task on hold');
    return;
  }
  try {
    p.setIsHolding(true);
    const response = await fetch(buildApiUrl(`/task/${p.task._id}/hold`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({ reason: p.holdReason.trim() || undefined }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to put task on hold' }));
      throw new Error(errorData.message || 'Failed to put task on hold');
    }
    const data = await response.json();
    toast.success('Task put on hold successfully');
    p.setShowHoldDialog(false);
    p.setHoldReason('');
    if (data.endDateCrossed) {
      toast.info('Note: Task end date has already passed. Reporting manager will need to set a new end date when resuming.');
    }
    await p.fetchTaskDetails();
  } catch (error: any) {
    console.error('Failed to put task on hold:', error);
    toast.error(error?.message || 'Failed to put task on hold');
  } finally {
    p.setIsHolding(false);
  }
}

// ---------------------------------------------------------------------------
// Resume task
// ---------------------------------------------------------------------------

interface ResumeParams {
  task: Task | null;
  endDateCrossed: boolean;
  resumeNewEndDate: string;
  setIsResuming: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResumeDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setResumeNewEndDate: React.Dispatch<React.SetStateAction<string>>;
  setEndDateCrossed: React.Dispatch<React.SetStateAction<boolean>>;
  fetchTaskDetails: () => Promise<void>;
  formatErrorMessageDate: (msg: string) => string;
}

export async function handleResumeHelper(p: ResumeParams): Promise<void> {
  if (!p.task) return;
  if (p.endDateCrossed && !p.resumeNewEndDate) {
    toast.error('Please set a new end date to resume this task');
    return;
  }
  try {
    p.setIsResuming(true);
    const response = await fetch(buildApiUrl(`/task/${p.task._id}/resume`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({ newEndDate: p.endDateCrossed ? p.resumeNewEndDate : undefined }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to resume task' }));
      throw new Error(errorData.message || 'Failed to resume task');
    }
    toast.success('Task resumed successfully');
    p.setShowResumeDialog(false);
    p.setResumeNewEndDate('');
    p.setEndDateCrossed(false);
    await p.fetchTaskDetails();
  } catch (error: any) {
    console.error('Failed to resume task:', error);
    toast.error(p.formatErrorMessageDate(error?.message || 'Failed to resume task'));
  } finally {
    p.setIsResuming(false);
  }
}

// ---------------------------------------------------------------------------
// Fetch subtasks
// ---------------------------------------------------------------------------

export async function fetchSubtasksHelper(
  taskId: string | undefined,
  setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>
): Promise<void> {
  if (!taskId) return;
  try {
    const res = await fetch(buildApiUrl(`/task/${taskId}/subtasks`), {
      credentials: 'include',
      headers: { 'workspace-id': localStorage.getItem('currentWorkspaceId') || '' },
    });
    if (res.ok) {
      const data = await res.json();
      setSubtasks(data.subtasks || []);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Create subtask
// ---------------------------------------------------------------------------

interface CreateSubtaskParams {
  taskId: string | undefined;
  task: Task | null;
  subtaskTitle: string;
  subtaskDescription: string;
  subtaskAssigneeId: string;
  subtaskPriority: TaskPriority;
  subtaskStartDate: string;
  subtaskEndDate: string;
  setIsCreatingSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCreateSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  setSubtaskTitle: React.Dispatch<React.SetStateAction<string>>;
  setSubtaskDescription: React.Dispatch<React.SetStateAction<string>>;
  setSubtaskAssigneeId: React.Dispatch<React.SetStateAction<string>>;
  setSubtaskStartDate: React.Dispatch<React.SetStateAction<string>>;
  setSubtaskEndDate: React.Dispatch<React.SetStateAction<string>>;
  setSubtaskProjectStart: React.Dispatch<React.SetStateAction<Date | null>>;
  setSubtaskProjectEnd: React.Dispatch<React.SetStateAction<Date | null>>;
  setSubtaskPriority: React.Dispatch<React.SetStateAction<TaskPriority>>;
  fetchSubtasks: () => Promise<void>;
}

export async function handleCreateSubtaskHelper(p: CreateSubtaskParams): Promise<void> {
  if (!p.subtaskTitle) {
    toast.error('Subtask title is required');
    return;
  }
  if (p.subtaskStartDate && p.subtaskEndDate) {
    const startDate = new Date(p.subtaskStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(p.subtaskEndDate);
    endDate.setHours(0, 0, 0, 0);
    if (startDate > endDate) {
      toast.error('End date must be after or equal to start date');
      return;
    }
    if (p.task) {
      const taskStartDate = new Date(p.task.startDate);
      taskStartDate.setHours(0, 0, 0, 0);
      const taskDueDate = new Date(p.task.dueDate);
      taskDueDate.setHours(0, 0, 0, 0);
      if (startDate < taskStartDate || endDate > taskDueDate) {
        toast.error('Subtask dates must be within the parent task date range (including task start and end dates)');
        return;
      }
    }
  }
  p.setIsCreatingSubtask(true);
  try {
    const res = await fetch(buildApiUrl(`/task/${p.taskId}/subtasks`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({
        title: p.subtaskTitle,
        description: p.subtaskDescription,
        assigneeId: p.subtaskAssigneeId || undefined,
        priority: p.subtaskPriority,
        startDate: p.subtaskStartDate || undefined,
        dueDate: p.subtaskEndDate || undefined,
        approvalStatus: 'pending-approval',
      }),
    });
    if (res.ok) {
      toast.success('Subtask created');
      p.setShowCreateSubtask(false);
      p.setSubtaskTitle('');
      p.setSubtaskDescription('');
      p.setSubtaskAssigneeId('');
      p.setSubtaskStartDate('');
      p.setSubtaskEndDate('');
      p.setSubtaskProjectStart(null);
      p.setSubtaskProjectEnd(null);
      p.setSubtaskPriority('medium');
      p.fetchSubtasks();
    } else {
      const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Subtask creation error:', errorData);
      toast.error(errorData.message || 'Failed to create subtask');
    }
  } catch (e: any) {
    toast.error(e?.message || 'Failed to create subtask');
  } finally {
    p.setIsCreatingSubtask(false);
  }
}

// ---------------------------------------------------------------------------
// Update subtask
// ---------------------------------------------------------------------------

interface UpdateSubtaskParams {
  task: Task | null;
  editingSubtask: Subtask | null;
  editSubtaskTitle: string;
  editSubtaskDescription: string;
  editSubtaskAssigneeId: string;
  editSubtaskPriority: TaskPriority;
  editSubtaskStartDate: string;
  editSubtaskEndDate: string;
  setIsUpdatingSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEditSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingSubtask: React.Dispatch<React.SetStateAction<Subtask | null>>;
  setEditSubtaskTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditSubtaskDescription: React.Dispatch<React.SetStateAction<string>>;
  setEditSubtaskAssigneeId: React.Dispatch<React.SetStateAction<string>>;
  setEditSubtaskPriority: React.Dispatch<React.SetStateAction<TaskPriority>>;
  setEditSubtaskStartDate: React.Dispatch<React.SetStateAction<string>>;
  setEditSubtaskEndDate: React.Dispatch<React.SetStateAction<string>>;
  setEditSubtaskProjectStart: React.Dispatch<React.SetStateAction<Date | null>>;
  setEditSubtaskProjectEnd: React.Dispatch<React.SetStateAction<Date | null>>;
  fetchSubtasks: () => Promise<void>;
}

export async function handleUpdateSubtaskHelper(p: UpdateSubtaskParams): Promise<void> {
  if (!p.editingSubtask) return;
  if (!p.editSubtaskTitle) {
    toast.error('Subtask title is required');
    return;
  }
  if (p.editSubtaskStartDate && p.editSubtaskEndDate) {
    const startDate = new Date(p.editSubtaskStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(p.editSubtaskEndDate);
    endDate.setHours(0, 0, 0, 0);
    if (startDate > endDate) {
      toast.error('End date must be after or equal to start date');
      return;
    }
    if (p.task) {
      const taskStartDate = new Date(p.task.startDate);
      taskStartDate.setHours(0, 0, 0, 0);
      const taskDueDate = new Date(p.task.dueDate);
      taskDueDate.setHours(0, 0, 0, 0);
      if (startDate < taskStartDate || endDate > taskDueDate) {
        toast.error('Subtask dates must be within the parent task date range (including task start and end dates)');
        return;
      }
    }
  }
  p.setIsUpdatingSubtask(true);
  try {
    const res = await fetch(buildApiUrl(`/task/subtask/${p.editingSubtask._id}`), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
      },
      body: JSON.stringify({
        title: p.editSubtaskTitle,
        description: p.editSubtaskDescription,
        assigneeId: p.editSubtaskAssigneeId || undefined,
        priority: p.editSubtaskPriority,
        startDate: p.editSubtaskStartDate || undefined,
        dueDate: p.editSubtaskEndDate || undefined,
      }),
    });
    if (res.ok) {
      toast.success('Subtask updated');
      p.setShowEditSubtask(false);
      p.setEditingSubtask(null);
      p.setEditSubtaskTitle('');
      p.setEditSubtaskDescription('');
      p.setEditSubtaskAssigneeId('');
      p.setEditSubtaskPriority('medium');
      p.setEditSubtaskStartDate('');
      p.setEditSubtaskEndDate('');
      p.setEditSubtaskProjectStart(null);
      p.setEditSubtaskProjectEnd(null);
      await p.fetchSubtasks();
    } else {
      const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
      toast.error(errorData.message || 'Failed to update subtask');
    }
  } catch (e: any) {
    toast.error(e?.message || 'Failed to update subtask');
  } finally {
    p.setIsUpdatingSubtask(false);
  }
}
