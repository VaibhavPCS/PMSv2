'use client';

// Split out of OLD app/features/analytics/components/PersonalStats.tsx
// (the "Date Range Selection Controls" block). JSX + Figma hex copied VERBATIM.

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PersonalReportControlsProps {
  startDate: string;
  endDate: string;
  reportError: string;
  reportLoading: boolean;
  canGenerateReport: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGenerate: () => void;
  onClear: () => void;
}

export function PersonalReportControls({
  startDate,
  endDate,
  reportError,
  reportLoading,
  canGenerateReport,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onClear,
}: PersonalReportControlsProps) {
  return (
    <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4 no-print shadow-sm">
      {reportError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{reportError}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onSelect={(d) => { onStartDateChange(d ? format(new Date(d), 'yyyy-MM-dd') : ''); }}
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
                onSelect={(d) => { onEndDateChange(d ? format(new Date(d), 'yyyy-MM-dd') : ''); }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-end">
          <div className="flex gap-3 w-full">
              <button
              onClick={onGenerate}
              disabled={!canGenerateReport || reportLoading}
              className="flex-1 justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
              >
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>
              <button
              type="button"
              onClick={onClear}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium"
              >
              Clear
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
