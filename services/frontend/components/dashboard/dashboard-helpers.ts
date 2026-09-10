// Shared types + helper functions extracted from the old dashboard.tsx
// (old: app/routes/dashboard/dashboard.tsx). UI-agnostic logic only.

// Helper to limit visible words and append ellipsis
export const limitWords = (text: string, maxWords: number) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
};

// Helper to format date for display
export const formatDate = (date: string) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format month and year for display
export const formatMonthYear = (month: number, year: number): string => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${monthNames[month]} ${year}`;
};

// ==================== INTERFACES ====================

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

export interface ProjectStatistics {
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  proposedProjects: number;
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

export interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  projectType?: string;
  department?: {
    name: string;
  };
  categories?: Array<{
    name: string;
    members: Array<{
      userId: {
        _id: string;
        name: string;
        email: string;
      };
      role: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "to-do" | "in-progress" | "done" | "on-hold";
  priority: "low" | "medium" | "high" | "urgent";
  startDate?: string;
  dueDate: string;
  assignedTo?: { _id: string; name: string; email: string };
  project?: { _id: string; title: string };
  creator?: { _id: string; name: string; email: string };
  createdAt: string;
  serialNumber?: number;
}

export interface MonthlyProjectStats {
  planning: number;
  inProgress: number;
  onHold: number;
  completed: number;
  total: number;
}

export interface ApprovalStats {
  pendingApproval: number;
  approved: number;
}

export interface UpdateForm {
  title: string;
  description: string;
  priority: string;
  status: string;
  startDate: string;
  dueDate: string;
}

// Backend (@pms/constants TASK_STATUS) uses snake_case values; the dashboard UI
// (badges, tabs, update <Select>) speaks hyphenated values. Map across the API
// boundary so colors/filters render and updates persist correctly.
const BACKEND_TO_UI_STATUS: Record<string, Task["status"]> = {
  pending: "to-do",
  in_progress: "in-progress",
  completed: "done",
  on_hold: "on-hold",
};

const UI_TO_BACKEND_STATUS: Record<string, string> = {
  "to-do": "pending",
  "in-progress": "in_progress",
  done: "completed",
  "on-hold": "on_hold",
};

/** Normalize a raw backend task status to the UI vocabulary (best-effort). */
export const normalizeTaskStatus = (status: string): Task["status"] =>
  BACKEND_TO_UI_STATUS[status] ?? (status as Task["status"]);

/** Convert a UI task status back to the backend vocabulary for write calls. */
export const toBackendTaskStatus = (status: string): string =>
  UI_TO_BACKEND_STATUS[status] ?? status;
