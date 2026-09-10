export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "on-hold" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: { _id: string; name: string; email: string } | null;
  creator: { _id: string; name: string; email: string };
  category: string;
  startDate: string;
  dueDate: string;
  durationDays?: number;
  createdAt: string;
  sprint?: { _id: string; name?: string } | string | null;
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

export interface Project {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  projectHead?: { _id: string; name: string; email: string };
  projectHeads?: Array<{ _id: string; name: string; email: string }>;
  // ✅ UPDATED: New project structure uses a flat members array
  members?: Array<{
    userId: { _id: string; name: string; email: string };
  }>;
  creator: { _id: string; name: string; email: string };
  attachments?: Array<{
    _id: string;
    filename: string;
    originalName: string;
    size?: number;
    mimeType?: string;
    path: string;
  }>;
}

export interface AssignableMember {
  _id: string;
  name: string;
  email: string;
  category: string;
  role: string;
}

export interface FilterType {
  search: string;
  status: "all" | "to-do" | "in-progress" | "on-hold" | "done";
  priority: "all" | "low" | "medium" | "high" | "urgent";
  assignee: string; // "all" or user ID
}

export interface CurrentUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}
