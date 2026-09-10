// Shared types + helpers for the meetings/task calendar. Ported VERBATIM from
// OLD app/routes/administration/calendar.tsx (split out to keep every file
// under the 1,000 LOC limit).

import { isSameDay } from 'date-fns';

export interface CalendarTask {
  _id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'to-do' | 'in-progress' | 'done' | 'on-hold';
  approvalStatus?: 'not-required' | 'pending-approval' | 'approved' | 'rejected';
  dueDate: string;
  startDate?: string;
  project: {
    _id: string;
    title: string;
  };
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  completedAt?: string;
  startedAt?: string;
  isActive?: boolean;
  holdHistory?: {
    putOnHoldBy: {
      _id: string;
      name: string;
      email: string;
    };
    putOnHoldAt: string;
    reason?: string;
  }[];
}

export interface CalendarWorkspace {
  _id: string;
  workspaceId: {
    _id: string;
    name: string;
    description: string;
  };
  role: string;
  joinedAt: string;
}

export type ViewMode = 'month' | 'week' | 'day';

export const statusColors = {
  'to-do': {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    ring: 'ring-blue-100',
    text: 'text-blue-700',
  },
  'in-progress': {
    bg: 'bg-yellow-500',
    border: 'border-yellow-500',
    ring: 'ring-yellow-100',
    text: 'text-yellow-700',
  },
  'done': {
    bg: 'bg-green-500',
    border: 'border-green-500',
    ring: 'ring-green-100',
    text: 'text-green-700',
  },
  'on-hold': {
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    ring: 'ring-purple-100',
    text: 'text-purple-700',
  },
  'overdue': {
    bg: 'bg-red-500',
    border: 'border-red-500',
    ring: 'ring-red-100',
    text: 'text-red-700',
  },
} as const;

export const dayFilterOptions = [
  { key: 'on-hold', label: 'On Hold' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'to-do', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done-unapproved', label: 'Done' },
];

// Check if task spans multiple days
export const isMultiDayTask = (task: CalendarTask) => {
  if (!task.startDate) return false;
  const start = new Date(task.startDate);
  const end = new Date(task.dueDate);
  return end.getTime() - start.getTime() > 24 * 60 * 60 * 1000;
};

// Get multi-day task indicator
export const getMultiDayIndicator = (task: CalendarTask, date: Date) => {
  if (!task.startDate) return null;
  const start = new Date(task.startDate);
  const end = new Date(task.dueDate);
  const isStart = isSameDay(start, date);
  const isEnd = isSameDay(end, date);
  const isMiddle = date > start && date < end;

  if (isStart) return { symbol: '▶', color: 'text-green-600' };
  if (isEnd) return { symbol: '◀', color: 'text-purple-600' };
  if (isMiddle) return { symbol: '─', color: 'text-blue-600' };
  return null;
};
