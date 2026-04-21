export type UserRole = 'user' | 'admin' | 'super_admin';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface User {
  _id: string;
  email: string;
  name: string;
  role?: UserRole;
  profilePicture?: string;
  isEmailVerified?: boolean;
  currentWorkspace?: string | WorkspaceSummary;
  workspaces?: WorkspaceMembership[];
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceSummary {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: User | null;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  userId: User | null;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  workspace: string | WorkspaceSummary;
  createdBy: User | null;
  members: ProjectMember[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectMember {
  userId: User | null;
  role: 'lead' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: string | Project;
  assignee?: User | null;
  createdBy: User | null;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  tags?: string[];
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedBy: User | null;
  uploadedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  status: MeetingStatus;
  workspace: string | WorkspaceSummary;
  project?: string | Project;
  scheduledAt: string;
  duration?: number;
  attendees: User[];
  createdBy: User | null;
  createdAt: string;
  updatedAt?: string;
  meetingLink?: string;
}

export interface Message {
  _id: string;
  content: string;
  sender: User | null;
  workspace: string | WorkspaceSummary;
  channel?: string;
  attachments?: Attachment[];
  readBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface Invite {
  _id: string;
  email: string;
  workspace: string | WorkspaceSummary;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
}

export interface ProjectAnalytics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  memberContributions: MemberContribution[];
}

export interface MemberContribution {
  userId: User | null;
  totalTasks: number;
  completedTasks: number;
  tasksCompleted: number;
  hoursLogged: number;
}

export interface WorkspaceAnalytics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalMembers: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  _id: string;
  type: 'task_created' | 'task_completed' | 'project_created' | 'member_joined' | 'comment_added';
  actor: User | null;
  target?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateProjectFormState {
  name: string;
  description: string;
  workspaceId: string;
  startDate: string;
  endDate: string;
}

export interface CreateTaskFormState {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  priority: TaskPriority;   // ← exact union type
  dueDate: string;
  estimatedHours: number | '';
  tags: string[];
}

export type SidebarState = 'expanded' | 'collapsed';
export type ModalMode = 'create' | 'edit' | 'view';
export type ViewMode = 'table' | 'kanban' | 'list';