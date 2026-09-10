// Role Management route (Next.js App Router port of
// OLD app/routes/administration/role-management/role-management.tsx).
// Thin wrapper composing RoleManagementView, which owns all markup.

import { RoleManagementView } from '@/components/administration/RoleManagementView';

export default function RoleManagementPage() {
  return <RoleManagementView />;
}
