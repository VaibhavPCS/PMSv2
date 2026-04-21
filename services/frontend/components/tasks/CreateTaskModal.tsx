'use client';

import { useState } from 'react';
import { Modal, Input, Select, Button } from '@shared/ui';
import { useCreateTask } from '@/hooks/useTasks';
import type { CreateTaskFormState } from '@/types';
import type { TaskPriority } from '@/types';
import type { SelectOption } from '@shared/ui';


const STATUS_OPTIONS: SelectOption[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

const EMPTY: CreateTaskFormState = {
  title: '', description: '', projectId: '', assigneeId: '',
  priority: 'medium', dueDate: '', estimatedHours: '', tags: [],
};

export function CreateTaskModal({ open, onClose, defaultProjectId }: Props) {
  const [form, setForm] = useState<CreateTaskFormState>({
    ...EMPTY, projectId: defaultProjectId ?? '',
  });
  const [error, setError] = useState('');
  const { mutate, isPending } = useCreateTask();

  const set = <K extends keyof CreateTaskFormState>(k: K, v: CreateTaskFormState[K]) =>
    setForm((prev: CreateTaskFormState) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.projectId) { setError('Project ID is required.'); return; }
    setError('');
    mutate(
      {
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        assigneeId: form.assigneeId || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours !== '' ? Number(form.estimatedHours) : undefined,
        tags: form.tags.length ? form.tags : undefined,
      },
      { onSuccess: () => { setForm({ ...EMPTY, projectId: defaultProjectId ?? '' }); onClose(); } }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Task"
      description="Add a task to your project."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isPending}>Create Task</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Title" required value={form.title}
          onChange={(e) => set('title', e.target.value)} error={error} />
        <Input label="Description" value={form.description}
          onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TaskPriority)} />
          <Input label="Due Date" type="date" value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)} />
        </div>
        <Input
          label="Estimated Hours"
          type="number"
          min={0}
          value={form.estimatedHours === '' ? '' : String(form.estimatedHours)}
          onChange={(e) =>
            set('estimatedHours', e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </div>
    </Modal>
  );
}