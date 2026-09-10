'use client';

// Thin orchestrator ported from OLD app/features/analytics/components/PersonalStats.tsx
// (859 LOC). State / data fetching / generate / download logic kept VERBATIM;
// the date-range controls and the detailed report body are split into
// PersonalReportControls + PersonalReport to stay well under 1000 LOC.
//   - useUserAnalytics  -> @/hooks/use-analytics
//   - useAuth           -> @/providers/AuthProvider
//   - axios snapshot/blob calls -> apiClient from @/lib/axios

import { memo, useState } from 'react';
import { useUserAnalytics } from '@/hooks/use-analytics';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import type { ReportData } from '@/types';
import { PersonalReportControls } from '@/components/analytics/PersonalReportControls';
import { PersonalReport } from '@/components/analytics/PersonalReport';

interface PersonalStatsProps {
  userIdOverride?: string | null;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const PersonalStats = memo(function PersonalStats(props: PersonalStatsProps) {
  const { userIdOverride, headerTitle, headerSubtitle } = props || {};
  const { user, isLoading: authLoading } = useAuth();

  const userId = userIdOverride || user?._id || (user as any)?.id;

  // State for Date Range Report
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Existing Simple Stats Data (fetched only if no report is active to save resources)
  const { isLoading: queryLoading } = useUserAnalytics(
    userId || '',
    { enabled: !!userId && !reportData }
  );

  const canGenerateReport = !!userId && !!startDate && !!endDate;
  const canDownload = !!userId && !!startDate && !!endDate;

  const generateReport = async () => {
    if (!canGenerateReport) return;
    try {
      setReportLoading(true);
      setReportError('');

      // Try snapshot-based endpoint first (40x faster!)
      const res = await apiClient.get(`/analytics/snapshot/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`);

      console.log('📊 Personal Report Data Received:', res.data);

      // Transform snapshot data to match expected format
      const snapshotData = res.data;

      if (snapshotData.source === 'snapshot_range') {
        console.log('✅ Using cached snapshot data (fast!)', {
          snapshotCount: snapshotData.snapshotCount,
          dateRange: snapshotData.dateRange,
        });
      } else {
        console.warn('⚠️ No snapshot available, using real-time calculation (slower)');
      }

      setReportData(snapshotData);
    } catch (e: any) {
      setReportError('Failed to generate report: ' + (e.response?.data?.message || e.message));
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
    try {
      const resp = await apiClient.get(url, { responseType: 'blob', headers });
      const blob = new Blob([resp.data], { type: format === 'excel' ? 'text/csv' : 'application/pdf' });
      const link = document.createElement('a');
      const fname = format === 'excel' ? `user-${userId}-productivity.csv` : `user-${userId}-productivity.pdf`;
      link.href = URL.createObjectURL(blob);
      link.download = fname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('Download failed', e);
      setReportError('Failed to download report');
    }
  };

  // Combined loading state for initial load
  if (authLoading || (queryLoading && !reportData)) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">
                {authLoading ? 'Loading authentication...' : 'Loading your productivity stats...'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="font-medium">Unable to load user information</p>
            </div>
            <p className="text-sm text-red-500 mt-2">
              User ID not found. Please try logging out and logging back in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">{headerTitle || 'Personal Productivity'}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {headerSubtitle || 'Track your task progress, analyze performance, and download reports'}
        </p>
      </div>

      {/* Date Range Selection Controls */}
      <PersonalReportControls
        startDate={startDate}
        endDate={endDate}
        reportError={reportError}
        reportLoading={reportLoading}
        canGenerateReport={canGenerateReport}
        onStartDateChange={(value) => { setStartDate(value); setReportData(null); }}
        onEndDateChange={(value) => { setEndDate(value); setReportData(null); }}
        onGenerate={generateReport}
        onClear={() => { setStartDate(''); setEndDate(''); setReportData(null); }}
      />

      {/* Content Rendering: Either Detailed Report or Simple Stats */}
      {reportData ? (
        <PersonalReport
          reportData={reportData}
          canDownload={canDownload}
          onDownloadExcel={() => download('excel')}
          onPrint={() => window.print()}
        />
      ) : (
        /* Fallback to simple stats if no report generated (cards commented out in original) */
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" />
        </>
      )}
    </div>
  );
});
