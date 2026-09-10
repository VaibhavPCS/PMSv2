'use client';

// Reject Task dialog (reason, new due date, reassignee, link, files).
// Markup copied verbatim from the old dashboard.tsx.

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Upload, File as FileIcon, X } from "lucide-react";
import { formatDate } from "@/components/dashboard/dashboard-helpers";
import type { Task } from "@/components/dashboard/dashboard-helpers";

interface RejectTaskDialogProps {
  showRejectDialog: boolean;
  setShowRejectDialog: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  rejectionFiles: File[];
  setRejectionFiles: (files: File[]) => void;
  rejectionLink: string;
  setRejectionLink: (value: string) => void;
  rejectDueDate: string;
  setRejectDueDate: (value: string) => void;
  rejectReassigneeId: string;
  setRejectReassigneeId: (value: string) => void;
  isRejecting: boolean;
  taskToReject: Task | null;
  handleRejectTask: () => void;
}

export function RejectTaskDialog({
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
}: RejectTaskDialogProps) {
  return (
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-[16px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-lg font-semibold">Reject Task</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Provide a reason and new due date for rejecting this task.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this task is being rejected..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid gap-2">
              <Label>New Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal ${!rejectDueDate && "text-[#717680]"}`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {rejectDueDate ? formatDate(rejectDueDate) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={rejectDueDate ? new Date(rejectDueDate) : undefined}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        setRejectDueDate(date.toISOString());
                      }
                    }}
                    disabled={(date: Date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dateToCheck = new Date(date);
                      dateToCheck.setHours(0, 0, 0, 0);
                      const taskStart = taskToReject?.startDate ? new Date(taskToReject.startDate) : null;
                      if (taskStart) taskStart.setHours(0, 0, 0, 0);
                      const taskDue = taskToReject?.dueDate ? new Date(taskToReject.dueDate) : null;
                      if (taskDue) taskDue.setHours(0, 0, 0, 0);

                      // Disable past dates (but allow today)
                      if (dateToCheck < today) return true;

                      // Disable dates outside parent task range
                      if (taskStart && dateToCheck < taskStart) return true;
                      if (taskDue && dateToCheck > taskDue) return true;

                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reassignee">Reassign To (Optional)</Label>
              <Input
                id="reassignee"
                type="text"
                value={rejectReassigneeId}
                onChange={(e) => setRejectReassigneeId(e.target.value)}
                placeholder="Enter user ID for reassignment"
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rejection-link">Reference Link (Optional)</Label>
              <Input
                id="rejection-link"
                type="url"
                value={rejectionLink}
                onChange={(e) => setRejectionLink(e.target.value)}
                placeholder="https://github.com/... or https://figma.com/..."
                className="w-full"
              />
              <p className="text-xs text-gray-500">Only GitHub and Figma links are allowed</p>
            </div>

            <div className="grid gap-2">
              <Label>Attachment Files (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => setRejectionFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="rejection-files"
                />
                <Label htmlFor="rejection-files" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">Click to upload files</span>
                    <span className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF</span>
                  </div>
                </Label>
              </div>
              {rejectionFiles.length > 0 && (
                <div className="space-y-2">
                  {rejectionFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      <FileIcon className="h-4 w-4" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectionFiles(rejectionFiles.filter((_, i) => i !== index))}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 flex gap-2">
          <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isRejecting}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectTask}
            disabled={isRejecting || !rejectionReason.trim() || !rejectDueDate}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isRejecting ? "Rejecting..." : "Reject Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
