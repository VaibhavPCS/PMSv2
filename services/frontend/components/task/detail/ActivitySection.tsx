'use client';

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { Task } from "./types";

const formatDate = (date?: string) => {
  if (!date) return "-";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString();
};

interface ActivityEntry {
  key: string;
  label: string;
  detail?: string;
  timestamp?: string;
  dotClass: string;
}

export interface ActivitySectionProps {
  task: Task;
}

export function ActivitySection({ task }: ActivitySectionProps) {
  const entries: ActivityEntry[] = [];

  // Created
  if (task.createdAt) {
    entries.push({
      key: "created",
      label: "Task created",
      detail: task.creator?.name ? `by ${task.creator.name}` : undefined,
      timestamp: task.createdAt,
      dotClass: "bg-gray-400",
    });
  }

  // Hold / Resume history
  (task.holdHistory || []).forEach((hold, index) => {
    entries.push({
      key: `hold-${index}`,
      label: "Put on hold",
      detail: hold.reason ? `Reason: ${hold.reason}` : undefined,
      timestamp: hold.putOnHoldAt,
      dotClass: "bg-[#CD2812]",
    });
    if (hold.resumedAt) {
      entries.push({
        key: `resume-${index}`,
        label: "Resumed",
        detail: hold.newEndDate ? `New due date: ${formatDate(hold.newEndDate)}` : undefined,
        timestamp: hold.resumedAt,
        dotClass: "bg-[#f2761b]",
      });
    }
  });

  // Completed
  if (task.completedAt) {
    entries.push({
      key: "completed",
      label: "Marked as done",
      detail: task.completedBy?.name ? `by ${task.completedBy.name}` : undefined,
      timestamp: task.completedAt,
      dotClass: "bg-[#22c55e]",
    });
  }

  // Approved
  if (task.approvalStatus === "approved" && task.approvedAt) {
    entries.push({
      key: "approved",
      label: "Approved",
      detail: task.approvedBy?.name ? `by ${task.approvedBy.name}` : undefined,
      timestamp: task.approvedAt,
      dotClass: "bg-[#22c55e]",
    });
  }

  // Rejected
  if (task.approvalStatus === "rejected" && task.rejectionReason) {
    entries.push({
      key: "rejected",
      label: "Rejected",
      detail: `Reason: ${task.rejectionReason}`,
      dotClass: "bg-[#ef4444]",
    });
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          Activity
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">History of this task</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs sm:text-sm">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.key} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${entry.dotClass}`}></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-sm font-medium text-neutral-700">{entry.label}</span>
                    {entry.detail && (
                      <span className="text-xs text-[#040110] opacity-60">{entry.detail}</span>
                    )}
                  </div>
                  {entry.timestamp && (
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(entry.timestamp)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recurring Completion History */}
        {task.recurringCompletionHistory && task.recurringCompletionHistory.length > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-200">
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
      </CardContent>
    </Card>
  );
}

export default ActivitySection;
