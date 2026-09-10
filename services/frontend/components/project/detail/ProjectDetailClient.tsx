'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { fetchData, postData, deleteData, postMultipart } from "@/lib/fetch-util";
import { buildApiUrl } from "@/lib/config";
import {
  ArrowLeft, Plus, ArrowRight, Search, AlertCircle, Loader2, Target,
  CheckSquare, KanbanSquare, Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { usePermissions } from "@/hooks/use-permissions";
import RemoveProjectMembersModal from "@/components/project/RemoveProjectMembersModal";
import { SprintSetupWarning } from "@/components/project/SprintSetupWarning";
import { FilePreviewModal } from "@/components/project/FilePreviewModal";
import { AttachmentUpload } from "@/components/project/AttachmentUpload";
import { SprintModal } from "@/components/sprint/SprintModal";
import ProjectApprovalMetrics from "@/components/analytics/ProjectApprovalMetrics";
import type { Project, Task, AssignableMember, CurrentUser, FilterType } from "./types";
import { ProjectHeader } from "./ProjectHeader";
import { KanbanBoard } from "./KanbanBoard";
import { CalendarViewComponent } from "./CalendarView";
import { SprintsTab } from "./SprintsTab";
import { CreateTaskModal } from "./CreateTaskModal";
import { TaskCard } from "./TaskCard";

const ProjectDetailClient = () => {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const router = useRouter();
  const navigate = useCallback((path: string) => router.push(path), [router]);
  const { isAuthenticated } = useAuth();
  const permissions = usePermissions();

  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [assignableMembers, setAssignableMembers] = useState<AssignableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [projectRole, setProjectRole] = useState<string>("member");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileKanbanStatus, setMobileKanbanStatus] = useState<"to-do" | "in-progress" | "on-hold" | "done">("to-do");
  const [showMembersModal, setShowMembersModal] = useState(false);

  const [previewAttachment, setPreviewAttachment] = useState<NonNullable<Project['attachments']>[0] | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [filters, setFilters] = useState<FilterType>({ search: "", status: "all", priority: "all", assignee: "all" });

  const [showSprintModal, setShowSprintModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<any>(null);
  const [sprintView, setSprintView] = useState<'list' | 'details' | 'backlog'>('list');
  const [sprintStatus, setSprintStatus] = useState<any>(null);
  const [sprintListRefreshKey, setSprintListRefreshKey] = useState(0);

  const [newTask, setNewTask] = useState({
    title: "", description: "", status: "to-do", priority: "medium", assigneeId: "",
    startDate: "", dueDate: "", sprintId: null as string | null, rejectionAttachmentType: "either",
  });
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(undefined);
  const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
  const [taskReferenceLink, setTaskReferenceLink] = useState("");
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<"daily" | "weekly" | "monthly">("daily");

  const removeTaskAttachment = (index: number) => {
    setTaskAttachments(prev => prev.filter((_, i) => i !== index));
    if (taskFileInputRef.current) {
      taskFileInputRef.current.value = '';
    }
  };

  const isAdmin = useMemo(() => ["admin", "super_admin", "super-admin"].includes(userRole), [userRole]);
  const projectHeadIds = useMemo(() => {
    return [
      ...(project?.projectHeads || []),
      ...(project?.projectHead ? [project.projectHead] : [])
    ]
      .map((head: any) => (head?._id || head)?.toString())
      .filter(Boolean);
  }, [project]);

  const isProjectLead = useMemo(() => {
    const currentId = (currentUser?.id || currentUser?._id || "").toString();
    return !!currentId && projectHeadIds.includes(currentId);
  }, [projectHeadIds, currentUser?.id, currentUser?._id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredUserTasks = useMemo(() => {
    return userTasks.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee = filters.assignee === "all" || task.assignee?._id === filters.assignee;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && (task as any).approvalStatus !== "approved";
    });
  }, [userTasks, filters]);

  const kanbanFilteredTasks = useMemo(() => {
    if (!currentUser) return [];
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      projectHeadIds.includes(currentUserIdStr)
    );

    let tasksToShow = allTasks;
    if (["admin", "super_admin", "super-admin"].includes(currentUser.role || userRole)) {
      tasksToShow = allTasks;
    } else if ((currentUser.role || userRole) === "lead" && isProjectMember) {
      tasksToShow = allTasks;
    } else if (projectHeadIds.includes(currentUserIdStr)) {
      tasksToShow = allTasks;
    } else if (projectRole === 'tl') {
      tasksToShow = allTasks;
    } else {
      tasksToShow = allTasks.filter(
        (task) => task.assignee?._id && (task.assignee._id.toString() === currentUserIdStr)
      );
    }

    return tasksToShow.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee = filters.assignee === "all" || task.assignee?._id === filters.assignee;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [allTasks, filters, userRole, currentUser, project, projectHeadIds, projectRole]);

  const taskStats = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      projectHeadIds.includes(currentUserIdStr)
    );

    const relevantTasks = ["admin", "super_admin", "super-admin"].includes(userRole)
      ? allTasks
      : ((userRole === "lead" && isProjectMember) || projectHeadIds.includes(currentUserIdStr))
        ? kanbanFilteredTasks
        : userTasks;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: relevantTasks.length,
      completed: relevantTasks.filter((t) => t.status === "done").length,
      inProgress: relevantTasks.filter((t) => t.status === "in-progress").length,
      overdue: relevantTasks.filter((t) => new Date(t.dueDate) < today && t.status !== "done").length,
    };
  }, [allTasks, userTasks, kanbanFilteredTasks, userRole, currentUser, project, projectHeadIds]);

  const canViewKanban = useMemo(() => {
    if (!currentUser || !project) return false;
    if (["admin", "super_admin", "super-admin"].includes(currentUser.role || userRole)) return true;
    if (project?.creator?._id === (currentUser.id || currentUser._id)) return true;
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    return !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      projectHeadIds.includes(currentUserIdStr)
    );
  }, [userRole, project, currentUser, projectHeadIds]);

  const canCreateTask = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      projectHeadIds.includes(currentUserIdStr)
    );
    return (
      ["admin", "super_admin", "super-admin"].includes(userRole) ||
      isProjectMember ||
      project?.creator._id === currentUser?._id
    );
  }, [userRole, project, currentUser, projectHeadIds]);

  const projectMemberIds = useMemo(() => {
    const ids = new Set<string>();
    project?.members?.forEach((member) => {
      const id = member.userId?._id?.toString() || "";
      if (id) ids.add(id);
    });
    projectHeadIds.forEach((id) => ids.add(id));
    return ids;
  }, [project, projectHeadIds]);

  const filteredAssignableMembers = useMemo(() => {
    return assignableMembers.filter((m) => m && projectMemberIds.has(m._id?.toString() || ""));
  }, [assignableMembers, projectMemberIds]);

  const updateFilter = useCallback((key: keyof FilterType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", priority: "all", assignee: "all" });
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetchData("/auth/me");
      const user = response?.data ?? response?.user;
      setUserRole(user.role);
      setCurrentUser({
        id: user.id, _id: user.id,
        name: user.name, email: user.email, role: user.role,
      });
    } catch {
      toast.error("Failed to load user data");
    }
  }, []);

  const fetchProjectDetails = useCallback(async () => {
    try {
      if (!projectId) {
        setLoading(false);
        return;
      }
      const response = await fetchData(`/project/${projectId}`);
      setProject(response?.data ?? response?.project ?? response);
    } catch (error) {
      toast.error("Project not found");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchAllTasks = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}`);
      setAllTasks(response.tasks || []);
    } catch (error) {
      console.error("Failed to load all tasks:", error);
      toast.error("Failed to load tasks");
    }
  }, [projectId]);

  const fetchUserTasks = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}/user`);
      setUserTasks(response.tasks || []);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
      toast.error("Failed to load your tasks");
    }
  }, [projectId]);

  const fetchAssignableMembers = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}/members`);
      setAssignableMembers((response.members || []).filter((m: any) => m));
    } catch {
      toast.error("Failed to load employees");
    }
  }, [projectId]);

  const fetchSprintStatus = useCallback(async () => {
    try {
      const response = await fetchData(`/sprint/project/${projectId}/status`);
      setSprintStatus(response.data);
    } catch (error) {
      console.error("Failed to load sprint status:", error);
    }
  }, [projectId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = allTasks.find((t) => t._id === event.active.id);
    setActiveTask(task || null);
  }, [allTasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return setActiveTask(null);

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = allTasks.find((t) => t._id === taskId);

    if (!task || (task as any).approvalStatus === "approved" || task.status === newStatus || !["to-do", "in-progress", "done"].includes(newStatus)) {
      return setActiveTask(null);
    }

    try {
      if (newStatus === 'done') {
        const resp = await fetch(
          buildApiUrl(`/task/${taskId}/subtasks`),
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'workspace-id': localStorage.getItem('currentWorkspaceId') || ''
            }
          }
        );
        if (resp.ok) {
          const data = await resp.json();
          const list = Array.isArray(data?.subtasks) ? data.subtasks : [];
          const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
          if (hasBlocking) {
            toast.error('Complete and approve all subtasks before marking Done');
            setActiveTask(null);
            return;
          }
        }
      }
      setAllTasks((tasks) =>
        tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus as any } : t))
      );
      await postData(`/task/${taskId}/status`, { status: newStatus });
      toast.success("Task updated");
      await Promise.all([fetchAllTasks(), fetchUserTasks()]);
    } catch {
      toast.error("Update failed");
      fetchAllTasks();
    }
    setActiveTask(null);
  }, [allTasks, fetchAllTasks, fetchUserTasks]);

  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.startDate || !newTask.dueDate || !newTask.sprintId) {
      return toast.error("Please fill all required fields (title, start date, due date, sprint)");
    }

    const start = new Date(newTask.startDate);
    const end = new Date(newTask.dueDate);
    const projectStart = project ? new Date(project.startDate) : new Date();
    projectStart.setHours(0, 0, 0, 0);
    if (start < projectStart || end < projectStart) {
      return toast.error("Task dates must be on or after the project start date");
    }
    if (start > end) {
      return toast.error("Start date cannot be after due date");
    }
    const projectEnd = project ? new Date(project.endDate) : undefined;
    if (projectEnd) projectEnd.setHours(0, 0, 0, 0);
    if (projectEnd && end > projectEnd) {
      return toast.error("Due date cannot be after project end date");
    }

    if (taskReferenceLink.trim()) {
      const figmaPattern = /^https?:\/\/(www\.)?figma\.com\//i;
      const githubPattern = /^https?:\/\/(www\.)?github\.com\//i;
      if (!figmaPattern.test(taskReferenceLink) && !githubPattern.test(taskReferenceLink)) {
        return toast.error("Only Figma and GitHub links are allowed");
      }
    }

    try {
      setSubmittingTask(true);

      if (taskAttachments.length > 0 || taskReferenceLink.trim()) {
        const formData = new FormData();
        formData.append("title", newTask.title);
        formData.append("description", newTask.description);
        formData.append("status", newTask.status);
        formData.append("priority", newTask.priority);
        if (newTask.assigneeId) {
          formData.append("assigneeId", newTask.assigneeId);
        }
        formData.append("startDate", newTask.startDate);
        formData.append("dueDate", newTask.dueDate);
        formData.append("projectId", projectId || "");
        formData.append("rejectionAttachmentType", newTask.rejectionAttachmentType);

        if (taskReferenceLink.trim()) {
          formData.append("referenceLinks", JSON.stringify([taskReferenceLink.trim()]));
        }

        formData.append("isRecurring", isRecurring.toString());
        if (isRecurring) {
          formData.append("recurringFrequency", recurringFrequency);
          formData.append("recurringEndDate", project?.endDate || "");
        }

        taskAttachments.forEach((file) => {
          formData.append("attachments", file);
        });

        await postMultipart("/task", formData);
      } else {
        const payload: any = { ...newTask, projectId };
        if (!newTask.assigneeId) {
          delete payload.assigneeId;
        }
        if (taskReferenceLink.trim()) {
          payload.referenceLinks = [taskReferenceLink.trim()];
        }
        payload.isRecurring = isRecurring;
        if (isRecurring) {
          payload.recurringFrequency = recurringFrequency;
          payload.recurringEndDate = project?.endDate || "";
        }
        await postData("/task", payload);
      }

      setShowTaskModal(false);
      setNewTask({
        title: "", description: "", status: "to-do", priority: "medium", assigneeId: "",
        startDate: "", dueDate: "", sprintId: null, rejectionAttachmentType: "either",
      });
      setStartDateObj(undefined);
      setDueDateObj(undefined);
      setTaskAttachments([]);
      setTaskReferenceLink("");
      setIsRecurring(false);
      setRecurringFrequency("daily");
      if (taskFileInputRef.current) {
        taskFileInputRef.current.value = '';
      }
      await Promise.all([fetchAllTasks(), fetchUserTasks()]);
      toast.success("Task created!");
    } catch (error: any) {
      let errorMessage = "Failed to create task";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error && typeof error === 'object' && 'response' in error && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setSubmittingTask(false);
    }
  }, [newTask, projectId, fetchAllTasks, fetchUserTasks, project, taskAttachments, taskReferenceLink, isRecurring, recurringFrequency]);

  const handleCreateSprint = useCallback(async (sprintData: any) => {
    try {
      if (selectedSprint?._id) {
        await fetchData; // no-op placeholder to preserve import order safety
        await postData(`/sprint/${selectedSprint._id}`, sprintData).catch(async () => {
          // edit goes through PUT in the OLD app
        });
        await (await import('@/lib/fetch-util')).putData(`/sprint/${selectedSprint._id}`, sprintData);
        toast.success('Sprint updated successfully');
      } else {
        await postData('/sprint', sprintData);
        toast.success('Sprint created successfully');
      }
      setShowSprintModal(false);
      setSelectedSprint(null);
      fetchSprintStatus();
      setSprintListRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save sprint');
      throw error;
    }
  }, [selectedSprint, fetchSprintStatus]);

  useEffect(() => {
    if (isAuthenticated && projectId) {
      Promise.all([
        fetchUserRole(),
        fetchProjectDetails(),
        fetchAllTasks(),
        fetchUserTasks(),
        fetchAssignableMembers(),
        fetchSprintStatus(),
        (async () => { try { const res = await fetchData(`/project/${projectId}/role`); setProjectRole(res.projectRole || 'member'); } catch { } })(),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, projectId]);

  useEffect(() => {
    if (isRecurring && project?.endDate) {
      const projectEndDate = new Date(project.endDate);
      setDueDateObj(projectEndDate);
      setNewTask(prev => ({ ...prev, dueDate: projectEndDate.toISOString() }));
    }
  }, [isRecurring, project?.endDate]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <CardTitle className="text-base mb-2">Project Not Found</CardTitle>
            <p className="text-sm text-gray-600 mb-4">No access to this project.</p>
            <Button onClick={() => navigate("/projects")} size="sm" className="h-8">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeader
        project={project}
        taskStats={taskStats}
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        isAdmin={isAdmin}
        isProjectLead={isProjectLead}
        permissionsIsAdmin={permissions.isAdmin}
        onOpenMembers={() => setShowMembersModal(true)}
        onInviteSuccess={async () => {
          await Promise.all([fetchProjectDetails(), fetchAssignableMembers()]);
        }}
        onDeleteAttachment={async (id) => {
          try {
            await deleteData(`/projects/${project._id}/attachments/${id}`);
            toast.success('Attachment deleted successfully');
            fetchProjectDetails();
          } catch (error: any) {
            toast.error(error.message || 'Failed to delete attachment');
          }
        }}
        onPreviewAttachment={(file) => setPreviewAttachment(file)}
        onUploadClick={() => setShowUploadDialog(true)}
      />

      {sprintStatus?.needsSetup && (
        <div className="hidden md:block bg-white px-4">
          <SprintSetupWarning
            projectId={projectId}
            taskCount={sprintStatus.backlogTaskCount || sprintStatus.taskCount}
            onCreateSprint={() => {
              setSelectedSprint(null);
              setShowSprintModal(true);
            }}
            onDismiss={() => setSprintStatus({ ...sprintStatus, needsSetup: false })}
          />
        </div>
      )}

      <RemoveProjectMembersModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        projectId={project._id}
        projectHead={project.projectHead || null}
        projectHeads={project.projectHeads || []}
        members={project.members || []}
        userRole={userRole}
        currentUserId={(currentUser?.id || currentUser?._id || '').toString()}
        onRemoveSuccess={async () => {
          await Promise.all([fetchProjectDetails(), fetchAssignableMembers()]);
        }}
      />

      <div className="flex-1">
        <div className={cn("p-3", !isMobile && "p-4")}>
          <Tabs defaultValue="your-tasks" className="space-y-4">
            <div className="sticky top-0 bg-gray-50 pb-3 z-30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="grid w-full grid-cols-4 h-8 sm:max-w-md mx-auto">
                  <TabsTrigger value="your-tasks" className="text-xs px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Your</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="text-xs px-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <KanbanSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Board</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="text-xs px-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Calendar</span>
                  </TabsTrigger>
                  <TabsTrigger value="sprints" className="text-xs px-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                    <Target className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Sprints</span>
                  </TabsTrigger>
                </TabsList>
                {(isAdmin || isProjectLead) && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
                    <Button
                      onClick={() => setShowTaskModal(true)}
                      size="sm"
                      className="h-8 w-full sm:w-auto bg-[#f2761b] hover:bg-[#f2761b]/90 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create Task
                    </Button>
                    <Button
                      onClick={() => setShowSprintModal(true)}
                      size="sm"
                      className="h-8 w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Create Sprint
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <TabsContent value="your-tasks" className="space-y-3 mt-0">
              <div className="hidden md:block">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      className="pl-9 h-10 text-sm border-gray-200 focus:border-gray-300"
                      value={filters.search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
                    />
                  </div>
                  <Select value={filters.status} onValueChange={(value: string) => updateFilter("status", value)}>
                    <SelectTrigger className="w-[140px] h-10 text-sm border-gray-200">
                      <SelectValue placeholder="Task Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.priority} onValueChange={(value: string) => updateFilter("priority", value)}>
                    <SelectTrigger className="w-[120px] h-10 text-sm border-gray-200">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="h-10 px-3 text-sm border-gray-200">
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {filteredUserTasks.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200 bg-white">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <CheckSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold mb-2 text-gray-900">No Task Found</CardTitle>
                    <p className="text-sm text-gray-500 mb-4">
                      {filters.search || filters.status !== "all" || filters.priority !== "all"
                        ? "Try adjusting your filters"
                        : "No task assigned yet"}
                    </p>
                    {(isAdmin || isProjectLead) && (
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => setShowTaskModal(true)} className="bg-[#f2761b] hover:bg-[#f2761b]/90 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Task
                        </Button>
                        <Button onClick={() => setShowSprintModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
                          Create Sprint
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className={cn("grid gap-3 pb-16 md:pb-4", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
                  {filteredUserTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      compact={true}
                      onClick={() => navigate(`/task/${task._id}`)}
                      currentUser={currentUser}
                      project={project}
                      userRole={userRole}
                      onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              {!canViewKanban ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <CardTitle className="text-base mb-2">Access Restricted</CardTitle>
                    <p className="text-sm text-gray-600">
                      {currentUser ? "You are not an employee of this project." : "Loading user data..."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <KanbanBoard
                  kanbanFilteredTasks={kanbanFilteredTasks}
                  filters={filters}
                  updateFilter={updateFilter}
                  clearFilters={clearFilters}
                  isMobile={isMobile}
                  isAdmin={isAdmin}
                  isProjectLead={isProjectLead}
                  projectRole={projectRole}
                  project={project}
                  mobileKanbanStatus={mobileKanbanStatus}
                  setMobileKanbanStatus={setMobileKanbanStatus}
                  sensors={sensors}
                  activeTask={activeTask}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  currentUser={currentUser}
                  userRole={userRole}
                  onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                  filteredAssignableMembers={filteredAssignableMembers}
                />
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              {!canViewKanban ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <CardTitle className="text-base mb-2">Access Restricted</CardTitle>
                    <p className="text-sm text-gray-600">
                      {currentUser ? "You are not an employee of this project." : "Loading user data..."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <CalendarViewComponent
                  tasks={kanbanFilteredTasks.filter((t) => (t as any).approvalStatus !== "approved")}
                  filters={filters}
                  updateFilter={updateFilter}
                  clearFilters={clearFilters}
                  isMobile={isMobile}
                  navigate={navigate}
                  userRole={userRole}
                  currentUser={currentUser}
                  project={project}
                />
              )}
            </TabsContent>

            <TabsContent value="sprints" className="mt-0 space-y-4">
              <SprintsTab
                projectId={projectId}
                sprintView={sprintView}
                setSprintView={setSprintView}
                selectedSprint={selectedSprint}
                setSelectedSprint={setSelectedSprint}
                sprintListRefreshKey={sprintListRefreshKey}
                setSprintListRefreshKey={setSprintListRefreshKey}
                fetchSprintStatus={fetchSprintStatus}
                setShowSprintModal={setShowSprintModal}
                isAdmin={isAdmin}
                isProjectLead={isProjectLead}
                projectRole={projectRole}
                currentUser={currentUser}
                navigate={navigate}
              />
            </TabsContent>

            <div className="mt-4">
              {project && <ProjectApprovalMetrics projectId={project._id} />}
            </div>
          </Tabs>
        </div>
      </div>

      {isMobile && canCreateTask && (
        <Button
          onClick={() => setShowTaskModal(true)}
          className="fixed bottom-4 right-4 w-11 h-11 rounded-full shadow-lg z-30 p-0 bg-[#f2761b] hover:bg-[#f2761b]/90"
        >
          <Plus className="w-5 h-5" />
        </Button>
      )}

      <SprintModal
        isOpen={showSprintModal}
        onClose={() => {
          setShowSprintModal(false);
          setSelectedSprint(null);
        }}
        onSubmit={handleCreateSprint}
        projectId={projectId}
        sprint={selectedSprint}
        mode={selectedSprint ? 'edit' : 'create'}
      />

      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        isMobile={isMobile}
        project={project}
        projectId={projectId}
        newTask={newTask}
        setNewTask={setNewTask}
        startDateObj={startDateObj}
        setStartDateObj={setStartDateObj}
        dueDateObj={dueDateObj}
        setDueDateObj={setDueDateObj}
        taskAttachments={taskAttachments}
        setTaskAttachments={setTaskAttachments}
        removeTaskAttachment={removeTaskAttachment}
        taskReferenceLink={taskReferenceLink}
        setTaskReferenceLink={setTaskReferenceLink}
        taskFileInputRef={taskFileInputRef}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        recurringFrequency={recurringFrequency}
        setRecurringFrequency={setRecurringFrequency}
        submittingTask={submittingTask}
        filteredAssignableMembers={filteredAssignableMembers}
        onSubmit={handleCreateTask}
      />

      <FilePreviewModal
        attachment={previewAttachment}
        open={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold font-['Inter']">
              Upload Attachments
            </DialogTitle>
            <DialogDescription className="text-[14px] text-gray-500 font-['Inter'] mt-1">
              Upload files to this project (max 10 total)
            </DialogDescription>
          </DialogHeader>

          <AttachmentUpload
            projectId={project?._id || ''}
            currentAttachmentCount={project?.attachments?.length || 0}
            onUploadSuccess={() => {
              fetchProjectDetails();
              setShowUploadDialog(false);
              toast.success('Attachments uploaded successfully');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetailClient;
