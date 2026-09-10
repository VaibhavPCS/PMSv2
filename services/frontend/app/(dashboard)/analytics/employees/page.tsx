'use client';

// Route: /analytics/employees — thin wrapper around EmployeesView.
// Mirrors OLD app/routes/analytics/employees.tsx.

import { EmployeesView } from '@/components/analytics/EmployeesView';

export default function EmployeesPage() {
  return <EmployeesView />;
}
