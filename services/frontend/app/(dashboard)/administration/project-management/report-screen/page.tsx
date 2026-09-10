// Report Screen route (Next.js App Router port of
// OLD app/routes/administration/project-management/report-screen.tsx).
// Thin wrapper composing ReportScreenView, which owns all markup.

import { ReportScreenView } from '@/components/administration/report-screen/ReportScreenView';

export default function ReportScreenPage() {
  return <ReportScreenView />;
}
