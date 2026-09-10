'use client';

// "My Tasks" full-page list/board (Next.js App Router). The OLD app shipped a
// placeholder route (app/routes/tasks/tasks.tsx -> "My Tasks"); the only real
// task-list UI lived in the dashboard Task Overview panel. This view reuses
// that exact task-card visual language (status rail, assignee avatar, status
// pill, admin 3-dot menu) and lifts it into a dedicated, responsive page with
// search + status tabs, backed by GET /workspace/all-tasks.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchData, putData, postData, deleteData } from '@/lib/fetch-util';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Loader2, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'to-do' | 'in-progress' | 'done' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate: string;
  assignedTo?: { _id: string; name: string; email: string };
  project?: { _id: string; title: string };
  creator?: { _id: string; name: string; email: string };
  createdAt: string;
  approvalStatus?: string;
  serialNumber?: number;
}

export function MyTasksView() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');

  // Update/delete modal state (admin only)
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateForm, setUpdateForm] = useState({
    title: '',
    description: '',
    priority: '',
    status: '',
    startDate: '',
    dueDate: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'admin' || (user as any)?.role === 'super_admin';

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetchData('/workspace/all-tasks');
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        setLoading(true);
        await fetchTasks();
        setLoading(false);
      })();
    }
  }, [isAuthenticated, fetchTasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((t: any) => t.approvalStatus !== 'approved');
    if (taskStatusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === taskStatusFilter);
    }
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          (task.assignedTo && task.assignedTo.name.toLowerCase().includes(query)) ||
          (task.project && task.project.title.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [tasks, taskStatusFilter, taskSearchQuery]);

  const navigateToTask = (taskId: string) => router.push(`/tasks/${taskId}`);

  const handleOpenUpdateModal = (task: Task) => {
    setSelectedTask(task);
    setUpdateForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
    setShowUpdateModal(true);
  };

  const handleOpenDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    if (!updateForm.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      setIsUpdating(true);

      const isPuttingOnHold = updateForm.status === 'on-hold' && selectedTask.status !== 'on-hold';
      const isResuming = selectedTask.status === 'on-hold' && updateForm.status !== 'on-hold';

      const payload: any = {
        title: updateForm.title,
        description: updateForm.description,
        priority: updateForm.priority,
        startDate: updateForm.startDate,
        dueDate: updateForm.dueDate,
      };

      if (!isPuttingOnHold && !isResuming) {
        payload.status = updateForm.status;
      }

      await putData(`/task/${selectedTask._id}`, payload);

      if (isPuttingOnHold) {
        await postData(`/task/${selectedTask._id}/hold`, { reason: 'Updated via tasks page' });
      } else if (isResuming) {
        await postData(`/task/${selectedTask._id}/resume`, {});
      }

      toast.success('Task updated successfully');
      setShowUpdateModal(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error('Failed to update task:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setIsDeleting(true);
      await deleteData(`/task/${selectedTask._id}`);
      toast.success('Task deleted successfully');
      setShowDeleteDialog(false);
      const deletedId = selectedTask._id;
      setSelectedTask(null);
      setTasks((prev) => prev.filter((t) => t._id !== deletedId));
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast.error(error.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/sign-in');
    return null;
  }

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'to-do', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'done', label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] p-3 sm:p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-[13px] md:text-[14px] text-[#040110] opacity-60 font-normal mt-[5px]">
            Track and manage all your assigned tasks.
          </p>
        </div>

        <Card className="overflow-hidden px-2 sm:px-[10px] py-[15px]">
          <div className="px-[10px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-[10px] mb-[15px]">
              <h3 className="font-['Inter'] font-medium text-[16px] text-[#2e2e30] leading-normal flex-1">
                Task Overview
              </h3>
              <span className="font-['Inter'] font-medium text-[16px] text-[#717182]">
                {filteredTasks.length}
              </span>
            </div>

            {/* Search and Filter */}
            <div className="space-y-[10px] mb-[15px]">
              <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center justify-between">
                <div className="flex items-center gap-[10px] w-full">
                  <Search className="w-[15px] h-[15px] text-[#040110] opacity-60 shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-[10px] overflow-x-auto scrollbar-visible border-b-[0.5px] border-[#949291]">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setTaskStatusFilter(tab.value)}
                    className={cn(
                      "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                      taskStatusFilter === tab.value
                        ? 'border-b-[1px] border-[#f2761b] opacity-100'
                        : 'opacity-60'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Grid */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-[#717182] text-[14px] font-['Inter']">
                {taskSearchQuery ? 'No tasks match your search' : 'No tasks found'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]">
                {filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => navigateToTask(task._id)}
                    className={cn(
                      'rounded-lg border border-gray-200 bg-white px-[10px] py-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer w-full',
                      'flex gap-3 items-start min-h-fit'
                    )}
                  >
                    {/* Status indicator */}
                    <div
                      className={cn(
                        'w-1 min-h-[40px] rounded-full shrink-0 mt-1 self-stretch',
                        task.status === 'to-do' && 'bg-blue-500',
                        task.status === 'in-progress' && 'bg-amber-500',
                        task.status === 'done' && 'bg-green-500',
                        task.status === 'on-hold' && 'bg-[#CD2812]'
                      )}
                    />

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      {/* Task title */}
                      <h4 className="font-medium text-gray-900 text-sm leading-5 mb-2 break-words">
                        {task.title.length > 50 ? `${task.title.substring(0, 50)}...` : task.title}
                      </h4>

                      {/* Project pill */}
                      {task.project && (
                        <p className="text-[11px] text-[#717182] font-['Inter'] mb-2 truncate">
                          {task.project.title}
                        </p>
                      )}

                      {/* Task description */}
                      {task.description && (
                        <p className="text-gray-600 text-xs leading-4 mb-3 break-words whitespace-pre-wrap line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Task metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Assignee */}
                        {task.assignedTo && (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                              {task.assignedTo.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700 text-xs font-medium truncate">
                              {task.assignedTo.name.split(' ')[0].charAt(0).toUpperCase() +
                                task.assignedTo.name.split(' ')[0].slice(1).toLowerCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status badge */}
                          <div
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              task.status === 'to-do' && 'bg-blue-100 text-blue-700',
                              task.status === 'in-progress' && 'bg-amber-100 text-amber-700',
                              task.status === 'done' && 'bg-green-100 text-green-700',
                              task.status === 'on-hold' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {task.status === 'to-do'
                              ? 'To Do'
                              : task.status === 'in-progress'
                                ? 'In Progress'
                                : task.status === 'on-hold'
                                  ? 'On Hold'
                                  : 'Done'}
                          </div>

                          {/* 3-dot menu - Admin only */}
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-gray-100"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-40"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenUpdateModal(task);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Update
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteDialog(task);
                                  }}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Update Task Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>Edit the task details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={updateForm.priority}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(v) => setUpdateForm({ ...updateForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-do">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-start">Start Date</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={updateForm.startDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={updateForm.dueDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateModal(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTask?.title}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MyTasksView;
