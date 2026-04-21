import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { RecentTasks } from '@/components/dashboard/RecentTasks';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your workspace at a glance" />
      <StatsCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentProjects />
        <RecentTasks />
      </div>
    </div>
  );
}