'use client';

// Workspace route — the projects grid, matching OLD app/routes/workspace/workspace.tsx
// (the "N Projects" card grid with tabs/search/sort). Workspace SETTINGS lives at
// /workspace/settings, reached via the gear button (mirrors the old settings modal).

import { ProjectsListView } from '@/components/project/ProjectsListView';

export default function WorkspacePage() {
  return <ProjectsListView />;
}
