'use client';

// User Productivity Export view (Next.js App Router port of OLD user-export.tsx).
// Page shell + print styles copied VERBATIM; filters + report delegated to
// UserExportFilters / UserExportReport; logic in use-user-export.ts.
// Caller: app/(dashboard)/administration/project-management/user-export/page.tsx.

import { useUserExport } from './use-user-export';
import { UserExportFilters } from './UserExportFilters';
import { UserExportReport } from './UserExportReport';

export function UserExportView() {
  const {
    userId, setUserId,
    userSearch, setUserSearch,
    userPopoverOpen, setUserPopoverOpen,
    startDate, setStartDate, endDate, setEndDate,
    loading, reportLoading, error,
    reportData, setReportData,
    canDownload, canGenerateReport,
    selectedEmployee, filteredEmployees,
    generateReport, download,
  } = useUserExport();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[24px] font-semibold text-[#1f2937] mb-2 no-print">User Productivity Export</h1>
        <p className="text-[#717182] text-[14px] mb-6 no-print">Select a user and date range, then download as Excel (CSV) or PDF.</p>

        <UserExportFilters
          error={error}
          loading={loading}
          reportLoading={reportLoading}
          userId={userId}
          setUserId={setUserId}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userPopoverOpen={userPopoverOpen}
          setUserPopoverOpen={setUserPopoverOpen}
          selectedEmployee={selectedEmployee}
          filteredEmployees={filteredEmployees}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          canGenerateReport={canGenerateReport}
          canDownload={canDownload}
          setReportData={setReportData}
          generateReport={generateReport}
          download={download}
        />

        {reportData && (
          <UserExportReport
            reportData={reportData}
            canDownload={canDownload}
            download={download}
          />
        )}
      </div>
    </div>
  );
}
