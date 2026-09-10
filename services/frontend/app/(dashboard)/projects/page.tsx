'use client';

// Projects list/grid route (Next.js App Router port of the old
// app/routes/workspace/workspace.tsx). Thin client wrapper composing the
// ProjectsListView sub-component, which owns all state/data and markup.

import { ProjectsListView } from '@/components/project/ProjectsListView';

export default function ProjectsPage() {
  return <ProjectsListView />;
}
