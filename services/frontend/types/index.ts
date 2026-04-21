export type UserRole = 'user' | 'admin' | 'super_admin';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

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
