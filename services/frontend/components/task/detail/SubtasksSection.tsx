'use client';

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Subtask } from "./types";

export interface SubtasksSectionProps {
  subtasks: Subtask[];
  isTLAssignedToParent: boolean;
  canCreateSubtask: boolean;
  onCreateSubtask: () => void;
  onEditSubtask: (subtask: Subtask) => void;
  onNavigate: (path: string) => void;
}

export function SubtasksSection({
  subtasks,
  isTLAssignedToParent,
  canCreateSubtask,
  onCreateSubtask,
  onEditSubtask,
  onNavigate,
}: SubtasksSectionProps) {
  if (!isTLAssignedToParent) return null;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">Subtasks</CardTitle>
          {canCreateSubtask && (
            <Button
              size="sm"
              onClick={onCreateSubtask}
              className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs sm:text-sm"
            >
              Create Subtask
            </Button>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm">Manage subtasks for this task</CardDescription>
      </CardHeader>
      <CardContent>
        {subtasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs sm:text-sm">No subtasks yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subtasks.map((st) => (
              <div
                key={st._id}
                className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onNavigate(`/task/${st._id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{st.title}</p>
                  <p className="text-xs text-gray-500 capitalize">{st.status?.replace("-", " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 capitalize">{st.priority}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSubtask(st);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SubtasksSection;
