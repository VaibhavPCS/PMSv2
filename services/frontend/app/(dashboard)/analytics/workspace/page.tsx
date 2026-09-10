'use client';

// Route: /analytics/workspace — thin wrapper around WorkspaceAnalyticsView
// (Workspace Intelligence). Mirrors OLD app/routes/analytics/workspace.tsx.

import { WorkspaceAnalyticsView } from '@/components/analytics/WorkspaceAnalyticsView';

export default function WorkspaceAnalyticsPage() {
  return <WorkspaceAnalyticsView />;
}
