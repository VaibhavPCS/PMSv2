'use client';

// Right-column "Project Statistics" donut chart + month/year picker.
// Markup copied verbatim from the old dashboard.tsx.

import { Calendar, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatMonthYear } from "@/components/dashboard/dashboard-helpers";
import type { MonthlyProjectStats } from "@/components/dashboard/dashboard-helpers";

interface ProjectStatisticsChartProps {
  monthlyProjectStats: MonthlyProjectStats;
  selectedMonth: number;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showMonthPicker: boolean;
  setShowMonthPicker: (open: boolean) => void;
  handleMonthChange: (month: number, year: number) => void;
}

export function ProjectStatisticsChart({
  monthlyProjectStats,
  selectedMonth,
  selectedYear,
  setSelectedYear,
  showMonthPicker,
  setShowMonthPicker,
  handleMonthChange,
}: ProjectStatisticsChartProps) {
  const chartData = [
    {
      name: "Completed",
      value: monthlyProjectStats.completed,
      fill: "#8a55d2",
    },
    {
      name: "Planning",
      value: monthlyProjectStats.planning,
      fill: "#f2761b",
    },
    {
      name: "In Progress",
      value: monthlyProjectStats.inProgress,
      fill: "#59c3c3",
    },
    {
      name: "On Hold",
      value: monthlyProjectStats.onHold,
      fill: "#CD2812",
    },
  ];

  return (
    <Card className="border border-[#e9ecf1] order-2 md:order-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-['Inter'] font-medium text-[16px] text-[#2e2e30]">
            Project Statistics
          </CardTitle>
          {/* Month/Year Picker */}
          <DropdownMenu open={showMonthPicker} onOpenChange={setShowMonthPicker}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-[25px] rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[8px] flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {formatMonthYear(selectedMonth, selectedYear)}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] p-4">
              <div className="space-y-4">
                {/* Year Selector */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newYear = selectedYear - 1;
                      setSelectedYear(newYear);
                      handleMonthChange(selectedMonth, newYear);
                    }}
                    className="h-8 px-2"
                  >
                    ←
                  </Button>
                  <span className="text-sm font-semibold">{selectedYear}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newYear = selectedYear + 1;
                      setSelectedYear(newYear);
                      handleMonthChange(selectedMonth, newYear);
                    }}
                    className="h-8 px-2"
                  >
                    →
                  </Button>
                </div>
                {/* Month Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                  ].map((monthName, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-xs",
                        selectedMonth === index && "bg-blue-100 border-blue-500"
                      )}
                      onClick={() => handleMonthChange(index, selectedYear)}
                    >
                      {monthName}
                    </Button>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* Pie Chart - Always on top */}
          <div className="h-[200px] w-[200px] relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      style={{
                        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                        transition: 'all 0.3s ease-in-out'
                      }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  itemStyle={{
                    color: '#333',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text - Shows monthly total with smooth animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 ease-in-out">
              <p className="font-['Inter'] font-semibold text-[20px] text-black leading-[23px] transition-all duration-300">
                {monthlyProjectStats.total}
              </p>
              <p className="font-['Inter'] font-normal text-[12px] text-black leading-[12px] mt-1">
                Total Projects
              </p>
            </div>
          </div>

          {/* Legend with animations - 2x2 grid for all screen sizes */}
          <div className="grid grid-cols-2 gap-[15px] w-full max-w-[300px]">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 transition-all duration-300 hover:scale-105 min-w-0"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex items-center gap-[5px] min-w-0">
                  <div
                    className="w-[10px] h-[10px] rounded-full transition-all duration-300 hover:scale-125 shrink-0"
                    style={{
                      backgroundColor: item.fill,
                      boxShadow: `0 2px 6px ${item.fill}40`
                    }}
                  />
                  <span className="font-['Inter'] font-semibold text-[12px] text-[#767676] truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-['Inter'] font-bold text-[12px] text-neutral-700 transition-all duration-300 shrink-0">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
