'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MoreVertical,
  Eye,
  Edit,
  UserPlus,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchData, postData, deleteData, putData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickEditTaskForm } from '@/components/task/QuickEditTaskForm';
import type { Task, CurrentUser, AssignableMember, Project } from './types';

// ✅ ENHANCED: TaskCard with Settings Menu and Delete Functionality
export const TaskCard = React.memo<{
  task: Task;
  onClick?: () => void;
  compact?: boolean;
  currentUser?: CurrentUser | null;
  userRole?: string;
  onTaskUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  canAssignVisible?: boolean;
  project?: Project | null; // ✅ NEW: Add project prop for permission checks
}>(({ task, onClick, compact = false, currentUser, userRole, onTaskUpdate, assignableMembers = [], canAssignVisible = false, project }) => {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(task.assignee?._id || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Task is overdue if due date is before today (not today or later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = new Date(task.dueDate) < today && task.status !== 'done';

  // ✅ ENHANCED: Permission checks aligned with backend
  const isAdmin = useMemo(() => {
    return ['admin', 'super_admin'].includes(currentUser?.role || userRole || '');
  }, [currentUser, userRole]);

  const isProjectLead = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || '').toString();
    const headIds = [
      ...(project?.projectHeads || []),
      ...(project?.projectHead ? [project.projectHead] : []),
    ]
      .map((head: any) => (head?._id || head)?.toString())
      .filter(Boolean);
    return headIds.includes(currentUserIdStr);
  }, [currentUser, project]);

  const isAssigneeOrCreator = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || '').toString();
    const assigneeIdStr = task.assignee?._id?.toString() || '';
    const creatorIdStr = task.creator?._id?.toString() || '';
    return assigneeIdStr === currentUserIdStr || creatorIdStr === currentUserIdStr;
  }, [currentUser, task]);

  const isApproved = (task as any).approvalStatus === 'approved';

  // Show dropdown menu if any actionable permission exists (matches backend capabilities)
  const canManageTask = useMemo(() => {
    return isAdmin || isProjectLead;
  }, [isAdmin, isProjectLead]);

  // Edit allowed for assignee, creator, admin, or project lead (backend: updateTask)
  const canEditTask = useMemo(() => {
    return isAssigneeOrCreator || isAdmin || isProjectLead;
  }, [isAssigneeOrCreator, isAdmin, isProjectLead]);

  // Delete allowed ONLY for admin or project lead (owner)
  const canDeleteTask = useMemo(() => {
    return isAdmin || isProjectLead;
  }, [isAdmin, isProjectLead]);

  const [hasBlockingSubtasks, setHasBlockingSubtasks] = useState(false);
  const handleMenuOpenChange = async (open: boolean) => {
    if (!open) return;
    try {
      const resp = await fetchData(`/task/${task._id}/subtasks`);
      const list = Array.isArray((resp as any)?.subtasks) ? (resp as any).subtasks : (Array.isArray(resp) ? (resp as any) : []);
      const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
      setHasBlockingSubtasks(hasBlocking);
    } catch {
      setHasBlockingSubtasks(false);
    }
  };

  // ✅ NEW: Handle task deletion using proper DELETE API
  const handleDeleteTask = async () => {
    try {
      setIsDeleting(true);
      await deleteData(`/task/${task._id}`);
      toast.success('Task deleted successfully');
      setShowDeleteDialog(false);
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
    } catch (error: any) {
      console.error('Delete task error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete task';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ NEW: Handle status change directly from menu
  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'done') {
        const resp = await fetchData(`/task/${task._id}/subtasks`);
        const list = Array.isArray((resp as any)?.subtasks) ? (resp as any).subtasks : (Array.isArray(resp) ? (resp as any) : []);
        const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
        if (hasBlocking) {
          toast.error('Complete and approve all subtasks before marking Done');
          return;
        }
      }
      await postData(`/task/${task._id}/status`, { status: newStatus });
      toast.success('Task status updated');
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleAssignTask = async () => {
    try {
      await putData(`/task/${task._id}`, { assigneeId: selectedAssigneeId || null });
      toast.success('Assignee updated');
      setShowAssignModal(false);
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign task');
    }
  };

  const handleCardClick = () => {
    if (!task.assignee?._id) {
      toast.warning('Assign an employee to open this task');
      if (canManageTask) setShowAssignModal(true);
      return;
    }
    onClick?.();
  };

  const handleSelectView = () => {
    setShowEditModal(false);
    setShowAssignModal(false);
    setShowDeleteDialog(false);
    handleCardClick();
  };

  const handleSelectEdit = () => {
    setShowAssignModal(false);
    setShowDeleteDialog(false);
    setShowEditModal(true);
  };

  const handleSelectAssign = () => {
    setSelectedAssigneeId(task.assignee?._id || '');
    setShowEditModal(false);
    setShowDeleteDialog(false);
    setShowAssignModal(true);
  };

  const handleSelectDelete = () => {
    setShowEditModal(false);
    setShowAssignModal(false);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <div
        data-slot="card"
        className={cn(
          'text-card-foreground flex flex-col gap-6 py-6 shadow-sm hover:shadow-md transition-all duration-200 relative group bg-white rounded-lg border border-gray-200',
          onClick && 'cursor-pointer'
        )}
        onClick={handleCardClick}
      >
        <div data-slot="card-header" className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 p-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span
              data-slot="badge"
              className={cn(
                "inline-flex items-center justify-center border w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&]:hover:bg-primary/90 text-xs font-medium px-2 py-0.5 rounded",
                task.priority === 'high' && 'bg-red-100 text-red-700',
                task.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                task.priority === 'low' && 'bg-blue-100 text-blue-700',
                task.priority === 'urgent' && 'bg-purple-100 text-purple-700'
              )}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>

            {canManageTask && (
              <DropdownMenu onOpenChange={handleMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button
                    data-slot="dropdown-menu-trigger"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-gray-100 rounded-md gap-1.5 has-[>svg]:px-2.5 h-6 w-6 p-0 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4 text-black" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectView(); }}>
                    <Eye className="w-4 h-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  {canEditTask && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectEdit(); }}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Task
                    </DropdownMenuItem>
                  )}
                  {canManageTask && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectAssign(); }}>
                      <UserPlus className="w-4 h-4 mr-2" /> Assign Member
                    </DropdownMenuItem>
                  )}
                  {(!isApproved && task.status !== 'done') && (
                    <DropdownMenuItem disabled={hasBlockingSubtasks} onSelect={() => handleStatusChange('done')}>
                      <CheckCircle2 className="w-3 h-3 mr-2" /> Mark as Done
                    </DropdownMenuItem>
                  )}
                  {canDeleteTask && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectDelete(); }} className="text-red-600 focus:text-red-600">
                        <Trash2 className="w-3 h-3 mr-2" /> Delete Task
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div data-slot="card-title" className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
            {task.title}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">{task.description}</p>
          )}
        </div>

        <div data-slot="card-content" className="px-4 pb-4 pt-0 space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span className={cn('font-medium', isOverdue ? 'text-red-600' : '')}>
              {(() => {
                const date = new Date(task.dueDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span data-slot="avatar" className="relative flex size-8 shrink-0 overflow-hidden rounded-full w-4 h-4">
              <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                {(task.assignee?.name?.charAt(0) || task.assignee?.email?.charAt(0) || '?')}
              </span>
            </span>
            <span>Assigned to {task.assignee?.name || task.assignee?.email || 'Unassigned'}</span>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Quick Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base">Edit Task</DialogTitle>
            <p className="text-sm text-gray-600">Update task details</p>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <QuickEditTaskForm
              task={task as any}
              onClose={() => setShowEditModal(false)}
              onUpdate={onTaskUpdate}
              assignableMembers={assignableMembers as any}
              project={project as any}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>Select an employee to assign this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Assignee</Label>
            <Select
              value={selectedAssigneeId}
              onValueChange={(value: string) => setSelectedAssigneeId(value === '__UNASSIGNED__' ? '' : value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.filter((m) => m).map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowAssignModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAssignTask} className="flex-1">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone and will remove the task from all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
