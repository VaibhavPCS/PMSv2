'use client';

import { useState } from 'react';
import { Modal, Input, Button } from '@shared/ui';
import { useCreateProject } from '@/hooks/useProjects';
import { useAuthContext } from '@/providers/AuthProvider';
import type { CreateProjectFormState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY: CreateProjectFormState = {
  name: '', description: '', workspaceId: '', startDate: '', endDate: '',
};

export function CreateProjectModal({ open, onClose }: Props) {
  const { user } = useAuthContext();
  const workspaceId =
    typeof user?.currentWorkspace === 'string'
      ? user.currentWorkspace
      : user?.currentWorkspace?._id ?? '';

  const [form, setForm] = useState<CreateProjectFormState>({ ...EMPTY, workspaceId });
  const [error, setError] = useState('');
  const { mutate, isPending } = useCreateProject();

  const set = (k: keyof CreateProjectFormState, v: string) =>
    setForm((prev: CreateProjectFormState) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setError('');
    mutate(
      {
        name: form.name,
        description: form.description || undefined,
        workspaceId,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      },
      { onSuccess: () => { setForm({ ...EMPTY, workspaceId }); onClose(); } }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Project"
      description="Fill in the details to create a new project."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isPending}>Create Project</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Project Name" required value={form.name}
          onChange={(e) => set('name', e.target.value)} error={error} />
        <Input label="Description" value={form.description}
          onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)} />
          <Input label="End Date" type="date" value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}