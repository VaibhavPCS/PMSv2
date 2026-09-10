'use client';

// Legend card for the task calendar. Markup ported VERBATIM from OLD
// app/routes/administration/calendar.tsx (Legend block).

import { Card, CardContent } from '@/components/ui/card';
import { statusColors } from './calendar-utils';

export function CalendarLegend() {
  return (
    <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Levels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-900">Task Status</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
              {Object.entries(statusColors).map(([status, colors]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className={`w-2.5 h-2.5 ${colors.bg} rounded-full ring-4 ${colors.ring}`}></div>
                  <span className="text-xs font-medium text-gray-700 capitalize">{status.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Day Tasks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
              <h3 className="text-sm font-semibold text-gray-900">Multi-Day Tasks</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                <span className="text-base font-bold text-green-600">▶</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900">Start</div>
                  <div className="text-[10px] text-gray-500 truncate">Task begins</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                <span className="text-base font-bold text-blue-600">─</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900">Ongoing</div>
                  <div className="text-[10px] text-gray-500 truncate">In progress</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                <span className="text-base font-bold text-purple-600">◀</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900">End</div>
                  <div className="text-[10px] text-gray-500 truncate">Task ends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
