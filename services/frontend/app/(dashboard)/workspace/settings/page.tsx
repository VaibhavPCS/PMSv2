'use client';

// Workspace SETTINGS route (general / members / delete). Ported from OLD
// app/components/workspace/WorkspaceSettingsModal.tsx. Reached via the gear
// button on the /workspace projects grid.

import { WorkspaceSettingsView } from '@/components/workspace/WorkspaceSettingsView';

export default function WorkspaceSettingsPage() {
  return <WorkspaceSettingsView />;
}
