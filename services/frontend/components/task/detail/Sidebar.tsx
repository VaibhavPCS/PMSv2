'use client';

import React from "react";
import { File, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { buildBackendUrl } from "@/lib/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignableMember, Task } from "./types";

const formatDate = (date: string) => {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export interface TaskDetailSidebarProps {
  task: Task;
  assignableMembers: AssignableMember[];
  // Reject dialog
  showRejectDialog: boolean;
  setShowRejectDialog: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  rejectDueDate: string;
  setRejectDueDate: (value: string) => void;
  rejectReassigneeId: string;
  setRejectReassigneeId: (value: string) => void;
  rejectProjectEnd: Date | null;
  setRejectProjectEnd: (value: Date | null) => void;
  setRejectionFiles: (files: File[]) => void;
  setRejectionLink: (value: string) => void;
  rejectionFileInputRef: React.RefObject<HTMLInputElement | null>;
  isRejecting: boolean;
  onReject: () => void;
  // Reassign dialog
  showReassignDialog: boolean;
  setShowReassignDialog: (open: boolean) => void;
  reassignAssigneeId: string;
  setReassignAssigneeId: (value: string) => void;
  reassignDueDate: string;
  setReassignDueDate: (value: string) => void;
  reassignProjectEnd: Date | null;
  setReassignProjectEnd: (value: Date | null) => void;
  isReassigning: boolean;
  onReassign: () => void;
  // Hold dialog
  showHoldDialog: boolean;
  setShowHoldDialog: (open: boolean) => void;
  holdReason: string;
  setHoldReason: (value: string) => void;
  isHolding: boolean;
  onPutOnHold: () => void;
  // Resume dialog
  showResumeDialog: boolean;
  setShowResumeDialog: (open: boolean) => void;
  resumeNewEndDate: string;
  setResumeNewEndDate: (value: string) => void;
  isResuming: boolean;
  endDateCrossed: boolean;
  setEndDateCrossed: (value: boolean) => void;
  onResume: () => void;
}

export function Sidebar({
  task,
  assignableMembers,
  showRejectDialog,
  setShowRejectDialog,
  rejectionReason,
  setRejectionReason,
  rejectDueDate,
  setRejectDueDate,
  rejectReassigneeId,
  setRejectReassigneeId,
  rejectProjectEnd,
  setRejectProjectEnd,
  setRejectionFiles,
  setRejectionLink,
  rejectionFileInputRef,
  isRejecting,
  onReject,
  showReassignDialog,
  setShowReassignDialog,
  reassignAssigneeId,
  setReassignAssigneeId,
  reassignDueDate,
  setReassignDueDate,
  reassignProjectEnd,
  setReassignProjectEnd,
  isReassigning,
  onReassign,
  showHoldDialog,
  setShowHoldDialog,
  holdReason,
  setHoldReason,
  isHolding,
  onPutOnHold,
  showResumeDialog,
  setShowResumeDialog,
  resumeNewEndDate,
  setResumeNewEndDate,
  isResuming,
  endDateCrossed,
  setEndDateCrossed,
  onResume,
}: TaskDetailSidebarProps) {
  return (
    <>
      {/* Project Details Card - Figma Design */}
      <div className="mt-4 bg-[#e5efff] rounded-lg px-5 py-[18px] flex flex-col gap-5 w-full overflow-x-hidden break-words">
        {/* Task Title - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Task Title</p>
          <p className="text-sm text-neutral-700 font-normal break-words">{task.title}</p>
        </div>

        {/* Assigned to - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Assigned to</p>
          <p className="text-sm text-neutral-700 font-normal">{task.assignee?.name || "Unassigned"}</p>
        </div>

        {/* Priority - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Priority</p>
          <p className={`text-sm font-normal capitalize ${task.priority === 'urgent' ? 'text-[#cd2812]' :
            task.priority === 'high' ? 'text-[#cd2812]' :
              task.priority === 'medium' ? 'text-[#f2761b]' :
                'text-neutral-700'
            }`}>
            {task.priority}
          </p>
        </div>

        {/* Description - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Description</p>
          <p className="text-sm text-neutral-700 font-normal whitespace-pre-wrap break-all">{task.description || '-'}</p>
        </div>

        {/* Start Date & Due Date - Side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-[5px]">
            <p className="text-sm text-[#040110] opacity-60 font-normal">Start Date</p>
            <p className="text-sm text-neutral-700 font-normal">{formatDate(task.startDate || "")}</p>
          </div>
          <div className="flex flex-col gap-[5px]">
            <p className="text-sm text-[#040110] opacity-60 font-normal">Due Date</p>
            <p className="text-sm text-neutral-700 font-normal">{formatDate(task.dueDate || "")}</p>
          </div>
        </div>

        {/* Duration - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Duration</p>
          <p className="text-sm text-neutral-700 font-normal">{task.durationDays ? `${task.durationDays} Day${task.durationDays > 1 ? 's' : ''}` : 'N/A'}</p>
        </div>

        {/* Recurring Task Information */}
        {task.isRecurring && (
          <div className="border border-blue-200 rounded-[8px] p-3 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <p className="text-sm font-semibold text-blue-900">Recurring Task</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-blue-700 font-medium">Frequency</p>
                <p className="text-blue-900 capitalize">{task.recurringFrequency}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Next Due</p>
                <p className="text-blue-900">
                  {task.nextDueDate ? formatDate(task.nextDueDate) : 'No more occurrences'}
                </p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Last Completed</p>
                <p className="text-blue-900">
                  {task.lastCompletedDate ? formatDate(task.lastCompletedDate) : 'Not yet completed'}
                </p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Recurs Until</p>
                <p className="text-blue-900">{task.recurringEndDate ? formatDate(task.recurringEndDate) : 'N/A'}</p>
              </div>
            </div>

            {task.recurringCompletionHistory && task.recurringCompletionHistory.length > 0 && (
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Completion History ({task.recurringCompletionHistory.length} times)
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {task.recurringCompletionHistory.slice(0, 5).map((history, index) => (
                    <div key={index} className="text-xs text-blue-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span>{formatDate(history.completedAt)}</span>
                      <span className="text-blue-600">by {history.completedBy.name}</span>
                    </div>
                  ))}
                  {task.recurringCompletionHistory.length > 5 && (
                    <p className="text-xs text-blue-600 italic">
                      +{task.recurringCompletionHistory.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status - Full width */}
        <div className="flex flex-col gap-[5px]">
          <p className="text-sm text-[#040110] opacity-60 font-normal">Status</p>
          {/* Read-only status display */}
          <p className={`text-sm font-medium capitalize ${task.status === 'done' ? 'text-[#22c55e]' :
            task.status === 'in-progress' ? 'text-[#f2761b]' :
            task.status === 'on-hold' ? 'text-[#CD2812]' :
              'text-neutral-700'
            }`}>
            {task.status.replace("-", " ")}
          </p>
        </div>

        {/* Approval Status - Inline Display with Rejection Reason */}
        {task.approvalStatus && task.approvalStatus !== "not-required" && (
          <div className="pt-2 border-t border-[#e0e0e0]/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#040110] opacity-60">Approval:</span>
              <span className={`text-sm font-medium capitalize ${task.approvalStatus === 'approved' ? 'text-[#22c55e]' :
                task.approvalStatus === 'rejected' ? 'text-[#ef4444]' :
                  task.approvalStatus === 'pending-approval' ? 'text-[#f59e0b]' :
                    'text-neutral-700'
                }`}>
                {task.approvalStatus.replace("-", " ")}
              </span>
            </div>
            {/* Show rejection reason inline */}
            {task.approvalStatus === "rejected" && task.rejectionReason && (
              <div className="mt-2 text-sm">
                <span className="text-[#040110] opacity-60">Reason: </span>
                <span className="text-[#ef4444]">{task.rejectionReason}</span>
              </div>
            )}
            {/* Show rejection attachments */}
            {task.approvalStatus === "rejected" && task.rejectionAttachments && task.rejectionAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-sm text-[#040110] opacity-60 font-medium">Rejection Attachments:</span>
                <div className="space-y-2">
                  {task.rejectionAttachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {attachment.type === 'file' ? (
                        <a
                          href={buildBackendUrl(attachment.fileUrl || '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <File className="w-4 h-4" />
                          <span className="truncate">{attachment.fileName}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      ) : (
                        <a
                          href={attachment.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span className="truncate capitalize">{attachment.linkType} Link</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Dialog - Redesigned to match AddProjectModal */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-[16px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white px-[24px] pt-[24px] pb-0 shrink-0">
            <div className="flex items-start gap-[10px] mb-[10px]">
              <div className="w-[48px] h-[48px] rounded-[10px] bg-[rgba(239,68,68,0.1)] flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <DialogHeader className="p-0 space-y-[4px]">
              <DialogTitle className="text-[16px] font-semibold font-['Inter'] text-[#181d27] leading-[24px]">
                Reject Task
              </DialogTitle>
              <DialogDescription className="text-[14px] font-normal font-['Inter'] text-[#535862] leading-[20px]">
                Provide a reason and set a new due date for this task
              </DialogDescription>
            </DialogHeader>
            <div className="h-[20px]" />
          </div>

          {/* Form Content - Scrollable */}
          <div className="px-[24px] pr-[14px] overflow-y-auto flex-1">
            <div className="pr-[10px] space-y-[16px] pb-[16px]">
              {/* Rejection Reason */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Rejection Reason{" "}
                  <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this task is being rejected..."
                  rows={4}
                  className="border-[#d5d7da] rounded-[8px] px-[14px] py-[10px] text-[14px] font-['Inter'] placeholder:text-[#717680] resize-none"
                />
              </div>

              {/* New Due Date - Required */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  New Due Date{" "}
                  <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal ${
                        !rejectProjectEnd && "text-[#717680]"
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {rejectProjectEnd
                        ? formatDate(rejectProjectEnd.toISOString())
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={rejectProjectEnd || undefined}
                      onSelect={(date) => {
                        setRejectProjectEnd(date || null);
                        if (date) {
                          setRejectDueDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reassign To (Optional) */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Reassign To (Optional)
                </label>
                <Select
                  value={rejectReassigneeId}
                  onValueChange={setRejectReassigneeId}
                >
                  <SelectTrigger className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                    <SelectValue placeholder="Keep current assignee" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter']">
                    {assignableMembers.map((member) => (
                      <SelectItem
                        key={member._id}
                        value={member._id}
                        className="text-[14px]"
                      >
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                  Leave empty to keep the task with the current assignee
                </p>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-[12px] px-[24px] py-[20px] border-t border-gray-100 shrink-0">
            <Button
              type="button"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setRejectReassigneeId("");
                setRejectDueDate("");
                setRejectProjectEnd(null);
                setRejectionFiles([]);
                setRejectionLink("");
                if (rejectionFileInputRef.current) {
                  rejectionFileInputRef.current.value = "";
                }
              }}
              disabled={isRejecting}
              className="flex-1 bg-[rgba(4,1,16,0.05)] hover:bg-[rgba(4,1,16,0.1)] text-[#040110] font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              onClick={onReject}
              disabled={isRejecting || !rejectionReason.trim() || !rejectDueDate}
              className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              {isRejecting ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Reassign Task
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Assign this task to a different team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                New Assignee
              </label>
              <Select
                value={reassignAssigneeId}
                onValueChange={setReassignAssigneeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Due Date (Required)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {reassignProjectEnd
                      ? format(reassignProjectEnd, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={reassignProjectEnd || undefined}
                    onSelect={(date) => {
                      setReassignProjectEnd(date || null);
                      if (date) {
                        setReassignDueDate(date.toISOString());
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignDialog(false);
                setReassignAssigneeId("");
                setReassignDueDate("");
              }}
              disabled={isReassigning}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onReassign}
              disabled={isReassigning || !reassignAssigneeId || !reassignDueDate}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            >
              {isReassigning ? "Reassigning..." : "Reassign Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Put Task on Hold Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Put Task on Hold</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Temporarily pause this task and provide a reason (required)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Why is this task being put on hold?"
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowHoldDialog(false);
                setHoldReason("");
              }}
              disabled={isHolding}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onPutOnHold}
              disabled={isHolding || !holdReason.trim()}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white h-9 text-sm"
            >
              {isHolding ? "Putting on hold..." : "Put on Hold"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Task Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Resume Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {endDateCrossed
                ? "The end date has passed during hold. Please set a new end date."
                : "Resume work on this task"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {endDateCrossed && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The task end date was crossed while on hold. As a reporting manager, you must set a new end date.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={resumeNewEndDate}
                    onChange={(e) => setResumeNewEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-9 border-input rounded-md px-3 py-1"
                  />
                </div>
              </>
            )}
            {!endDateCrossed && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  This task will be resumed and set back to "in-progress" status.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowResumeDialog(false);
                setResumeNewEndDate("");
                setEndDateCrossed(false);
              }}
              disabled={isResuming}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onResume}
              disabled={isResuming || (endDateCrossed && !resumeNewEndDate)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            >
              {isResuming ? "Resuming..." : "Resume Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Sidebar;
