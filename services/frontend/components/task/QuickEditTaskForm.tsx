'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { putData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AssignableMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: AssignableMember;
  startDate?: string;
  endDate?: string;
  status: string;
  sprint?: { _id: string; name?: string } | string | null;
}

interface Project {
  _id: string;
  title: string;
  members: Array<{
    userId: AssignableMember;
    addedAt: string;
  }>;
}

interface QuickEditTaskFormProps {
  task: Task;
  onClose: () => void;
  onUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  project?: Project | null;
}

export const QuickEditTaskForm: React.FC<QuickEditTaskFormProps> = ({
  task,
  onClose,
  onUpdate,
  assignableMembers = [],
  project = null,
}) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeId: task.assignee?._id || '',
    startDate: task.startDate ? new Date(task.startDate) : undefined,
    endDate: task.endDate ? new Date(task.endDate) : undefined,
    sprintId: typeof task.sprint === 'string' ? task.sprint : task.sprint?._id || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      };

      if (formData.assigneeId) {
        updateData.assigneeId = formData.assigneeId;
      }

      if (formData.startDate) {
        updateData.startDate = format(formData.startDate, 'yyyy-MM-dd');
      }

      if (formData.endDate) {
        updateData.endDate = format(formData.endDate, 'yyyy-MM-dd');
      }

      if (project) {
        updateData.sprintId = formData.sprintId || null;
      }

      await putData(`/task/${task._id}`, updateData);
      toast.success('Task updated successfully');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter task title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter task description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value: 'low' | 'medium' | 'high') =>
            setFormData({ ...formData, priority: value })
          }
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {assignableMembers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="assignee">Assignee</Label>
          <Select
            value={formData.assigneeId}
            onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
          >
            <SelectTrigger id="assignee">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {assignableMembers.map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  {member.name} ({member.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isUpdating}>
          Cancel
        </Button>
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Update Task'}
        </Button>
      </div>
    </form>
  );
};
