'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { Button } from '@shared/ui';

export default function ProjectsPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="All your workspace projects"
        actions={<Button onClick={() => setOpen(true)}>New Project</Button>}
      />
      <ProjectList />
      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}