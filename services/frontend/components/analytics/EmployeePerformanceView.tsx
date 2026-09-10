'use client';

// Ported VERBATIM from OLD app/routes/analytics/employee/[userId].tsx.
// react-router useParams/useNavigate -> next/navigation params via prop;
// useAuth -> AuthProvider.

import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/card';
import EmployeePerformanceDashboard from '@/components/analytics/EmployeePerformanceDashboard';
import { useEmployeePerformance } from '@/components/analytics/hooks/useEmployeePerformance';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';

export function EmployeePerformanceView({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { snapshots, loading, error, setDateRange } = useEmployeePerformance(userId || '');

  const isAdmin = ['admin', 'super_admin'].includes(user?.role || '');
  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="p-6">Forbidden</Card>
      </div>
    );
  }

  const userName = user?.name || user?.email || '';
  const userRole = user?.role || '';

  return (
    <div className="p-4 space-y-6">
      <DateRangeFilter
        onChange={(startDate: string, endDate: string) => setDateRange({ startDate, endDate })}
      />
      {loading && <Card className="p-4">Loading...</Card>}
      {error && <Card className="p-4 text-red-600">{error}</Card>}
      {!loading && !error && (
        <EmployeePerformanceDashboard
          userId={userId || ''}
          userName={userName}
          userRole={userRole}
          snapshots={snapshots}
        />
      )}
    </div>
  );
}
