'use client';

// Filters panel (user picker + date range + action buttons) for User Export.
// JSX copied VERBATIM from OLD user-export.tsx. Caller: UserExportView.tsx.

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import type { Employee } from './types';

interface UserExportFiltersProps {
  error: string;
  loading: boolean;
  reportLoading: boolean;
  userId: string;
  setUserId: (id: string) => void;
  userSearch: string;
  setUserSearch: (s: string) => void;
  userPopoverOpen: boolean;
  setUserPopoverOpen: (open: boolean) => void;
  selectedEmployee?: Employee;
  filteredEmployees: Employee[];
  startDate: string;
  setStartDate: (s: string) => void;
  endDate: string;
  setEndDate: (s: string) => void;
  canGenerateReport: boolean;
  canDownload: boolean;
  setReportData: (data: null) => void;
  generateReport: () => void;
  download: (format: 'excel' | 'pdf') => void;
}

export function UserExportFilters({
  error,
  loading,
  reportLoading,
  userId,
  setUserId,
  userSearch,
  setUserSearch,
  userPopoverOpen,
  setUserPopoverOpen,
  selectedEmployee,
  filteredEmployees,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  canGenerateReport,
  canDownload,
  setReportData,
  generateReport,
  download,
}: UserExportFiltersProps) {
  return (
    <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-6 mb-6 space-y-4 no-print">
      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">User</label>
          <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
            <PopoverTrigger
              disabled={loading}
              className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none flex items-center justify-between gap-2"
            >
              <span className={selectedEmployee ? "truncate text-[#111827]" : "text-[#9ca3af]"}>
                {selectedEmployee ? selectedEmployee.userName : loading ? "Loading users..." : "Select user"}
              </span>
              <span className="text-[#9ca3af] text-xs">▼</span>
            </PopoverTrigger>
            <PopoverContent className="p-2 w-[var(--radix-popover-trigger-width)]" align="start">
              <div className="space-y-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search user..."
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2 text-[14px] outline-none focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B]"
                />
                <div className="max-h-60 overflow-y-auto">
                  {filteredEmployees.map(e => (
                    <button
                      key={e.userId}
                      type="button"
                      onClick={() => {
                        setUserId(e.userId)
                        setReportData(null)
                        setUserPopoverOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-[14px] rounded-[6px] hover:bg-[#f5f4f9] ${
                        e.userId === userId ? "bg-[#fff7ed] text-[#F2761B]" : "text-[#111827]"
                      }`}
                    >
                      {e.userName}
                    </button>
                  ))}
                  {!loading && filteredEmployees.length === 0 && (
                    <div className="px-3 py-2 text-[13px] text-[#717182]">
                      No users found
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">Start Date</label>
          <Popover>
            <PopoverTrigger className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none">
              {startDate ? format(new Date(startDate), 'dd-MM-yyyy') : 'Pick start date'}
            </PopoverTrigger>
            <PopoverContent className="p-2">
              <Calendar
                mode="single"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(d) => { setStartDate(d ? format(new Date(d), 'yyyy-MM-dd') : ''); setReportData(null); }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#111827] mb-2">End Date</label>
          <Popover>
            <PopoverTrigger className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none">
              {endDate ? format(new Date(endDate), 'dd-MM-yyyy') : 'Pick end date'}
            </PopoverTrigger>
            <PopoverContent className="p-2">
              <Calendar
                mode="single"
                selected={endDate ? new Date(endDate) : undefined}
                onSelect={(d) => { setEndDate(d ? format(new Date(d), 'yyyy-MM-dd') : ''); setReportData(null); }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={generateReport}
          disabled={!canGenerateReport || reportLoading}
          className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
        >
          {reportLoading ? 'Generating...' : 'Generate Report'}
        </button>
        <button
          onClick={() => download('excel')}
          disabled={!canDownload || loading}
          className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
        >
          Download Excel
        </button>
        <button
          type="button"
          onClick={() => { setStartDate(''); setEndDate(''); setReportData(null); }}
          className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium"
        >
          Clear Dates
        </button>
      </div>
    </div>
  );
}
