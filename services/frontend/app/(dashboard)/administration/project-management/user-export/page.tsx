// User Export route (Next.js App Router port of
// OLD app/routes/administration/project-management/user-export.tsx).
// Thin wrapper composing UserExportView, which owns all markup.

import { UserExportView } from '@/components/administration/user-export/UserExportView';

export default function UserExportPage() {
  return <UserExportView />;
}
