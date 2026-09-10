// Shared types + constants for the Report Screen (project analytics report)
// Ported from OLD app/routes/administration/project-management/report-screen.tsx.

export interface Workspace {
  _id: string;
  name: string;
}

export interface Project {
  _id: string;
  title: string;
  status: string;
}

export interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Attachment {
  originalName: string;
  filename: string;
  path: string;
  mimetype?: string;
  size?: number;
}

export interface TaskData {
  _id: string;
  originalTaskId?: string;
  title: string;
  description: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  approvalStatus: string;
  startDate: string;
  dueDate: string;
  completedAt?: string;
  durationDays: number;
  assignee?: Member;
  handoverNotes?: string;
  handoverAttachments?: Attachment[];
  handoverEntries?: any[];
  isRecurring?: boolean;
  rejections?: any[];
}

export interface ReportData {
  range: { start: string; end: string };
  totalTasks: number;
  statusBreakdown: {
    todo: number;
    inProgress: number;
    onHold: number;
    approved: number;
    notApproved: number;
    rejected: number;
  };
  memberPerformance: Record<string, {
    name: string;
    totalAssigned: number;
    completed: number;
    reworks: number;
    onTime: number;
  }>;
  tasks: TaskData[];
}

export const COLORS = {
  todo: '#94a3b8',       // Slate 400
  inProgress: '#3b82f6', // Blue 500
  onHold: '#f59e0b',     // Amber 500
  approved: '#22c55e',   // Green 500
  notApproved: '#ef4444',// Red 500
  rejected: '#dc2626'    // Red 600
};
