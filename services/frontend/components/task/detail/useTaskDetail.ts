'use client';

// Data + socket.io-client realtime hook for the Task Detail screen.
//
// Owns ALL fetching, mutations, derived permissions and realtime wiring for
// the ported task-detail screen. Ported verbatim from the OLD
// app/routes/task/task-detail.tsx (3684 LOC) handler/effect logic; only the
// router/auth/config bindings are swapped for the Next.js equivalents.
//
// Called by: components/task/detail/TaskDetailClient.tsx (orchestrator, parts
// 2/3), which is rendered by app/(dashboard)/tasks/[id]/page.tsx. The
// orchestrator spreads the returned `UseTaskDetailReturn` into the six
// sub-sections (Header / Body / Sidebar / Comments / SubtasksSection / Activity).

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { fetchData, postData } from '@/lib/fetch-util';
import { buildApiUrl, getSocketUrl, gracefulSocketDisconnect } from '@/lib/config';
import {
  Circle,
  PlayCircle,
  PauseCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { io, type Socket } from 'socket.io-client';
import type {
  ActiveUser,
  AssignableMember,
  Comment,
  HandoverEntry,
  Subtask,
  Task,
  TaskPriority,
  UseTaskDetailReturn,
} from './types';

// Helper imports — handler bodies extracted for <1000-LOC compliance
import {
  fetchCommentsHelper,
  fetchHandoverEntriesHelper,
  handleSubmitHandoverEntryHelper,
  handleAddCommentHelper,
  handleEditCommentHelper,
  handleDeleteCommentHelper,
  handleLoadRepliesHelper,
  handleTaskAttachmentsSelectHelper,
} from './useTaskDetail.comments';
import {
  handleApproveHelper,
  handleRejectHelper,
  handleReassignTaskHelper,
} from './useTaskDetail.approval';
import {
  fetchSubtasksHelper,
  handleCreateSubtaskHelper,
  handleUpdateSubtaskHelper,
  handlePutOnHoldHelper,
  handleResumeHelper,
} from './useTaskDetail.hold';

export function useTaskDetail(): UseTaskDetailReturn {
  // Helper to format date in error messages from (mm/dd/yyyy) to (dd/mm/yyyy)
  const formatErrorMessageDate = (message: string) => {
    const dateRegex = /\((\d{1,2})\/(\d{1,2})\/(\d{4})\)/;
    const match = message.match(dateRegex);
    if (match) {
      const [, month, day, year] = match;
      const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      return message.replace(dateRegex, `(${formattedDate})`);
    }
    return message;
  };

  const params = useParams();
  const taskId = (params?.id as string) || undefined;
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);

  // Handover entries states
  const [handoverEntries, setHandoverEntries] = useState<HandoverEntry[] | undefined>([]);
  const [newHandoverContent, setNewHandoverContent] = useState('');
  const [handoverSelectedFiles, setHandoverSelectedFiles] = useState<File[]>([]);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  const [isUploadingTaskAttachments, setIsUploadingTaskAttachments] = useState(false);
  const taskAttachmentsInputRef = useRef<HTMLInputElement>(null);

  // Chat-related states
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Approval workflow states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Enhanced rejection states with date selection
  const [rejectStartDate, setRejectStartDate] = useState('');
  const [rejectDueDate, setRejectDueDate] = useState('');
  const [rejectReassigneeId, setRejectReassigneeId] = useState('');
  const [rejectProjectStart, setRejectProjectStart] = useState<Date | null>(null);
  const [rejectProjectEnd, setRejectProjectEnd] = useState<Date | null>(null);

  // Rejection attachment states
  const [rejectionFiles, setRejectionFiles] = useState<File[]>([]);
  const [rejectionLink, setRejectionLink] = useState('');
  const rejectionFileInputRef = useRef<HTMLInputElement>(null);

  // Reassignment modal states
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignAssigneeId, setReassignAssigneeId] = useState('');
  const [reassignStartDate, setReassignStartDate] = useState('');
  const [reassignDueDate, setReassignDueDate] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignProjectStart, setReassignProjectStart] = useState<Date | null>(null);
  const [reassignProjectEnd, setReassignProjectEnd] = useState<Date | null>(null);

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);
  const [showEditSubtask, setShowEditSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>('medium');
  const [subtaskStartDate, setSubtaskStartDate] = useState<string>('');
  const [subtaskEndDate, setSubtaskEndDate] = useState<string>('');
  const [subtaskProjectStart, setSubtaskProjectStart] = useState<Date | null>(null);
  const [subtaskProjectEnd, setSubtaskProjectEnd] = useState<Date | null>(null);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDescription, setEditSubtaskDescription] = useState('');
  const [editSubtaskAssigneeId, setEditSubtaskAssigneeId] = useState('');
  const [editSubtaskPriority, setEditSubtaskPriority] = useState<TaskPriority>('medium');
  const [editSubtaskStartDate, setEditSubtaskStartDate] = useState('');
  const [editSubtaskEndDate, setEditSubtaskEndDate] = useState('');
  const [editSubtaskProjectStart, setEditSubtaskProjectStart] = useState<Date | null>(null);
  const [editSubtaskProjectEnd, setEditSubtaskProjectEnd] = useState<Date | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [handoverEditor, setHandoverEditor] = useState<any | null>(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);

  // Fetch assignable members for reassignment
  const [assignableMembers, setAssignableMembers] = useState<AssignableMember[]>([]);

  // Hold/Resume functionality
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeNewEndDate, setResumeNewEndDate] = useState('');
  const [isResuming, setIsResuming] = useState(false);
  const [endDateCrossed, setEndDateCrossed] = useState(false);

  // Check if task and related resources exist before allowing access
  const checkResourceExistence = async (id: string) => {
    try {
      const taskResponse = await fetch(buildApiUrl(`/task/${id}/exists`), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
        },
      });

      if (!taskResponse.ok) {
        if (taskResponse.status === 404) {
          toast.error('This task has been deleted or no longer exists');
          return false;
        } else if (taskResponse.status === 403) {
          toast.error("You don't have permission to access this task");
          return false;
        }
      }

      try {
        const taskDetailsResponse = await fetch(buildApiUrl(`/task/${id}`), {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
          },
        });

        if (taskDetailsResponse.ok) {
          const taskData = await taskDetailsResponse.json();
          if (taskData.task?.isArchived) {
            toast.error('This task has been archived');
            return false;
          }
          if (taskData.task?.deletedAt) {
            toast.error('This task has been deleted');
            return false;
          }
        }
      } catch (detailError) {
        console.error('Error fetching task details:', detailError);
      }

      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (workspaceId) {
        const workspaceResponse = await fetch(buildApiUrl(`/workspace/${workspaceId}/exists`), {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'workspace-id': workspaceId,
          },
        });

        if (!workspaceResponse.ok && workspaceResponse.status === 404) {
          toast.error('This workspace has been deleted or no longer exists');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking resource existence:', error);
      toast.error('Unable to verify task access');
      return false;
    }
  };

  // Initialize Socket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const newSocket = io(getSocketUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
    });

    setSocket(newSocket);

    return () => {
      gracefulSocketDisconnect(newSocket);
    };
  }, [isAuthenticated]);

  // Join task room and listen for updates
  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit('join-task', taskId);

    const handleNewComment = (data: { comment: Comment; taskId: string }) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    };

    const handleUpdateComment = (data: { comment: Comment; taskId: string }) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.map((c) => (c._id === data.comment._id ? data.comment : c)));
      }
    };

    const handleDeleteCommentEvent = (data: { commentId: string; taskId: string }) => {
      if (data.taskId === taskId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:update', handleUpdateComment);
    socket.on('comment:delete', handleDeleteCommentEvent);

    return () => {
      socket.emit('leave-task', taskId);
      socket.off('comment:new', handleNewComment);
      socket.off('comment:update', handleUpdateComment);
      socket.off('comment:delete', handleDeleteCommentEvent);
    };
  }, [socket, taskId]);

  useEffect(() => {
    if (!editingSubtask) return;
    setEditSubtaskTitle(editingSubtask.title || '');
    setEditSubtaskDescription(editingSubtask.description || '');
    const assigneeId =
      (editingSubtask.assignee as any)?._id || (editingSubtask.assignee as any) || '';
    setEditSubtaskAssigneeId(assigneeId);
    setEditSubtaskPriority((editingSubtask.priority as TaskPriority) || 'medium');
    const start = editingSubtask.startDate ? new Date(editingSubtask.startDate) : null;
    const end = editingSubtask.dueDate ? new Date(editingSubtask.dueDate) : null;
    setEditSubtaskProjectStart(start);
    setEditSubtaskProjectEnd(end);
    setEditSubtaskStartDate(start ? start.toISOString() : '');
    setEditSubtaskEndDate(end ? end.toISOString() : '');
  }, [editingSubtask]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetchData('/auth/me');
        setCurrentUser(response.data ?? response.user);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    if (!user && !authLoading) {
      fetchCurrentUser();
    }
  }, [user, authLoading]);

  const activeUser: ActiveUser | null = (user as ActiveUser) || currentUser;

  useEffect(() => {
    if (taskId && !authLoading) {
      fetchTaskDetails();
      fetchComments();
      fetchSubtasks();
      fetchHandoverEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, authLoading]);

  // Fetch assignable members when task is loaded
  useEffect(() => {
    const fetchAssignableMembers = async () => {
      if (!task?.project?._id) return;
      try {
        const response = await fetchData(`/task/project/${task.project._id}/members`);
        setAssignableMembers(response.members || []);
      } catch (error) {
        console.error('Failed to fetch assignable members:', error);
      }
    };

    if (task?.project?._id) {
      fetchAssignableMembers();
    }
  }, [task?.project?._id]);

  useEffect(() => {
    if (!handoverEditor) return;
    const updateActive = () => {
      setIsBoldActive(handoverEditor.isActive('bold'));
      setIsItalicActive(handoverEditor.isActive('italic'));
      setIsUnderlineActive(handoverEditor.isActive('underline'));
    };
    updateActive();
    handoverEditor.on('transaction', updateActive);
    handoverEditor.on('selectionUpdate', updateActive);
    handoverEditor.on('update', updateActive);
    return () => {
      try { handoverEditor.off('transaction', updateActive); } catch {}
      try { handoverEditor.off('selectionUpdate', updateActive); } catch {}
      try { handoverEditor.off('update', updateActive); } catch {}
    };
  }, [handoverEditor]);

  const fetchTaskDetails = async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/task/${taskId}`), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.task) {
        throw new Error('Task not found in response');
      }

      setTask(data.task);
    } catch (error) {
      console.error('Failed to fetch task details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('403')) {
        toast.error("You don't have permission to view this task");
      } else if (errorMessage.includes('404')) {
        await checkResourceExistence(taskId);
      } else {
        toast.error('Failed to load task details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    await fetchCommentsHelper(taskId, setComments);
  };

  const fetchSubtasks = async () => {
    await fetchSubtasksHelper(taskId, setSubtasks);
  };

  const handleCreateSubtask = async () => {
    await handleCreateSubtaskHelper({
      taskId, task, subtaskTitle, subtaskDescription, subtaskAssigneeId,
      subtaskPriority, subtaskStartDate, subtaskEndDate,
      setIsCreatingSubtask, setShowCreateSubtask, setSubtaskTitle,
      setSubtaskDescription, setSubtaskAssigneeId, setSubtaskStartDate,
      setSubtaskEndDate, setSubtaskProjectStart, setSubtaskProjectEnd,
      setSubtaskPriority, fetchSubtasks,
    });
  };

  const handleUpdateSubtask = async () => {
    await handleUpdateSubtaskHelper({
      task, editingSubtask, editSubtaskTitle, editSubtaskDescription,
      editSubtaskAssigneeId, editSubtaskPriority, editSubtaskStartDate,
      editSubtaskEndDate, setIsUpdatingSubtask, setShowEditSubtask,
      setEditingSubtask, setEditSubtaskTitle, setEditSubtaskDescription,
      setEditSubtaskAssigneeId, setEditSubtaskPriority, setEditSubtaskStartDate,
      setEditSubtaskEndDate, setEditSubtaskProjectStart, setEditSubtaskProjectEnd,
      fetchSubtasks,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    if (isChangingStatus) {
      toast.error('Status change already in progress');
      return;
    }

    if (task.approvalStatus === 'approved') {
      toast.error(
        'This task has been approved and is locked. It must be reassigned to make changes.'
      );
      return;
    }

    if (task.status === 'done' && task.approvalStatus === 'pending-approval') {
      toast.error(
        'This task is awaiting approval. It must be approved, rejected, or reassigned before status can be changed.'
      );
      return;
    }

    if (newStatus === 'done' && task.approvalStatus === 'pending-approval') {
      toast.error('This subtask must be approved by a TL before it can be marked as done');
      return;
    }

    if (newStatus === 'done' && subtasks.length > 0) {
      const allSubtasksDone = subtasks.every((subtask) => subtask.status === 'done');
      if (!allSubtasksDone) {
        toast.error('All subtasks must be completed before marking this task as done');
        return;
      }
    }

    try {
      setIsChangingStatus(true);
      await postData(`/task/${taskId}/status`, { status: newStatus });
      await fetchTaskDetails();
      toast.success('Task status updated');
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const fetchHandoverEntries = async () => {
    await fetchHandoverEntriesHelper(taskId, setHandoverEntries);
  };

  const handleSubmitHandoverEntry = async () => {
    await handleSubmitHandoverEntryHelper({
      task, newHandoverContent, handoverSelectedFiles,
      setSubmittingHandover, setNewHandoverContent, setHandoverSelectedFiles,
      fetchHandoverEntries,
    });
  };

  const handleAddComment = async () => {
    await handleAddCommentHelper({
      taskId, newComment, selectedFiles, replyingTo,
      setIsSubmitting, setNewComment, setSelectedFiles, setReplyingTo, fetchComments,
    });
  };

  const handleTaskAttachmentsSelect = async (filesList: FileList | null) => {
    await handleTaskAttachmentsSelectHelper({
      filesList, task, taskAttachmentsInputRef,
      setIsUploadingTaskAttachments, fetchTaskDetails,
    });
  };

  const handleEditComment = async (commentId: string, content: string) => {
    await handleEditCommentHelper(commentId, content, fetchComments);
  };

  const handleDeleteComment = async (commentId: string) => {
    await handleDeleteCommentHelper(commentId, fetchComments);
  };

  const handleToggleExpand = (commentId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) { newSet.delete(commentId); } else { newSet.add(commentId); }
      return newSet;
    });
  };

  const handleLoadReplies = async (parentCommentId: string) => {
    await handleLoadRepliesHelper(parentCommentId, setReplies);
  };

  const handleApprove = async () => {
    await handleApproveHelper(task, setIsApproving, fetchTaskDetails);
  };

  const handleReject = async () => {
    await handleRejectHelper({
      task, rejectionReason, rejectionFiles, rejectionLink,
      rejectReassigneeId, rejectDueDate, rejectionFileInputRef,
      setIsRejecting, setShowRejectDialog, setRejectionReason,
      setRejectReassigneeId, setRejectStartDate, setRejectDueDate,
      setRejectProjectEnd, setRejectionFiles, setRejectionLink,
      fetchTaskDetails, formatErrorMessageDate,
    });
  };

  const handleReassignTask = async () => {
    await handleReassignTaskHelper({
      task, reassignAssigneeId, reassignDueDate,
      setIsReassigning, setShowReassignDialog,
      setReassignAssigneeId, setReassignDueDate,
      setReassignProjectEnd, fetchTaskDetails, formatErrorMessageDate,
    });
  };

  const handlePutOnHold = async () => {
    await handlePutOnHoldHelper({
      task, holdReason,
      setIsHolding, setShowHoldDialog, setHoldReason, fetchTaskDetails,
    });
  };

  const handleResume = async () => {
    await handleResumeHelper({
      task, endDateCrossed, resumeNewEndDate,
      setIsResuming, setShowResumeDialog, setResumeNewEndDate,
      setEndDateCrossed, fetchTaskDetails, formatErrorMessageDate,
    });
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'to-do':
        return React.createElement(Circle, { className: 'w-4 h-4' });
      case 'in-progress':
        return React.createElement(PlayCircle, { className: 'w-4 h-4' });
      case 'on-hold':
        return React.createElement(PauseCircle, { className: 'w-4 h-4' });
      case 'done':
        return React.createElement(CheckCircle, { className: 'w-4 h-4' });
      default:
        return React.createElement(Circle, { className: 'w-4 h-4' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to-do':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'on-hold':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getApprovalStatusColor = (status?: string) => {
    switch (status) {
      case 'pending-approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const topLevelComments = comments.filter((c) => !c.parentComment);

  const isCreator =
    activeUser?._id === task?.creator?._id || activeUser?.id === task?.creator?._id;
  const isAssignee =
    activeUser?._id === task?.assignee?._id || activeUser?.id === task?.assignee?._id;
  const isAdmin = ['admin', 'super_admin'].includes(activeUser?.role || '');
  const headIds = [
    ...(task?.project?.projectHeads || []),
    ...(task?.project?.projectHead ? [task.project.projectHead] : []),
  ]
    .map((head: any) => (head?._id || head)?.toString())
    .filter(Boolean);
  const isProjectHead = headIds.includes(String(activeUser?._id || activeUser?.id || ''));
  const meMemberEntry = assignableMembers.find(
    (m) => String(m._id) === String(activeUser?._id || activeUser?.id || '')
  );
  const isTLAssignedToParent = Boolean(
    meMemberEntry && meMemberEntry.role === 'tl' && isAssignee
  );
  const canApprove =
    task?.status === 'done' && task?.approvalStatus === 'pending-approval' && isCreator;

  // Hold/Resume permissions
  const isTL = Boolean(meMemberEntry && meMemberEntry.role === 'tl');
  const canPutOnHold =
    (isAssignee || isProjectHead || isTL || isAdmin) &&
    ['to-do', 'in-progress'].includes(task?.status || '');
  const canResume = (isProjectHead || isTL || isAdmin) && Boolean(task?.currentlyOnHold);

  // Task locking logic
  const isTaskLocked =
    task?.status === 'done' &&
    (task?.approvalStatus === 'pending-approval' || task?.approvalStatus === 'approved');

  const showLockWarning = Boolean(isTaskLocked && isAssignee);

  const canCreateSubtask = isTLAssignedToParent && !isTaskLocked;

  return {
    taskId,
    navigate,

    task,
    comments,
    handoverEntries,
    subtasks,
    assignableMembers,
    replies,

    loading,
    authLoading,
    isAuthenticated,
    activeUser,

    socket,

    isCreator,
    isAssignee,
    isAdmin,
    isProjectHead,
    isTL,
    isTLAssignedToParent,
    canApprove,
    canPutOnHold,
    canResume,
    isTaskLocked: Boolean(isTaskLocked),
    showLockWarning,
    canCreateSubtask,
    topLevelComments,

    newComment,
    setNewComment,
    selectedFiles,
    setSelectedFiles,
    replyingTo,
    setReplyingTo,
    expandedThreads,
    isSubmitting,

    newHandoverContent,
    setNewHandoverContent,
    handoverSelectedFiles,
    setHandoverSelectedFiles,
    submittingHandover,
    handoverEditor,
    setHandoverEditor,
    isBoldActive,
    isItalicActive,
    isUnderlineActive,

    isUploadingTaskAttachments,
    taskAttachmentsInputRef,

    isChangingStatus,

    showRejectDialog,
    setShowRejectDialog,
    rejectionReason,
    setRejectionReason,
    isApproving,
    isRejecting,
    rejectDueDate,
    setRejectDueDate,
    rejectReassigneeId,
    setRejectReassigneeId,
    rejectProjectEnd,
    setRejectProjectEnd,
    rejectionFiles,
    setRejectionFiles,
    rejectionLink,
    setRejectionLink,
    rejectionFileInputRef,

    showReassignDialog,
    setShowReassignDialog,
    reassignAssigneeId,
    setReassignAssigneeId,
    reassignDueDate,
    setReassignDueDate,
    reassignProjectEnd,
    setReassignProjectEnd,
    isReassigning,

    showHoldDialog,
    setShowHoldDialog,
    holdReason,
    setHoldReason,
    isHolding,
    showResumeDialog,
    setShowResumeDialog,
    resumeNewEndDate,
    setResumeNewEndDate,
    isResuming,
    endDateCrossed,
    setEndDateCrossed,

    showCreateSubtask,
    setShowCreateSubtask,
    subtaskTitle,
    setSubtaskTitle,
    subtaskDescription,
    setSubtaskDescription,
    subtaskAssigneeId,
    setSubtaskAssigneeId,
    subtaskPriority,
    setSubtaskPriority,
    subtaskStartDate,
    setSubtaskStartDate,
    subtaskEndDate,
    setSubtaskEndDate,
    subtaskProjectStart,
    setSubtaskProjectStart,
    subtaskProjectEnd,
    setSubtaskProjectEnd,
    isCreatingSubtask,

    showEditSubtask,
    setShowEditSubtask,
    editingSubtask,
    setEditingSubtask,
    editSubtaskTitle,
    setEditSubtaskTitle,
    editSubtaskDescription,
    setEditSubtaskDescription,
    editSubtaskAssigneeId,
    setEditSubtaskAssigneeId,
    editSubtaskPriority,
    setEditSubtaskPriority,
    editSubtaskStartDate,
    setEditSubtaskStartDate,
    editSubtaskEndDate,
    setEditSubtaskEndDate,
    editSubtaskProjectStart,
    setEditSubtaskProjectStart,
    editSubtaskProjectEnd,
    setEditSubtaskProjectEnd,
    isUpdatingSubtask,

    fetchTaskDetails,
    fetchComments,
    fetchSubtasks,
    fetchHandoverEntries,
    handleStatusChange,
    handleSubmitHandoverEntry,
    handleAddComment,
    handleTaskAttachmentsSelect,
    handleEditComment,
    handleDeleteComment,
    handleToggleExpand,
    handleLoadReplies,
    handleApprove,
    handleReject,
    handleReassignTask,
    handlePutOnHold,
    handleResume,
    handleCreateSubtask,
    handleUpdateSubtask,

    getStatusIcon,
    getStatusColor,
    getPriorityColor,
    getApprovalStatusColor,
    formatDate,
    formatErrorMessageDate,
  };
}

export default useTaskDetail;
