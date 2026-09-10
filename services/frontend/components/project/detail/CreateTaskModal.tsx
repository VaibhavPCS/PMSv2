'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SprintSelector } from '@/components/sprint/SprintSelector';
import type { Project, AssignableMember } from './types';
import { formatFileSize } from './createTaskUtils';

interface NewTaskState {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  sprintId: string | null;
  rejectionAttachmentType: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  project: Project | null;
  projectId: string;
  newTask: NewTaskState;
  setNewTask: React.Dispatch<React.SetStateAction<NewTaskState>>;
  startDateObj: Date | undefined;
  setStartDateObj: React.Dispatch<React.SetStateAction<Date | undefined>>;
  dueDateObj: Date | undefined;
  setDueDateObj: React.Dispatch<React.SetStateAction<Date | undefined>>;
  taskAttachments: File[];
  setTaskAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  removeTaskAttachment: (index: number) => void;
  taskReferenceLink: string;
  setTaskReferenceLink: React.Dispatch<React.SetStateAction<string>>;
  taskFileInputRef: React.RefObject<HTMLInputElement | null>;
  isRecurring: boolean;
  setIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  recurringFrequency: 'daily' | 'weekly' | 'monthly';
  setRecurringFrequency: React.Dispatch<
    React.SetStateAction<'daily' | 'weekly' | 'monthly'>
  >;
  submittingTask: boolean;
  filteredAssignableMembers: AssignableMember[];
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  open,
  onOpenChange,
  isMobile,
  project,
  projectId,
  newTask,
  setNewTask,
  startDateObj,
  setStartDateObj,
  dueDateObj,
  setDueDateObj,
  taskAttachments,
  setTaskAttachments,
  removeTaskAttachment,
  taskReferenceLink,
  setTaskReferenceLink,
  taskFileInputRef,
  isRecurring,
  setIsRecurring,
  recurringFrequency,
  setRecurringFrequency,
  submittingTask,
  filteredAssignableMembers,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh]',
          isMobile ? 'mx-2 w-[calc(100vw-16px)] max-w-none' : 'sm:max-w-md'
        )}
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base">Create Task</DialogTitle>
          <p className="text-sm text-gray-600">Add to "{project?.title}"</p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <form onSubmit={onSubmit} className="space-y-3 pr-1">
            <div className="space-y-1">
              <Label className="text-sm">Title *</Label>
              <Input
                required
                value={newTask.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Task title"
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              {/* <Label className="text-sm">Sprint *</Label> */}
              <SprintSelector
                projectId={projectId!}
                selectedSprintId={newTask.sprintId}
                onSelectSprint={(sprintId: string | null) =>
                  setNewTask({ ...newTask, sprintId })
                }
                taskStartDate={newTask.startDate}
                taskDueDate={newTask.dueDate}
                error={!newTask.sprintId ? 'Please select a sprint' : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(value: string) =>
                    setNewTask({ ...newTask, status: value })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-do">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value: string) =>
                    setNewTask({ ...newTask, priority: value })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Assignee (optional)</Label>
              <Select
                value={newTask.assigneeId}
                onValueChange={(value: string) =>
                  setNewTask({ ...newTask, assigneeId: value })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignableMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-4 h-4">
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0) ||
                              member.email?.charAt(0) ||
                              '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {member.name || member.email || 'Unknown'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal',
                        !startDateObj && 'text-[#717680]'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateObj ? format(startDateObj, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDateObj}
                      onSelect={(date) => {
                        if (!date) return;
                        setStartDateObj(date);
                        setNewTask({
                          ...newTask,
                          startDate: format(date, 'yyyy-MM-dd'),
                        });
                        // Ensure due date baseline respects start date
                        if (dueDateObj && dueDateObj < date) {
                          setDueDateObj(date);
                          setNewTask({
                            ...newTask,
                            startDate: format(date, 'yyyy-MM-dd'),
                            dueDate: format(date, 'yyyy-MM-dd'),
                          });
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const projStart = project
                          ? new Date(project.startDate)
                          : new Date();
                        projStart.setHours(0, 0, 0, 0);
                        const projEnd = project
                          ? new Date(project.endDate)
                          : undefined;
                        if (projEnd) projEnd.setHours(0, 0, 0, 0);
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return Boolean(
                          d < today ||
                            d < projStart ||
                            (projEnd && d > projEnd)
                        );
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal',
                        !dueDateObj && 'text-[#717680]'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDateObj ? format(dueDateObj, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDateObj}
                      onSelect={(date) => {
                        if (!date) return;
                        const projEnd = project
                          ? new Date(project.endDate)
                          : undefined;
                        if (projEnd) {
                          projEnd.setHours(0, 0, 0, 0);
                        }
                        const selected = new Date(date);
                        selected.setHours(0, 0, 0, 0);
                        const projEndPlusOne = projEnd
                          ? new Date(projEnd)
                          : undefined;
                        if (projEndPlusOne) {
                          projEndPlusOne.setDate(projEndPlusOne.getDate() + 1);
                        }
                        if (
                          projEndPlusOne &&
                          selected.getTime() >= projEndPlusOne.getTime()
                        ) {
                          toast.error(
                            'Due date cannot be after project end date'
                          );
                          setDueDateObj(projEnd);
                          setNewTask({
                            ...newTask,
                            dueDate: projEnd
                              ? format(projEnd, 'yyyy-MM-dd')
                              : '',
                          });
                          return;
                        }
                        setDueDateObj(selected);
                        setNewTask({
                          ...newTask,
                          dueDate: format(selected, 'yyyy-MM-dd'),
                        });
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const projStart = project
                          ? new Date(project.startDate)
                          : new Date();
                        projStart.setHours(0, 0, 0, 0);
                        const startBaseline = startDateObj
                          ? new Date(startDateObj)
                          : projStart;
                        startBaseline.setHours(0, 0, 0, 0);
                        const projEnd = project
                          ? new Date(project.endDate)
                          : undefined;
                        if (projEnd) projEnd.setHours(0, 0, 0, 0);
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        return Boolean(
                          d < startBaseline ||
                            d < today ||
                            (projEnd && d > projEnd)
                        );
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isRecurring}
                  data-state={isRecurring ? 'checked' : 'unchecked'}
                  onClick={() => setIsRecurring(!isRecurring)}
                  className="peer h-4 w-4 shrink-0 rounded-sm border border-input shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                >
                  {isRecurring && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-check size-4"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <label
                  htmlFor="isRecurring"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 cursor-pointer"
                  onClick={() => setIsRecurring(!isRecurring)}
                >
                  Recurring Task
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-1 ml-6">
                  <Label className="text-sm">Frequency</Label>
                  <Select
                    value={recurringFrequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setRecurringFrequency(value)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    Task will recur {recurringFrequency} until project ends
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Task details..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* ✅ NEW: Rejection Attachment Type Selector */}
            {/* <div className="space-y-1">
                <Label className="text-sm">Rejection Attachment Requirement</Label>
                <Select
                  value={newTask.rejectionAttachmentType}
                  onValueChange={(value: string) => setNewTask({ ...newTask, rejectionAttachmentType: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="either">File or Link (Either)</SelectItem>
                    <SelectItem value="file">File Required</SelectItem>
                    <SelectItem value="link">Link Required (Figma/GitHub)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Specify what type of attachment is required when rejecting this task
                </p>
              </div> */}

            <div className="space-y-1">
              <Label className="text-sm">Attachments (optional)</Label>

              {/* File Upload Section */}
              <div className="space-y-2">
                <div className="border border-[#d5d7da] rounded-[8px]">
                  <label
                    htmlFor="attachments"
                    className="flex items-center gap-[8px] px-[14px] py-[10px] cursor-pointer hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4 text-[#717680]" />
                    <span className="flex-1 text-[14px] font-normal font-['Inter'] text-[#717680]">
                      {taskAttachments.length > 0
                        ? `${taskAttachments.length} file(s) selected`
                        : 'Upload file(s)'}
                    </span>
                  </label>
                  <input
                    ref={taskFileInputRef}
                    id="attachments"
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.docx"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const newFiles = Array.from(files) as File[];

                        // Check total files limit (3 files max)
                        const totalFiles =
                          taskAttachments.length + newFiles.length;
                        if (totalFiles > 3) {
                          toast.error(
                            `Maximum 3 files allowed. You currently have ${taskAttachments.length} file(s) and tried to add ${newFiles.length} more.`
                          );
                          return;
                        }

                        // Check file sizes (5MB limit)
                        const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
                        const oversizedFiles = newFiles.filter(
                          (file) => file.size > maxFileSize
                        );
                        if (oversizedFiles.length > 0) {
                          const fileNames = oversizedFiles
                            .map((file) => `"${file.name}"`)
                            .join(', ');
                          toast.error(
                            `${fileNames}: File too large (max 5MB per file)`
                          );
                          return;
                        }

                        // Append new files to existing ones
                        setTaskAttachments((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </div>
                {taskAttachments.length > 0 && (
                  <div className="space-y-[6px] mt-[8px]">
                    <div className="flex justify-between items-center mb-[4px]">
                      <span className="text-[10px] text-gray-500">
                        {taskAttachments.length} of 3 files
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskAttachments([]);
                          if (taskFileInputRef.current) {
                            taskFileInputRef.current.value = '';
                          }
                        }}
                        className="text-[10px] text-[#cd2818] hover:text-[#a01f10] font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    {taskAttachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-[8px] text-[12px] font-['Inter'] text-[#414651]"
                      >
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTaskAttachment(index)}
                          className="text-[#cd2818] hover:text-[#a01f10]"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-x"
                            aria-hidden="true"
                          >
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Link Input Section */}
                <div className="space-y-2">
                  {taskAttachments.length > 0 && (
                    <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                      And/or provide a reference link:
                    </p>
                  )}
                  <Input
                    type="url"
                    value={taskReferenceLink}
                    onChange={(e) => setTaskReferenceLink(e.target.value)}
                    placeholder="Figma or GitHub link (e.g., https://figma.com/...)"
                    className="border-[#d5d7da] rounded-[8px] px-[14px] py-[10px] text-[14px] font-['Inter'] placeholder:text-[#717680]"
                  />
                  <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                    Reference links help provide context for the task. Only Figma
                    and GitHub links are allowed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-9 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingTask}
                className="flex-1 h-9 text-sm bg-[#f2761b] hover:bg-[#f2761b]/90"
              >
                {submittingTask ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1" />
                )}
                {submittingTask ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskModal;
