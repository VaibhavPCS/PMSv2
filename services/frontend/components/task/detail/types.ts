// Shared types + explicit prop interfaces for the Task Detail screen.
//
// This file is the ORCHESTRATOR CONTRACT for the ported task-detail screen.
// The data/state/handler layer lives in `useTaskDetail.ts` (a single hook that
// owns all fetching, mutations and socket.io realtime). The orchestrator
// (`TaskDetailClient`, built in parts 2/3) spreads the hook's return value into
// the six sub-sections below. Each sub-section receives an EXPLICIT prop
// interface so parts 2/3 can implement against it without guessing.
//
// Faithfully mirrors the OLD app/routes/task/task-detail.tsx (3684 LOC).
//
// Consumed by:
//   - components/task/detail/useTaskDetail.ts (domain types + UseTaskDetailReturn)
//   - components/task/detail/Header.tsx        (imports Task)
//   - components/task/detail/{Body,Comments,Subtasks,Activity}.tsx (parts 2/3)
//   - components/task/detail/TaskDetailClient.tsx orchestrator (parts 2/3)

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';

/* -------------------------------------------------------------------------- */
/*                               Domain models                                */
/* -------------------------------------------------------------------------- */

export interface TaskAttachment {
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'document';
  fileSize: number;
  mimeType: string;
}

export interface HandoverEntry {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface RejectionAttachment {
  type: 'file' | 'link';
  fileName?: string;
  fileUrl?: string;
  fileType?: 'image' | 'document';
  fileSize?: number;
  mimeType?: string;
  linkUrl?: string;
  linkType?: 'figma' | 'github';
  uploadedBy: string;
  uploadedAt: string;
}

export interface HoldHistoryEntry {
  putOnHoldBy: string;
  putOnHoldAt: string;
  reason?: string;
  resumedBy?: string;
  resumedAt?: string;
  endDateAtHold?: string;
  endDateCrossedDuringHold?: boolean;
  newEndDateSetBy?: string;
  newEndDate?: string;
}

export interface RecurringCompletionHistoryEntry {
  completedAt: string;
  completedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'completed' | 'skipped';
}

export type TaskStatus = 'to-do' | 'in-progress' | 'done' | 'on-hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ApprovalStatus =
  | 'not-required'
  | 'pending-approval'
  | 'approved'
  | 'rejected';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';
export type RejectionAttachmentType = 'file' | 'link' | 'either';

export interface TaskPerson {
  _id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: TaskPerson;
  creator: TaskPerson;
  project: {
    _id: string;
    title: string;
    projectHead?: {
      _id: string;
      name?: string;
      email?: string;
    };
    projectHeads?: Array<{
      _id: string;
      name?: string;
      email?: string;
    }>;
  };
  category: string;
  startDate: string;
  dueDate: string;
  durationDays?: number;
  createdAt: string;
  completedAt?: string;
  attachments?: TaskAttachment[];
  handoverNotes?: string;
  handoverAttachments?: TaskAttachment[];
  handoverEntries?: HandoverEntry[];
  workspace?: string;
  approvalStatus?: ApprovalStatus;
  completedBy?: TaskPerson;
  approvedBy?: TaskPerson;
  approvedAt?: string;
  rejectionReason?: string;
  rejectionAttachments?: RejectionAttachment[];
  rejectionAttachmentType?: RejectionAttachmentType;
  holdHistory?: HoldHistoryEntry[];
  currentlyOnHold?: boolean;
  referenceLinks?: string[];
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  lastCompletedDate?: string;
  nextDueDate?: string;
  recurringCompletionHistory?: RecurringCompletionHistoryEntry[];
}

export interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  task: string;
  parentComment?: {
    _id: string;
    content: string;
    author: {
      _id: string;
      name: string;
      email: string;
    };
  };
  attachments: TaskAttachment[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  hasReplies?: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

/** Member returned by `/task/project/:id/members`. */
export interface AssignableMember {
  _id: string;
  name: string;
  email?: string;
  role?: string;
}

/** Loosely typed subtask row (the OLD app uses `any[]` for subtasks). */
export interface Subtask {
  _id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  approvalStatus?: ApprovalStatus;
  assignee?: TaskPerson | string;
  startDate?: string;
  dueDate?: string;
}

/** The active user shape used across the screen (`user || currentUser`). */
export interface ActiveUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

/* -------------------------------------------------------------------------- */
/*                       useTaskDetail() return contract                      */
/* -------------------------------------------------------------------------- */

/**
 * The full surface returned by the `useTaskDetail` hook. The orchestrator
 * destructures this and feeds the relevant slices into each sub-section's
 * prop interface (HeaderProps, BodyProps, etc.).
 */
export interface UseTaskDetailReturn {
  /* ----- routing / identity ----- */
  taskId: string | undefined;
  navigate: (path: string) => void;

  /* ----- core data ----- */
  task: Task | null;
  comments: Comment[];
  handoverEntries: HandoverEntry[] | undefined;
  subtasks: Subtask[];
  assignableMembers: AssignableMember[];
  replies: Record<string, Comment[]>;

  /* ----- auth / loading ----- */
  loading: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  activeUser: ActiveUser | null;

  /* ----- realtime ----- */
  socket: Socket | null;

  /* ----- derived permissions / flags ----- */
  isCreator: boolean;
  isAssignee: boolean;
  isAdmin: boolean;
  isProjectHead: boolean;
  isTL: boolean;
  isTLAssignedToParent: boolean;
  canApprove: boolean;
  canPutOnHold: boolean;
  canResume: boolean;
  isTaskLocked: boolean;
  showLockWarning: boolean;
  canCreateSubtask: boolean;
  topLevelComments: Comment[];

  /* ----- comment composer state ----- */
  newComment: string;
  setNewComment: Dispatch<SetStateAction<string>>;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  replyingTo: Comment | null;
  setReplyingTo: Dispatch<SetStateAction<Comment | null>>;
  expandedThreads: Set<string>;
  isSubmitting: boolean;

  /* ----- handover composer state ----- */
  newHandoverContent: string;
  setNewHandoverContent: Dispatch<SetStateAction<string>>;
  handoverSelectedFiles: File[];
  setHandoverSelectedFiles: Dispatch<SetStateAction<File[]>>;
  submittingHandover: boolean;
  handoverEditor: any;
  setHandoverEditor: Dispatch<SetStateAction<any>>;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isUnderlineActive: boolean;

  /* ----- task attachments ----- */
  isUploadingTaskAttachments: boolean;
  taskAttachmentsInputRef: RefObject<HTMLInputElement | null>;

  /* ----- status change ----- */
  isChangingStatus: boolean;

  /* ----- approval / reject dialog state ----- */
  showRejectDialog: boolean;
  setShowRejectDialog: Dispatch<SetStateAction<boolean>>;
  rejectionReason: string;
  setRejectionReason: Dispatch<SetStateAction<string>>;
  isApproving: boolean;
  isRejecting: boolean;
  rejectDueDate: string;
  setRejectDueDate: Dispatch<SetStateAction<string>>;
  rejectReassigneeId: string;
  setRejectReassigneeId: Dispatch<SetStateAction<string>>;
  rejectProjectEnd: Date | null;
  setRejectProjectEnd: Dispatch<SetStateAction<Date | null>>;
  rejectionFiles: File[];
  setRejectionFiles: Dispatch<SetStateAction<File[]>>;
  rejectionLink: string;
  setRejectionLink: Dispatch<SetStateAction<string>>;
  rejectionFileInputRef: RefObject<HTMLInputElement | null>;

  /* ----- reassign dialog state ----- */
  showReassignDialog: boolean;
  setShowReassignDialog: Dispatch<SetStateAction<boolean>>;
  reassignAssigneeId: string;
  setReassignAssigneeId: Dispatch<SetStateAction<string>>;
  reassignDueDate: string;
  setReassignDueDate: Dispatch<SetStateAction<string>>;
  reassignProjectEnd: Date | null;
  setReassignProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isReassigning: boolean;

  /* ----- hold / resume dialog state ----- */
  showHoldDialog: boolean;
  setShowHoldDialog: Dispatch<SetStateAction<boolean>>;
  holdReason: string;
  setHoldReason: Dispatch<SetStateAction<string>>;
  isHolding: boolean;
  showResumeDialog: boolean;
  setShowResumeDialog: Dispatch<SetStateAction<boolean>>;
  resumeNewEndDate: string;
  setResumeNewEndDate: Dispatch<SetStateAction<string>>;
  isResuming: boolean;
  endDateCrossed: boolean;
  setEndDateCrossed: Dispatch<SetStateAction<boolean>>;

  /* ----- create subtask dialog state ----- */
  showCreateSubtask: boolean;
  setShowCreateSubtask: Dispatch<SetStateAction<boolean>>;
  subtaskTitle: string;
  setSubtaskTitle: Dispatch<SetStateAction<string>>;
  subtaskDescription: string;
  setSubtaskDescription: Dispatch<SetStateAction<string>>;
  subtaskAssigneeId: string;
  setSubtaskAssigneeId: Dispatch<SetStateAction<string>>;
  subtaskPriority: TaskPriority;
  setSubtaskPriority: Dispatch<SetStateAction<TaskPriority>>;
  subtaskStartDate: string;
  setSubtaskStartDate: Dispatch<SetStateAction<string>>;
  subtaskEndDate: string;
  setSubtaskEndDate: Dispatch<SetStateAction<string>>;
  subtaskProjectStart: Date | null;
  setSubtaskProjectStart: Dispatch<SetStateAction<Date | null>>;
  subtaskProjectEnd: Date | null;
  setSubtaskProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isCreatingSubtask: boolean;

  /* ----- edit subtask dialog state ----- */
  showEditSubtask: boolean;
  setShowEditSubtask: Dispatch<SetStateAction<boolean>>;
  editingSubtask: Subtask | null;
  setEditingSubtask: Dispatch<SetStateAction<Subtask | null>>;
  editSubtaskTitle: string;
  setEditSubtaskTitle: Dispatch<SetStateAction<string>>;
  editSubtaskDescription: string;
  setEditSubtaskDescription: Dispatch<SetStateAction<string>>;
  editSubtaskAssigneeId: string;
  setEditSubtaskAssigneeId: Dispatch<SetStateAction<string>>;
  editSubtaskPriority: TaskPriority;
  setEditSubtaskPriority: Dispatch<SetStateAction<TaskPriority>>;
  editSubtaskStartDate: string;
  setEditSubtaskStartDate: Dispatch<SetStateAction<string>>;
  editSubtaskEndDate: string;
  setEditSubtaskEndDate: Dispatch<SetStateAction<string>>;
  editSubtaskProjectStart: Date | null;
  setEditSubtaskProjectStart: Dispatch<SetStateAction<Date | null>>;
  editSubtaskProjectEnd: Date | null;
  setEditSubtaskProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isUpdatingSubtask: boolean;

  /* ----- handlers ----- */
  fetchTaskDetails: () => Promise<void>;
  fetchComments: () => Promise<void>;
  fetchSubtasks: () => Promise<void>;
  fetchHandoverEntries: () => Promise<void>;
  handleStatusChange: (newStatus: string) => Promise<void>;
  handleSubmitHandoverEntry: () => Promise<void>;
  handleAddComment: () => Promise<void>;
  handleTaskAttachmentsSelect: (files: FileList | null) => Promise<void>;
  handleEditComment: (commentId: string, content: string) => Promise<void>;
  handleDeleteComment: (commentId: string) => Promise<void>;
  handleToggleExpand: (commentId: string) => void;
  handleLoadReplies: (parentCommentId: string) => Promise<void>;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  handleReassignTask: () => Promise<void>;
  handlePutOnHold: () => Promise<void>;
  handleResume: () => Promise<void>;
  handleCreateSubtask: () => Promise<void>;
  handleUpdateSubtask: () => Promise<void>;

  /* ----- presentational helpers ----- */
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getApprovalStatusColor: (status?: string) => string;
  formatDate: (date: string) => string;
  formatErrorMessageDate: (message: string) => string;
}

/* -------------------------------------------------------------------------- */
/*                        Sub-section prop interfaces                         */
/* -------------------------------------------------------------------------- */

/**
 * HEADER — "Task Overview" card top: title, approval/reassign/status-dropdown
 * action buttons, the blue (#e5efff) project-details card (title, assignee,
 * priority, description, dates, duration, status, approval + rejection
 * reason/attachments), reference links and the task attachments panel.
 *
 * NOTE: `components/task/detail/Header.tsx` (part 2) currently renders only the
 * action-button row and declares its own local `TaskDetailHeaderProps`. This
 * broader `HeaderProps` is the full-card contract for the orchestrator to
 * implement against; the local interface remains a structural subset of it.
 */
export interface HeaderProps {
  task: Task;
  activeUser: ActiveUser | null;
  assignableMembers: AssignableMember[];

  /* permission flags */
  isCreator: boolean;
  isAssignee: boolean;
  isAdmin: boolean;
  isProjectHead: boolean;
  isTL: boolean;
  isTaskLocked: boolean;
  canApprove: boolean;

  /* approval / reject */
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onOpenReject: () => void;

  /* reassign */
  onOpenReassign: () => void;

  /* status dropdown */
  isChangingStatus: boolean;
  isHolding: boolean;
  isResuming: boolean;
  onStatusChange: (value: string) => void;
  onOpenHold: () => void;
  onOpenResume: () => void;
  setEndDateCrossed: (value: boolean) => void;

  /* task attachments upload */
  isUploadingTaskAttachments: boolean;
  taskAttachmentsInputRef: RefObject<HTMLInputElement | null>;
  onTaskAttachmentsSelect: (files: FileList | null) => void;

  /* presentational helpers */
  getStatusIcon: (status: string) => React.ReactNode;
  formatDate: (date: string) => string;
}

/**
 * BODY — Handover Notes panel (#e5efff card): entries list + rich-text
 * composer (bold/italic/underline toolbar, attach, Share) gated to the
 * assignee when the task is unlocked, plus the locked-state message.
 */
export interface BodyProps {
  task: Task;
  handoverEntries: HandoverEntry[] | undefined;
  isAssignee: boolean;
  isTaskLocked: boolean;

  /* composer */
  newHandoverContent: string;
  setNewHandoverContent: Dispatch<SetStateAction<string>>;
  handoverSelectedFiles: File[];
  setHandoverSelectedFiles: Dispatch<SetStateAction<File[]>>;
  submittingHandover: boolean;
  onSubmitHandoverEntry: () => void;

  /* rich-text editor toolbar wiring */
  handoverEditor: any;
  setHandoverEditor: Dispatch<SetStateAction<any>>;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isUnderlineActive: boolean;
}

/**
 * COMMENTS — Discussion card (right column): scrollable chat thread of
 * top-level comments (+ expandable replies) and the comment composer
 * (textarea + FileUpload + Send), plus the locked-state message.
 */
export interface CommentsProps {
  activeUser: ActiveUser | null;
  topLevelComments: Comment[];
  replies: Record<string, Comment[]>;
  expandedThreads: Set<string>;
  isTaskLocked: boolean;

  /* composer */
  newComment: string;
  setNewComment: Dispatch<SetStateAction<string>>;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  replyingTo: Comment | null;
  setReplyingTo: Dispatch<SetStateAction<Comment | null>>;
  isSubmitting: boolean;

  /* handlers */
  onAddComment: () => void;
  onReply: (comment: Comment) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleExpand: (commentId: string) => void;
  onLoadReplies: (commentId: string) => void;
}

/**
 * SUBTASKS — Subtasks card (right column, visible to the TL assigned to the
 * parent): the subtask list (clickable rows + Edit), the "Create Subtask"
 * trigger, and the create/edit subtask dialogs.
 */
export interface SubtasksProps {
  task: Task;
  subtasks: Subtask[];
  assignableMembers: AssignableMember[];
  navigate: (path: string) => void;

  isTLAssignedToParent: boolean;
  canCreateSubtask: boolean;

  /* create dialog */
  showCreateSubtask: boolean;
  setShowCreateSubtask: Dispatch<SetStateAction<boolean>>;
  subtaskTitle: string;
  setSubtaskTitle: Dispatch<SetStateAction<string>>;
  subtaskDescription: string;
  setSubtaskDescription: Dispatch<SetStateAction<string>>;
  subtaskAssigneeId: string;
  setSubtaskAssigneeId: Dispatch<SetStateAction<string>>;
  subtaskPriority: TaskPriority;
  setSubtaskPriority: Dispatch<SetStateAction<TaskPriority>>;
  subtaskStartDate: string;
  setSubtaskStartDate: Dispatch<SetStateAction<string>>;
  subtaskEndDate: string;
  setSubtaskEndDate: Dispatch<SetStateAction<string>>;
  subtaskProjectStart: Date | null;
  setSubtaskProjectStart: Dispatch<SetStateAction<Date | null>>;
  subtaskProjectEnd: Date | null;
  setSubtaskProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isCreatingSubtask: boolean;
  onCreateSubtask: () => void;

  /* edit dialog */
  showEditSubtask: boolean;
  setShowEditSubtask: Dispatch<SetStateAction<boolean>>;
  editingSubtask: Subtask | null;
  setEditingSubtask: Dispatch<SetStateAction<Subtask | null>>;
  editSubtaskTitle: string;
  setEditSubtaskTitle: Dispatch<SetStateAction<string>>;
  editSubtaskDescription: string;
  setEditSubtaskDescription: Dispatch<SetStateAction<string>>;
  editSubtaskAssigneeId: string;
  setEditSubtaskAssigneeId: Dispatch<SetStateAction<string>>;
  editSubtaskPriority: TaskPriority;
  setEditSubtaskPriority: Dispatch<SetStateAction<TaskPriority>>;
  editSubtaskStartDate: string;
  setEditSubtaskStartDate: Dispatch<SetStateAction<string>>;
  editSubtaskEndDate: string;
  setEditSubtaskEndDate: Dispatch<SetStateAction<string>>;
  editSubtaskProjectStart: Date | null;
  setEditSubtaskProjectStart: Dispatch<SetStateAction<Date | null>>;
  editSubtaskProjectEnd: Date | null;
  setEditSubtaskProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isUpdatingSubtask: boolean;
  onUpdateSubtask: () => void;
}

/**
 * ACTIVITY — the recurring-task information block (frequency, next due, last
 * completed, recurs-until + completion history) and the hold/resume history
 * surfaced inside the task overview. Rendered only when the task carries
 * recurring or hold metadata.
 */
export interface ActivityProps {
  task: Task;
  formatDate: (date: string) => string;
}

/**
 * SIDEBAR — the reject / hold / resume / reassign overlay dialogs. These are
 * driven by the dialog state slices on `UseTaskDetailReturn`. Named `SidebarProps`
 * per the orchestrator contract; `DialogsProps` is kept as an alias.
 */
export interface SidebarProps {
  task: Task;
  assignableMembers: AssignableMember[];
  formatDate: (date: string) => string;

  /* reject */
  showRejectDialog: boolean;
  setShowRejectDialog: Dispatch<SetStateAction<boolean>>;
  rejectionReason: string;
  setRejectionReason: Dispatch<SetStateAction<string>>;
  rejectDueDate: string;
  setRejectDueDate: Dispatch<SetStateAction<string>>;
  rejectReassigneeId: string;
  setRejectReassigneeId: Dispatch<SetStateAction<string>>;
  rejectProjectEnd: Date | null;
  setRejectProjectEnd: Dispatch<SetStateAction<Date | null>>;
  rejectionFiles: File[];
  setRejectionFiles: Dispatch<SetStateAction<File[]>>;
  rejectionLink: string;
  setRejectionLink: Dispatch<SetStateAction<string>>;
  rejectionFileInputRef: RefObject<HTMLInputElement | null>;
  isRejecting: boolean;
  onReject: () => void;

  /* reassign */
  showReassignDialog: boolean;
  setShowReassignDialog: Dispatch<SetStateAction<boolean>>;
  reassignAssigneeId: string;
  setReassignAssigneeId: Dispatch<SetStateAction<string>>;
  reassignDueDate: string;
  setReassignDueDate: Dispatch<SetStateAction<string>>;
  reassignProjectEnd: Date | null;
  setReassignProjectEnd: Dispatch<SetStateAction<Date | null>>;
  isReassigning: boolean;
  onReassign: () => void;

  /* hold */
  showHoldDialog: boolean;
  setShowHoldDialog: Dispatch<SetStateAction<boolean>>;
  holdReason: string;
  setHoldReason: Dispatch<SetStateAction<string>>;
  isHolding: boolean;
  onPutOnHold: () => void;

  /* resume */
  showResumeDialog: boolean;
  setShowResumeDialog: Dispatch<SetStateAction<boolean>>;
  resumeNewEndDate: string;
  setResumeNewEndDate: Dispatch<SetStateAction<string>>;
  endDateCrossed: boolean;
  setEndDateCrossed: Dispatch<SetStateAction<boolean>>;
  isResuming: boolean;
  onResume: () => void;
}

/** Alias of {@link SidebarProps} — the overlay dialog surface. */
export type DialogsProps = SidebarProps;
