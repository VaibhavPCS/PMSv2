// Workspace Comprehensive Report route (Next.js App Router port of
// OLD app/routes/administration/project-management/workspace-report.tsx).
// Thin wrapper composing WorkspaceReportView, which owns all markup.

import { WorkspaceReportView } from '@/components/administration/workspace-report/WorkspaceReportView';

export default function WorkspaceReportPage() {
  return <WorkspaceReportView />;
}
