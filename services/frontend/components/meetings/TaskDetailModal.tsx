'use client';

// Task detail dialog for the calendar. Markup ported VERBATIM from OLD
// app/routes/administration/calendar.tsx (Task Detail Modal block).

import { format, differenceInDays } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { statusColors, type CalendarTask } from './calendar-utils';

interface TaskDetailModalProps {
  selectedTask: CalendarTask | null;
  onClose: () => void;
}

export function TaskDetailModal({ selectedTask, onClose }: TaskDetailModalProps) {
  return (
    <Dialog open={!!selectedTask} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedTask?.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {selectedTask?.project?.title || 'No Project'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {selectedTask && (
          <div className="mt-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Badge
                className={`${statusColors[selectedTask.status]?.bg || 'bg-gray-500'} text-white border-0`}
              >
                {selectedTask.status.replace('-', ' ').toUpperCase()}
              </Badge>

              {/* Open in New Tab Link */}
              <a
                href={`/task/${selectedTask._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                title="Open task in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Hold Details - Red Banner for On-Hold Tasks */}
            {selectedTask.status === 'on-hold' && selectedTask.holdHistory && selectedTask.holdHistory.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <h4 className="text-sm font-semibold text-red-800">Task Currently On Hold</h4>
                </div>
                <div className="space-y-1 text-sm text-red-700">
                  <div><span className="font-medium">Reason:</span> {selectedTask.holdHistory[selectedTask.holdHistory.length - 1].reason || 'No reason provided'}</div>
                  <div><span className="font-medium">Date:</span> {new Date(selectedTask.holdHistory[selectedTask.holdHistory.length - 1].putOnHoldAt).toLocaleString()}</div>
                  <div><span className="font-medium">By:</span> {(selectedTask.holdHistory[selectedTask.holdHistory.length - 1].putOnHoldBy as any)?.name || 'Unknown'}</div>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}

            {/* Task Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">
                      {selectedTask.startDate ? format(new Date(selectedTask.startDate), 'MMM dd, yyyy') : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">
                      {format(new Date(selectedTask.dueDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  {selectedTask.createdAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {format(new Date(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Assignment</h4>
                <div className="space-y-2">
                  {selectedTask.assignee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Assigned to:</span>
                      <span className="font-medium">{selectedTask.assignee.name}</span>
                    </div>
                  )}
                  {selectedTask.creator && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created by:</span>
                      <span className="font-medium">{selectedTask.creator.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Time Tracking */}
            {selectedTask.startDate && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Time Tracking</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time Spent:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedTask.startDate && selectedTask.dueDate
                        ? `${differenceInDays(new Date(selectedTask.dueDate), new Date(selectedTask.startDate))} days`
                        : 'Calculating...'}
                    </span>
                  </div>
                  {selectedTask.completedAt && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">Completed:</span>
                      <span className="text-sm font-medium text-green-600">
                        {format(new Date(selectedTask.completedAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Priority</h4>
              <Badge variant="outline" className="text-xs">
                {selectedTask.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
