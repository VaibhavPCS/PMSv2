// Analytics types ported VERBATIM from OLD app/features/analytics/types/index.ts.

/* ==================== API Response Types ==================== */

export interface Workload {
  userId: string;
  userName: string;
  openTaskCount: number;
}

export interface ActiveProject {
  projectId: string;
  projectName: string;
}

export interface WorkspaceSummary {
  workspaceId: string;
  overallCompletionRate: number;
  activeProjects: ActiveProject[];
  workloadDistribution: Workload[];
  lastUpdatedAt: string;
}

export interface ProjectHead {
  userId: string;
  userName: string;
}

export interface ProjectLeaderboardEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectHead: ProjectHead;
  status: 'On Track' | 'At Risk' | 'Off Track' | 'Completed';
  completionPercentage: number;
  dueDate: string;
  lastUpdatedAt: string;
}

export interface VelocityDataPoint {
  date: string; // YYYY-MM-DD
  tasksCreated: number;
  tasksCompleted: number;
}

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageDuration: number;
  velocity: {
    weekly: number;
    monthly: number;
    timeSeries: VelocityDataPoint[];
  };
  overdueTasks: number;
  overduePercentage: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  completionTimeByPriority: Record<string, number>;
}

export interface ProjectAnalyticsResponse {
  analytics: {
    overall: ProjectAnalytics;
    categories: Record<string, any>;
  };
  project: Record<string, any>;
  totalTasks: number;
}

export interface UserProductivityStats {
  openTaskCount: number;
  tasksDueNext7Days: TaskDueNext7Days[];
  tasksCompletedLast7Days: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

/* ==================== Hook Parameters ==================== */

export interface ProjectAnalyticsParams {
  projectId: string;
  startDate?: string;
  endDate?: string;
}

export interface LeaderboardResponse {
  leaderboard: ProjectLeaderboardEntry[];
  totalProjects: number;
  lastUpdated: string | null;
  workspaceRole: string;
  workspaceId: string;
}

export interface TaskDueNext7Days {
  _id: string;
  title: string;
  dueDate: Date | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'to-do' | 'in-progress' | 'done';
  projectTitle?: string;
}

/* ==================== Employee / Performance ==================== */

export interface EmployeeListItem {
  _id?: string;
  userId?: string;
  userName?: string;
  latestMetrics?: Record<string, any>;
  [key: string]: any;
}

export interface EmployeeListResponse {
  employees: EmployeeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface EmployeePerformanceResponse {
  snapshots: Array<Record<string, any>>;
}

export interface TimelineEvent {
  eventType: string;
  actor: { _id: string; name?: string; email?: string };
  timestamp: string;
  changes?: { field?: string; oldValue?: any; newValue?: any };
  metadata?: Record<string, any>;
}

export interface LifecycleResponse {
  taskId: string;
  taskTitle: string;
  timeline: TimelineEvent[];
  metrics: {
    totalDuration: number;
    workingDuration: number;
    rejectionCount: number;
    approvalAttempts: number;
    reassignments: number;
  };
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

/* ==================== Report Data ==================== */

export interface ReportData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    profilePicture: string | null;
  };
  dateRange: {
    start: string;
    end: string;
    days: number;
    displayText: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  timing: {
    avgTimeToComplete: number;
    fastestCompletion: string | null;
    slowestCompletion: string | null;
    onTimeRate: number;
    tasksPerDay: number;
  };
  weekly: Array<{
    week: number;
    startDate: string;
    endDate: string;
    completed: number;
    percentage: number;
    onTime: number;
  }>;
  performanceScore: {
    overallScore: number;
    grade: string;
    status: string;
    components: {
      completion: number;
      onTime: number;
      diversity: number;
      consistency: number;
    };
  };
  completedTasks: Array<{
    id: string;
    title: string;
    project: string;
    completedAt: string;
    priority: string;
    daysToComplete: number;
  }>;
  openTasks: Array<{
    id: string;
    title: string;
    project: string;
    dueDate: string;
    priority: string;
    status: string;
    daysUntilDue: number;
    isOverdue: boolean;
  }>;
  projects: Array<{
    projectName: string;
    assigned: number;
    completed: number;
    completionRate: number;
    onTimeRate: number;
    contribution: number;
  }>;
  comparison: Array<{
    metric: string;
    yourScore: string | number;
    teamAverage: string | number;
    better: boolean;
    gap: string;
  }>;
  peakDay: string;
  peakDayCount: number;
  consistency: number;
  productivityTrend: string;
  efficiencyMetrics: {
    avgDaysToComplete: string;
    fastestCompletion: string;
    slowestCompletion: string;
    peakDay: string;
    peakDayCount: number;
    tasksPerDay: string;
    productivityTrend: string;
  };
}
