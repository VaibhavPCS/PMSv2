'use client';

// Route: /analytics/employee/[userId] — thin wrapper around
// EmployeePerformanceView. Mirrors OLD app/routes/analytics/employee/[userId].tsx.
// react-router useParams -> Next App Router dynamic-segment params (use()).

import { use } from 'react';
import { EmployeePerformanceView } from '@/components/analytics/EmployeePerformanceView';

export default function EmployeePerformancePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return <EmployeePerformanceView userId={userId} />;
}
