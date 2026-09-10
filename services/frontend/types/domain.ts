// Domain entity types ported VERBATIM from the OLD React-Router app's inline
// component interfaces (app/components/**, app/routes/**, app/provider/**).
// These mirror the EXACT backend response shapes the OLD app consumed so the
// ported screens keep identical typing. Loose where the old app was loose.

import type { User } from './index';

/* ----------------------------- Workspace ----------------------------- */
export interface WorkspaceMember {
  _id: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  name?: string;
  email?: string;
  role: string; // 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner?: string | User;
  members?: WorkspaceMember[];
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceResponse {
  success?: boolean;
  data?: Workspace[];
  workspaces?: Workspace[];
}

/* ------------------------------ Project ------------------------------ */
export interface ProjectMemberRef {
  _id?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  } | string;
  role?: string;
  reportsTo?: string | null;
}

export interface Project {
  _id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string; // 'Planning' | 'In Progress' | 'Completed' | ...
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  workspace?: string | { _id: string; name: string };
  projectHead?: { _id: string; name: string; email?: string } | string;
  members?: ProjectMemberRef[];
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectResponse {
  success?: boolean;
  data?: Project[];
  projects?: Project[];
}

export interface ProjectMember {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  role: string;
  reportsTo?: string | null;
  joinedAt?: string;
}

/* -------------------------------- Task ------------------------------- */
export interface TaskAssignee {
  _id: string;
  name?: string;
  email?: string;
  profilePicture?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status?: string; // 'to-do' | 'in-progress' | 'done' | 'completed' | ...
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: TaskAssignee;
  assignedTo?: string | TaskAssignee;
  project?: { _id: string; title?: string; status?: string } | string;
  sprint?: string | { _id: string; name: string };
  parentTask?: string | null;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  tags?: string[];
  approvalStatus?: 'approved' | 'rejected' | 'pending-approval' | string;
  rejections?: Array<Record<string, unknown>>;
  isOnHold?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskListResponse {
  success?: boolean;
  tasks?: Task[];
  data?: Task[] | { tasks?: Task[] };
}

export interface Subtask extends Task {
  parentTask: string;
}

export interface SubtaskListResponse {
  subtasks?: Subtask[];
  data?: Subtask[];
}

/* ------------------------------ Comment ------------------------------ */
export interface Comment {
  _id: string;
  content: string;
  author?: {
    _id: string;
    name: string;
    email?: string;
    profilePicture?: string;
  };
  task?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ------------------------------- Sprint ------------------------------ */
export interface Sprint {
  _id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Cancelled';
  durationDays: number;
  calendarDays: number;
  sundaysCount: number;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  project: {
    _id: string;
    title: string;
    status: string;
  };
}

export interface SprintListResponse {
  data?: Sprint[];
  success?: boolean;
}

export interface SprintTasksResponse {
  data: { tasks: Task[] };
}

/* ------------------------------ Meeting ------------------------------ */
export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  duration: number;
  meetingLink?: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
    };
    status: 'pending' | 'accepted' | 'declined';
    responseDate?: string;
  }>;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: string;
}

export interface MeetingListResponse {
  meetings?: Meeting[];
  data?: Meeting[];
}

export type MeetingResponseValue = 'accepted' | 'declined' | 'pending';

/* -------------------------------- Chat ------------------------------- */
export interface ChatParticipant {
  user: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Chat {
  _id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: ChatParticipant[];
  workspace: {
    _id: string;
    name: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
    };
    createdAt: string;
  };
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatListResponse {
  success?: boolean;
  data?: Chat[];
  chats?: Chat[];
}

export interface CreateChatResponse {
  success?: boolean;
  data: Chat;
  existingChat?: boolean;
}

export interface UnreadCountResponse {
  success?: boolean;
  data?: { count: number };
  count?: number;
}

export interface OrganizationUser {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

export interface OrganizationUsersResponse {
  success?: boolean;
  data?: OrganizationUser[];
  users?: OrganizationUser[];
}

/* ------------------------------ Message ------------------------------ */
export interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  chat: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
    };
  };
  attachments: Array<{
    fileName: string;
    originalName?: string;
    fileUrl: string;
    fileType: 'image' | 'document';
    fileSize: number;
    mimeType: string;
  }>;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  isEdited: boolean;
  editedAt?: string;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListResponse {
  success?: boolean;
  data?: Message[];
  messages?: Message[];
}

/* --------------------------- Notification ---------------------------- */
export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sender?: {
    _id: string;
    name: string;
    email: string;
  };
  data: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    meetingId?: string;
    inviteId?: string;
  };
  relatedTask?: string;
  relatedComment?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unreadCount: number;
  };
}

/* ------------------------------ Members ------------------------------ */
export interface Member {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role?: string;
  reportsTo?: string | null;
}

export interface MembersResponse {
  success?: boolean;
  data?: Member[];
  members?: Member[];
}

/* ------------------------------ Invites ------------------------------ */
export interface InviteAcceptResponse {
  success?: boolean;
  message?: string;
  data?: {
    workspaceId?: string;
    workspace?: Workspace;
  };
}

/* ---------------------------- Excel Upload --------------------------- */
export interface ExcelWorkspaceOption {
  _id: string;
  name: string;
}

export interface ExcelProjectOption {
  _id: string;
  title?: string;
  name?: string;
}

export interface ExcelUserOption {
  _id: string;
  name: string;
  email: string;
}

export interface ExcelGenericResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface ExcelParsePreviewResponse {
  success?: boolean;
  data?: {
    rows?: Array<Record<string, unknown>>;
    headers?: string[];
    errors?: string[];
  };
  message?: string;
}

export interface ExcelUploadTasksResponse {
  success?: boolean;
  data?: {
    created?: number;
    failed?: number;
    errors?: string[];
  };
  message?: string;
}
