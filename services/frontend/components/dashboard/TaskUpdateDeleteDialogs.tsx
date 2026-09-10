'use client';

// Update Task + Delete Task dialogs. Markup copied verbatim from the old
// dashboard.tsx.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Task, Workspace, UpdateForm } from "@/components/dashboard/dashboard-helpers";

interface TaskUpdateDeleteDialogsProps {
  showUpdateModal: boolean;
  setShowUpdateModal: (open: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (open: boolean) => void;
  selectedTask: Task | null;
  currentWorkspace: Workspace | null;
  updateForm: UpdateForm;
  setUpdateForm: (form: UpdateForm) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  handleUpdateTask: () => void;
  handleDeleteTask: () => void;
}

export function TaskUpdateDeleteDialogs({
  showUpdateModal,
  setShowUpdateModal,
  showDeleteDialog,
  setShowDeleteDialog,
  selectedTask,
  currentWorkspace,
  updateForm,
  setUpdateForm,
  isUpdating,
  isDeleting,
  handleUpdateTask,
  handleDeleteTask,
}: TaskUpdateDeleteDialogsProps) {
  return (
    <>
      {/* Update Task Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[450px] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>
              Make changes to the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <Label>Project</Label>
                  <div className="text-sm text-gray-700">{selectedTask?.project?.title || "—"}</div>
                </div>
                <div className="grid gap-1">
                  <Label>Workspace</Label>
                  <div className="text-sm text-gray-700">{currentWorkspace?.name || "—"}</div>
                </div>
                <div className="grid gap-1">
                  <Label>Assigned To</Label>
                  <div className="text-sm text-gray-700">{selectedTask?.assignedTo?.name || "—"}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                placeholder="Enter task title"
                disabled={(selectedTask as any)?.approvalStatus === "approved"}
                className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
                disabled={(selectedTask as any)?.approvalStatus === "approved"}
                className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={updateForm.priority} onValueChange={(value) => setUpdateForm({ ...updateForm, priority: value })}>
                  <SelectTrigger className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")} disabled={(selectedTask as any)?.approvalStatus === "approved"}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                  <SelectTrigger className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")} disabled={(selectedTask as any)?.approvalStatus === "approved"}>
                    <SelectValue placeholder="Select status" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date fields commented out
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={updateForm.startDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={updateForm.dueDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, dueDate: e.target.value })}
                />
              </div>
              */}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowUpdateModal(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={(selectedTask as any)?.approvalStatus === "approved" || isUpdating || !updateForm.title.trim()} className={(selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : ""}>
              {isUpdating ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
