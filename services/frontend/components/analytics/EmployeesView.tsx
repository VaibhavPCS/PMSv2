'use client';

// Ported VERBATIM from OLD app/routes/analytics/employees.tsx (Employee list).
// react-router useNavigate -> next/navigation useRouter; useAuth -> AuthProvider.

import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import EmployeeListTable from '@/components/analytics/EmployeeListTable';
import { useEmployeeList } from '@/components/analytics/hooks/useEmployeeList';

export function EmployeesView() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role || '');
  const {
    employees,
    loading,
    error,
    pagination,
    sortConfig,
    handleSort,
    handlePageChange,
    handleSearch,
  } = useEmployeeList();

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="p-6">Forbidden</Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-4">
        <Input placeholder="Search employees..." onChange={(e) => handleSearch(e.target.value)} />
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading && <Card className="p-4">Loading...</Card>}
      {error && <Card className="p-4 text-red-600">{error}</Card>}
      {!loading && !error && (
        <EmployeeListTable
          employees={employees}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={(id) => router.push(`/analytics/employee/${id}`)}
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
          className="px-3 py-1 border rounded"
        >
          Prev
        </button>
        <div>Page {pagination.page}</div>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
