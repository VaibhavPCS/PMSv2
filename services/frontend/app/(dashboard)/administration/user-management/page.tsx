// User Management route (Next.js App Router port of
// OLD app/routes/administration/user-management/user-management.tsx).
// Thin wrapper composing UserManagementView, which owns all markup.

import { UserManagementView } from '@/components/administration/UserManagementView';

export default function UserManagementPage() {
  return <UserManagementView />;
}
