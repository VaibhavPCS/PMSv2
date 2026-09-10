// Project Analytics route (Next.js App Router port of
// OLD app/routes/administration/project-management/project-analytics.tsx).
// Thin wrapper composing ProjectAnalyticsView, which owns all markup.

import { ProjectAnalyticsView } from '@/components/administration/project-analytics/ProjectAnalyticsView';

export default function ProjectAnalyticsPage() {
  return <ProjectAnalyticsView />;
}
