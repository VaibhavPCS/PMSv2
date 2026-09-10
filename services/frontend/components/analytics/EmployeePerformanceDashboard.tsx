'use client';

// Ported VERBATIM from OLD app/features/analytics/components/EmployeePerformanceDashboard.tsx.
// NOTE: the OLD file imported the header from itself by mistake; here the header
// resolves to the dedicated EmployeePerformanceHeader component.

import EmployeePerformanceHeader from '@/components/analytics/EmployeePerformanceHeader';
import MetricsCards from '@/components/analytics/MetricsCards';
import TaskDistributionChart from '@/components/analytics/TaskDistributionChart';
import ApprovalMetricsChart from '@/components/analytics/ApprovalMetricsChart';
import TimeMetricsChart from '@/components/analytics/TimeMetricsChart';
import ProjectInvolvementTable from '@/components/analytics/ProjectInvolvementTable';
import { Card } from '@/components/ui/card';

export default function EmployeePerformanceDashboard({
  userId,
  userName,
  userRole,
  snapshots,
}: {
  userId: string;
  userName: string;
  userRole: string;
  snapshots: any[];
}) {
  const latest = snapshots?.[0] || { metrics: {}, projects: [], trends: {} };
  return (
    <div className="space-y-6">
      <EmployeePerformanceHeader userId={userId} userName={userName} userRole={userRole} />
      <MetricsCards metrics={latest.metrics} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <TaskDistributionChart metrics={latest.metrics} />
        </Card>
        <Card className="p-4">
          <ApprovalMetricsChart metrics={latest.metrics} />
        </Card>
      </div>
      <Card className="p-4">
        <TimeMetricsChart snapshots={snapshots} />
      </Card>
      <Card className="p-4">
        <ProjectInvolvementTable projects={latest.projects} />
      </Card>
    </div>
  );
}
