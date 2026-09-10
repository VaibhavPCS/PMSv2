'use client';

// Data + actions for the User Productivity Export screen.
// Extracted VERBATIM from OLD user-export.tsx (state, employee fetch,
// generateReport, download). Consumed by UserExportView.tsx.

import { useEffect, useState } from 'react';
import { apiClient as axios } from '@/lib/axios';
import type { Employee, ReportData } from './types';

export function useUserExport() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [userPopoverOpen, setUserPopoverOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('/analytics/users');
        const list: Employee[] = (res.data?.users || []).map((e: any) => ({ userId: e.userId, userName: e.userName }));
        setEmployees(list);
        if (list.length > 0) setUserId(list[0].userId);
      } catch (e: any) {
        setError('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const canDownload = !!userId && !!startDate && !!endDate;
  const canGenerateReport = !!userId && !!startDate && !!endDate;

  const selectedEmployee = employees.find(e => e.userId === userId);
  const filteredEmployees = employees.filter(e =>
    e.userName.toLowerCase().includes(userSearch.toLowerCase())
  );

  const generateReport = async () => {
    if (!canGenerateReport) return;
    try {
      setReportLoading(true);
      setError('');

      // Try snapshot-based endpoint first (40x faster!)
      const res = await axios.get(`/analytics/snapshot/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`);

      console.log('📊 Report Data Received:', res.data);

      // Transform snapshot data to match expected format
      const snapshotData = res.data;

      if (snapshotData.source === 'snapshot_range') {
        // Using snapshot data - 10-50ms response time
        console.log('✅ Using cached snapshot data (fast!)', {
          snapshotCount: snapshotData.snapshotCount,
          dateRange: snapshotData.dateRange
        });
      } else {
        // Fallback to real-time calculation - 500-2000ms response time
        console.warn('⚠️ No snapshot available, using real-time calculation (slower)');
      }

      setReportData(snapshotData);
    } catch (e: any) {
      console.error('❌ Report Generation Error:', e);
      setError('Failed to generate report: ' + (e.response?.data?.message || e.message));
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const download = async (format: 'excel' | 'pdf') => {
    if (!canDownload) return;
    const url = format === 'excel'
      ? `/analytics/export/user/${userId}?startDate=${startDate}&endDate=${endDate}`
      : `/analytics/export/user/${userId}/pdf?startDate=${startDate}&endDate=${endDate}`;

    const headers = format === 'excel' ? { 'Accept': 'text/csv' } : {};
    const resp = await axios.get(url, { responseType: 'blob', headers });
    const blob = new Blob([resp.data], { type: format === 'excel' ? 'text/csv' : 'application/pdf' });
    const link = document.createElement('a');
    const fname = format === 'excel' ? `user-${userId}-productivity.csv` : `user-${userId}-productivity.pdf`;
    link.href = URL.createObjectURL(blob);
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  return {
    employees, userId, setUserId,
    userSearch, setUserSearch,
    userPopoverOpen, setUserPopoverOpen,
    startDate, setStartDate, endDate, setEndDate,
    loading, reportLoading, error,
    reportData, setReportData,
    canDownload, canGenerateReport,
    selectedEmployee, filteredEmployees,
    generateReport, download,
  };
}
