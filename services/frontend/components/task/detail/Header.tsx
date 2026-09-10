'use client';

import React from "react";
import {
  Circle,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Task } from "./types";

const getStatusIcon = (status: string) => {
  switch (status) {
    case "to-do":
      return <Circle className="w-4 h-4" />;
    case "in-progress":
      return <PlayCircle className="w-4 h-4" />;
    case "on-hold":
      return <PauseCircle className="w-4 h-4" />;
    case "done":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

export interface TaskDetailHeaderProps {
  task: Task;
  canApprove: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isCreator: boolean;
  isAssignee: boolean;
  isProjectHead: boolean;
  isAdmin: boolean;
  isTL: boolean;
  isTaskLocked: boolean;
  isChangingStatus: boolean;
  isHolding: boolean;
  isResuming: boolean;
  onApprove: () => void;
  onOpenReject: () => void;
  onOpenReassign: () => void;
  onStatusChange: (value: string) => void;
  onOpenHold: () => void;
  onOpenResume: () => void;
  setEndDateCrossed: (value: boolean) => void;
}

export function Header({
  task,
  canApprove,
  isApproving,
  isRejecting,
  isCreator,
  isAssignee,
  isProjectHead,
  isAdmin,
  isTL,
  isTaskLocked,
  isChangingStatus,
  isHolding,
  isResuming,
  onApprove,
  onOpenReject,
  onOpenReassign,
  onStatusChange,
  onOpenHold,
  onOpenResume,
  setEndDateCrossed,
}: TaskDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">Task Overview</CardTitle>

      {/* Approval Buttons - Responsive: stack on mobile */}
      <div className="flex flex-col xs:flex-row flex-wrap gap-2 xs:gap-3 items-stretch xs:items-center w-full xs:w-auto">
        {/* Approval Actions - Only for creator */}
        {canApprove && (
          <>
            <Button
              onClick={onApprove}
              disabled={isApproving}
              size="sm"
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isApproving ? "Approving..." : "Approve"}
            </Button>
            <Button
              onClick={onOpenReject}
              disabled={isRejecting}
              size="sm"
              className="bg-white border border-[#ef4444] text-[#ef4444] hover:bg-red-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </>
        )}

        {/* Reassign Button */}
        {isCreator && task.assignee && (
          <Button
            size="sm"
            onClick={onOpenReassign}
            className="bg-white border border-[#d5d7da] text-[#414651] hover:bg-gray-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.3333 15.8333H16.6667M16.6667 15.8333V12.5M16.6667 15.8333L12.5 11.6667M6.66667 4.16667H3.33333M3.33333 4.16667V7.5M3.33333 4.16667L7.5 8.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reassign Task
          </Button>
        )}

        {/* Status Dropdown - Unified Control */}
        {(isAssignee || isProjectHead || isAdmin || isTL) && !isTaskLocked && (
          <Select
            value={task.currentlyOnHold ? "on-hold" : task.status}
            onValueChange={(value) => {
              if (value === "on-hold") {
                onOpenHold();
              } else if (task.currentlyOnHold && value !== "on-hold") {
                // Trigger Resume Flow
                const lastHold = task.holdHistory?.[task.holdHistory.length - 1];
                if (lastHold?.endDateCrossedDuringHold) {
                  setEndDateCrossed(true);
                }
                onOpenResume();
              } else {
                onStatusChange(value);
              }
            }}
            disabled={isChangingStatus || isHolding || isResuming}
          >
            <SelectTrigger className="bg-white border border-[#d5d7da] text-[#414651] hover:bg-gray-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-[150px] justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(task.status)}
                <span className="capitalize truncate">{task.currentlyOnHold ? 'On Hold' : task.status.replace('-', ' ')}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to-do">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="on-hold">Put on Hold</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export default Header;
