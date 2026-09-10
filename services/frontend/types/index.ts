// Shared scalar/enum + form-state types (kept from the NEW scaffold) plus the
// ported OLD `User` shape and re-exports of every domain/analytics type so
// features can import from a single `@/types` entrypoint.

export type UserRole = 'user' | 'admin' | 'super_admin';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

// Ported VERBATIM from OLD app/types/index.ts
export interface User {
  _id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin' | 'super_admin';
  profilePicture?: string;
  isEmailVerified?: boolean;
  currentWorkspace?:
    | string
    | {
        _id: string;
        name: string;
        description?: string;
        createdAt: string;
      };
  workspaces?: Array<{
    workspaceId: string;
    role: string;
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
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
  priority: TaskPriority;
  dueDate: string;
  estimatedHours: number | '';
  tags: string[];
}

export type SidebarState = 'expanded' | 'collapsed';
export type ModalMode = 'create' | 'edit' | 'view';
export type ViewMode = 'table' | 'kanban' | 'list';

export interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Generic API envelope used by some of the ported endpoints.
export interface ApiEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

export * from './domain';
export * from './analytics';
