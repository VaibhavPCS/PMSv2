'use client';

// All dashboard state, data fetching and handlers extracted from the old
// app/routes/dashboard/dashboard.tsx so the page + presentational components
// stay UI-identical and each file stays well under the 1000-LOC limit.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { fetchData, postData, putData, postMultipart, deleteData } from "@/lib/fetch-util";
import { toast } from "sonner";
import type {
  Workspace,
  ProjectStatistics,
  Project,
  Task,
  MonthlyProjectStats,
  ApprovalStats,
  UpdateForm,
} from "@/components/dashboard/dashboard-helpers";
import { normalizeTaskStatus, toBackendTaskStatus } from "@/components/dashboard/dashboard-helpers";

export function useDashboardData() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<ProjectStatistics>({
    totalProjects: 0,
    ongoingProjects: 0,
    completedProjects: 0,
    proposedProjects: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");
  // Calendar state for pie chart filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  // Task Overview month filter (null month = All dates). Filters by task dueDate.
  const [taskMonth, setTaskMonth] = useState<number | null>(null);
  const [taskYear, setTaskYear] = useState(new Date().getFullYear());
  const [showTaskMonthPicker, setShowTaskMonthPicker] = useState(false);
  const [monthlyProjectStats, setMonthlyProjectStats] = useState<MonthlyProjectStats>({
    planning: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
    total: 0,
  });
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [accessibleProjectIds, setAccessibleProjectIds] = useState<Set<string>>(new Set());
  const [approvalStats, setApprovalStats] = useState<ApprovalStats>({
    pendingApproval: 0,
    approved: 0
  });

  // Approval tasks for TL/Lead
  const [approvalTasks, setApprovalTasks] = useState<Task[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalSearchQuery, setApprovalSearchQuery] = useState("");
  const [approvalProjectFilter, setApprovalProjectFilter] = useState("all");
  // Loading states for individual task actions
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);

  // Rejection modal states (copied from task-detail)
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionFiles, setRejectionFiles] = useState<File[]>([]);
  const [rejectionLink, setRejectionLink] = useState("");
  const [rejectDueDate, setRejectDueDate] = useState("");
  const [rejectReassigneeId, setRejectReassigneeId] = useState("");

  const [isRejecting, setIsRejecting] = useState(false);
  const [taskToReject, setTaskToReject] = useState<Task | null>(null);

  // Height synchronization refs
  const projectsTableRef = useRef<HTMLDivElement>(null);
  const taskOverviewRef = useRef<HTMLDivElement>(null);
  const [syncedHeight, setSyncedHeight] = useState<number | null>(null);

  // Task update/delete modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateForm>({
    title: "",
    description: "",
    priority: "",
    status: "",
    startDate: "",
    dueDate: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery) return recentProjects;
    return recentProjects.filter(project =>
      project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()))
    );
  }, [recentProjects, projectSearchQuery]);


  const currentUserId = (user as any)?.id || (user as any)?._id || "";
  const userRole = (user as any)?.role || "";
  const isAdmin = ["admin", "super_admin", "super-admin"].includes(userRole);
  const isLead = userRole === "lead";

  // Get user's role in current workspace
  const getUserWorkspaceRole = useCallback(() => {
    if (!user || !currentWorkspace) return null;
    const workspaceData = (user as any)?.workspaces?.find(
      (w: any) => w.workspaceId?._id === currentWorkspace._id || w.workspaceId === currentWorkspace._id
    );
    return workspaceData?.role || null;
  }, [user, currentWorkspace]);

  const workspaceRole = getUserWorkspaceRole();
  const canSeeApprovalTable = ["lead", "head", "admin", "owner"].includes(workspaceRole || "");

  // ==================== DATA FETCHING ====================

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetchData("/workspace");
      // New backend: { status, data: { data: [...workspaces] } }. Old monolith:
      // { workspaces: [{ workspaceId }], currentWorkspace }. Support both.
      const list: any[] =
        response?.data?.data ??
        (Array.isArray(response?.workspaces)
          ? response.workspaces.map((w: any) => w.workspaceId).filter(Boolean)
          : null) ??
        (Array.isArray(response?.data) ? response.data : null) ??
        (Array.isArray(response) ? response : []);
      setWorkspaces(list);

      // The new API has no "currentWorkspace"; pick the previously-selected one
      // (if still present) else the first. This seeds the workspace-id header
      // that the workspace-scoped endpoints (tasks/all, projects/recent, ...) need.
      const storedId =
        typeof window !== "undefined" ? localStorage.getItem("currentWorkspaceId") : null;
      const current =
        response?.currentWorkspace ||
        list.find((w: any) => (w?._id || w?.id) === storedId) ||
        list[0] ||
        null;
      setCurrentWorkspace(current);
      const cid = current?._id || current?.id;
      if (cid) localStorage.setItem("currentWorkspaceId", cid);
      return cid as string | undefined;
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      toast.error("Failed to load workspaces");
      return undefined;
    }
  }, []);

  const fetchProjectStatistics = useCallback(async (projects?: Project[]) => {
    try {
      const source = projects || accessibleProjects || [];
      const totals = {
        totalProjects: source.length,
        ongoingProjects: source.filter(
          (p: any) => (p?.status || "").toLowerCase() === "in progress" || (p?.status || "").toLowerCase() === "ongoing"
        ).length,
        completedProjects: source.filter((p: any) => (p?.status || "").toLowerCase() === "completed").length,
        proposedProjects: source.filter((p: any) => (p?.status || "").toLowerCase() === "planning").length,
      };
      setProjectStats(totals);
    } catch (error) {
      setProjectStats({
        totalProjects: 0,
        ongoingProjects: 0,
        completedProjects: 0,
        proposedProjects: 0,
      });
    }
  }, [accessibleProjects]);

  const fetchAccessibleProjects = useCallback(async () => {
    try {
      const response = await fetchData("/project/recent?limit=1000&sortBy=startDate");
      const allProjects = response.projects || [];
      let filtered = [];
      // Remove role-based filtering - show all projects to all users
      filtered = allProjects;

      setAccessibleProjects(filtered);
      setAccessibleProjectIds(new Set(filtered.map((p: any) => p._id)));
      return filtered;
    } catch (error) {
      console.error("Error fetching accessible projects:", error);
      setAccessibleProjects([]);
      setAccessibleProjectIds(new Set());
      return [];
    }
  }, [isAdmin, currentUserId]);

  const fetchApprovalStats = useCallback(async () => {
    try {
      const workspaceId = currentWorkspace?._id || localStorage.getItem("currentWorkspaceId");
      const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const response = await fetchData(`/analytics/approval-stats${query}`);
      setApprovalStats(response);
    } catch (error) {
      console.error("Error fetching approval stats:", error);
    }
  }, [currentWorkspace]);

  // Fetch approval tasks for TL/Lead
  const fetchApprovalTasks = useCallback(async () => {
    if (!canSeeApprovalTable) return;

    try {
      setApprovalTasksLoading(true);
      const workspaceId = currentWorkspace?._id || localStorage.getItem("currentWorkspaceId");
      const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const response = await fetchData(`/analytics/approval-tasks${query}`);
      setApprovalTasks(response.tasks || []);
    } catch (error) {
      console.error("Error fetching approval tasks:", error);
      toast.error("Failed to load approval tasks");
    } finally {
      setApprovalTasksLoading(false);
    }
  }, [currentWorkspace, canSeeApprovalTable]);

  // Fetch monthly project statistics for pie chart
  const fetchMonthlyProjectStats = useCallback(async (month: number, year: number, projects?: Project[]) => {
    try {
      const dataset = projects || accessibleProjects || [];
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const projectsInMonth = dataset.filter((project: Project) => {
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);
        return projectStart <= monthEnd && projectEnd >= monthStart;
      });
      const stats = {
        planning: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
        total: projectsInMonth.length,
      };
      projectsInMonth.forEach((project: Project) => {
        const status = project.status.toLowerCase();
        if (status === "planning") {
          stats.planning++;
        } else if (status === "in progress" || status === "ongoing") {
          stats.inProgress++;
        } else if (status === "on hold") {
          stats.onHold++;
        } else if (status === "completed") {
          stats.completed++;
        }
      });
      setMonthlyProjectStats(stats);
    } catch (error) {
      setMonthlyProjectStats({
        planning: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
        total: 0,
      });
    }
  }, [accessibleProjects]);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: "25",
        sortBy: "startDate",
        ...(projectTypeFilter !== "all" && { projectType: projectTypeFilter }),
      });

      const response = await fetchData(`/project/recent?${params}`);
      let projects = response.projects || [];

      if (dateRangeFilter.start || dateRangeFilter.end) {
        projects = projects.filter((project: Project) => {
          const startDate = new Date(project.startDate);
          const filterStartDate = dateRangeFilter.start ? new Date(dateRangeFilter.start) : null;
          const filterEndDate = dateRangeFilter.end ? new Date(dateRangeFilter.end) : null;

          if (filterStartDate && filterEndDate) {
            return startDate >= filterStartDate && startDate <= filterEndDate;
          } else if (filterStartDate) {
            return startDate >= filterStartDate;
          } else if (filterEndDate) {
            return startDate <= filterEndDate;
          }
          return true;
        });
      }

      // Remove role-based filtering - show all projects to all users

      setRecentProjects(projects);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      toast.error("Failed to load recent projects");
      setRecentProjects([]);
    }
  }, [projectTypeFilter, dateRangeFilter, isAdmin, currentUserId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetchData("/workspace/all-tasks");
      let tasksData = response.tasks || [];

      // Remove role-based filtering - show all tasks to all users

      // Normalize backend snake_case status → UI hyphenated values so badges,
      // status tabs and the update <Select> render/filter correctly.
      tasksData = tasksData.map((t: any) => ({
        ...t,
        status: normalizeTaskStatus(t.status),
      }));

      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
      setTasks([]);
    }
  }, [isAdmin, isLead, accessibleProjectIds, currentUserId]);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      setLoading(true);
      await postData("/workspace/switch", { workspaceId });
      // Update localStorage
      localStorage.setItem("currentWorkspaceId", workspaceId);
      // Update current workspace state
      const selectedWorkspace = workspaces.find(w => w._id === workspaceId);
      setCurrentWorkspace(selectedWorkspace || null);

      // Refetch all data that depends on workspace
      const [_, projects] = await Promise.all([
        fetchRecentProjects(),
        fetchAccessibleProjects(),
        fetchTasks(),
        fetchApprovalStats()
      ]);

      // Update stats immediately with the new projects
      if (projects) {
        fetchProjectStatistics(projects);
        fetchMonthlyProjectStats(selectedMonth, selectedYear, projects);
      }
    } catch (error) {
      console.error("Error switching workspace:", error);
      toast.error("Failed to switch workspace");
    } finally {
      setLoading(false);
    }
  };

  // Derive filtered tasks synchronously — no extra render cycle
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((t: any) => t.approvalStatus !== "approved");
    if (taskStatusFilter !== "all") {
      filtered = filtered.filter(task => task.status === taskStatusFilter);
    }
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assignedTo && task.assignedTo.name.toLowerCase().includes(query)) ||
        (task.project && task.project.title.toLowerCase().includes(query))
      );
    }
    if (taskMonth !== null) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return d.getMonth() === taskMonth && d.getFullYear() === taskYear;
      });
    }
    return filtered;
  }, [tasks, taskStatusFilter, taskSearchQuery, taskMonth, taskYear]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setLoading(true);
        // Round 0: resolve the active workspace FIRST so the workspace-id header
        // is set before the workspace-scoped fetches below (else they 400).
        await fetchWorkspaces();
        // Round 1: workspace-scoped fetches in parallel
        const [projects] = await Promise.all([
          fetchAccessibleProjects(),
          fetchRecentProjects(),
          fetchTasks(),
          fetchApprovalStats(),
        ]);
        // Round 2: stats that depend on the projects list
        await Promise.all([
          fetchProjectStatistics(projects),
          fetchMonthlyProjectStats(selectedMonth, selectedYear, projects),
        ]);
        setLoading(false);
      };
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProjectStatistics();
    fetchMonthlyProjectStats(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibleProjects, selectedMonth, selectedYear]);

  // Load approval tasks for TL/Lead
  useEffect(() => {
    if (isAuthenticated && canSeeApprovalTable) {
      fetchApprovalTasks();
    }
  }, [isAuthenticated, canSeeApprovalTable, currentWorkspace, fetchApprovalTasks]);

  // Height synchronization between Projects Table and Task Overview
  useEffect(() => {
    const calculateSyncedHeight = () => {
      if (!projectsTableRef.current || !taskOverviewRef.current) return;

      const projectsCount = Array.isArray(recentProjects) ? recentProjects.length : 0;
      const tasksCount = Array.isArray(filteredTasks) ? filteredTasks.length : 0;

      // Height follows whichever list is SHORTER, so the smaller one shows fully
      // and the larger one scrolls. Once BOTH exceed 10, cap at 10 rows (both wrap/scroll).
      const TABLE_HEADER = 52; // thead + padding
      const ROW = 56;          // approx row height (5 rows ≈ 332px, matching the old value)
      const visibleRows = Math.max(1, Math.min(projectsCount, tasksCount, 10));

      setSyncedHeight(TABLE_HEADER + visibleRows * ROW);
    };

    // Calculate on mount and when data changes
    calculateSyncedHeight();

    // Recalculate on window resize
    window.addEventListener('resize', calculateSyncedHeight);
    return () => window.removeEventListener('resize', calculateSyncedHeight);
  }, [recentProjects, filteredTasks]);

  // ==================== HELPER FUNCTIONS ====================

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  // Handle month change
  const handleMonthChange = async (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthPicker(false);
    await fetchMonthlyProjectStats(month, year);
  };

  // ==================== TASK UPDATE/DELETE HANDLERS ====================

  const handleOpenUpdateModal = (task: Task) => {
    setSelectedTask(task);
    setUpdateForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setShowUpdateModal(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    if (!updateForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      setIsUpdating(true);

      // Check for status transitions related to on-hold
      const isPuttingOnHold = updateForm.status === 'on-hold' && selectedTask.status !== 'on-hold';
      const isResuming = selectedTask.status === 'on-hold' && updateForm.status !== 'on-hold';

      // 1. Update task details (excluding status if hold/resume involved)
      const payload: any = {
        title: updateForm.title,
        description: updateForm.description,
        priority: updateForm.priority,
        startDate: updateForm.startDate,
        dueDate: updateForm.dueDate,
      };

      // Only include status if we are NOT doing a hold/resume transition.
      // Convert UI hyphenated value back to the backend snake_case vocabulary.
      if (!isPuttingOnHold && !isResuming) {
        payload.status = toBackendTaskStatus(updateForm.status);
      }

      await putData(`/task/${selectedTask._id}`, payload);

      // 2. Handle Hold/Resume transitions
      if (isPuttingOnHold) {
        await postData(`/task/${selectedTask._id}/hold`, { reason: "Updated via dashboard" });
      } else if (isResuming) {
        // Note: resumeTask sets status to 'in-progress'.
        await postData(`/task/${selectedTask._id}/resume`, {});
      }

      toast.success("Task updated successfully");
      setShowUpdateModal(false);
      setSelectedTask(null);

      // Refetch tasks to ensure all state (hold history, status flags) is synced
      fetchTasks();
      // Also update project stats as status might have changed
      fetchProjectStatistics();

    } catch (error: any) {
      console.error("Failed to update task:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setIsDeleting(true);
      await deleteData(`/task/${selectedTask._id}`);
      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      setSelectedTask(null);
      setTasks(prev => prev.filter(t => t._id !== (selectedTask as Task)._id));
    } catch (error: any) {
      console.error("Failed to delete task:", error);
      toast.error(error.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle task approval
  const handleApproveTask = async (taskId: string) => {
    setApprovingTaskId(taskId);
    try {
      await postData(`/task/${taskId}/approve`, {});
      toast.success("Task approved successfully");
      fetchApprovalTasks(); // Refresh approval tasks
      fetchApprovalStats(); // Refresh approval stats
    } catch (error: any) {
      console.error("Failed to approve task:", error);
      toast.error(error.message || "Failed to approve task");
    } finally {
      setApprovingTaskId(null);
    }
  };

  // Open rejection modal
  const openRejectModal = (task: Task) => {
    setTaskToReject(task);
    setRejectionReason("");
    setRejectionFiles([]);
    setRejectionLink("");
    setRejectDueDate("");
    setRejectReassigneeId("");
    setShowRejectDialog(true);
  };

  // Handle task rejection from modal
  const handleRejectTask = async () => {
    if (!taskToReject || !rejectionReason.trim() || !rejectDueDate) {
      toast.error("Please provide a rejection reason and new due date");
      return;
    }

    setIsRejecting(true);
    try {
      const hasFile = rejectionFiles.length > 0;
      const hasLink = rejectionLink.trim();

      // Validate link if provided
      if (hasLink) {
        const figmaPattern = /^https?:\/\/(www\.)?figma\.com\//i;
        const githubPattern = /^https?:\/\/(www\.)?github\.com\//i;
        if (!figmaPattern.test(rejectionLink) && !githubPattern.test(rejectionLink)) {
          toast.error("Only Figma and GitHub links are allowed");
          return;
        }
      }

      if (hasFile) {
        const formData = new FormData();
        formData.append("reason", rejectionReason.trim());
        formData.append("newDueDate", rejectDueDate);
        if (rejectReassigneeId) formData.append("reassigneeId", rejectReassigneeId);
        if (hasLink) formData.append("rejectionLink", rejectionLink.trim());
        rejectionFiles.forEach((file) => {
          formData.append("rejectionFiles", file);
        });
        await postMultipart(`/task/${taskToReject._id}/reject`, formData);
      } else {
        await postData(`/task/${taskToReject._id}/reject`, {
          reason: rejectionReason.trim(),
          newDueDate: rejectDueDate,
          reassigneeId: rejectReassigneeId || undefined,
          rejectionLink: hasLink ? rejectionLink.trim() : undefined,
        });
      }

      toast.success("Task rejected successfully");
      setShowRejectDialog(false);
      fetchApprovalTasks(); // Refresh approval tasks
      fetchApprovalStats(); // Refresh approval stats
    } catch (error: any) {
      console.error("Failed to reject task:", error);
      toast.error(error.message || "Failed to reject task");
    } finally {
      setIsRejecting(false);
    }
  };

  return {
    // auth / nav
    isAuthenticated,
    isLoading,
    user,
    router,
    // top-level
    loading,
    projectStats,
    recentProjects,
    workspaces,
    currentWorkspace,
    approvalStats,
    monthlyProjectStats,
    accessibleProjectIds,
    isAdmin,
    canSeeApprovalTable,
    // filters / search
    projectSearchQuery,
    setProjectSearchQuery,
    taskStatusFilter,
    setTaskStatusFilter,
    taskSearchQuery,
    setTaskSearchQuery,
    // month picker
    selectedMonth,
    selectedYear,
    setSelectedYear,
    showMonthPicker,
    setShowMonthPicker,
    handleMonthChange,
    // task overview month filter
    taskMonth,
    setTaskMonth,
    taskYear,
    setTaskYear,
    showTaskMonthPicker,
    setShowTaskMonthPicker,
    // derived data
    filteredProjects,
    filteredTasks,
    // refs / sync
    projectsTableRef,
    taskOverviewRef,
    syncedHeight,
    // approval table
    approvalTasks,
    approvalTasksLoading,
    approvingTaskId,
    rejectingTaskId,
    handleApproveTask,
    openRejectModal,
    // workspace switch
    handleSwitchWorkspace,
    handleViewProject,
    // update / delete modals
    showUpdateModal,
    setShowUpdateModal,
    showDeleteDialog,
    setShowDeleteDialog,
    selectedTask,
    updateForm,
    setUpdateForm,
    isUpdating,
    isDeleting,
    handleOpenUpdateModal,
    handleUpdateTask,
    handleOpenDeleteDialog,
    handleDeleteTask,
    // reject modal
    showRejectDialog,
    setShowRejectDialog,
    rejectionReason,
    setRejectionReason,
    rejectionFiles,
    setRejectionFiles,
    rejectionLink,
    setRejectionLink,
    rejectDueDate,
    setRejectDueDate,
    rejectReassigneeId,
    setRejectReassigneeId,
    isRejecting,
    taskToReject,
    handleRejectTask,
  };
}
