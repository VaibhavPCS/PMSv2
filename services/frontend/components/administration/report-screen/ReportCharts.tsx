'use client';

// Summary stats + charts section of the Report Screen.
// JSX + recharts config copied VERBATIM from OLD report-screen.tsx
// (Summary Stats grid, Velocity/Team Health, Status/Member Performance charts).
// Caller: ReportScreenView.tsx.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileBarChart, CheckCircle2, AlertCircle, Clock, Zap, Timer, TrendingUp, Activity, Info } from "lucide-react";
import type { ReportData } from './types';

interface ReportChartsProps {
  reportData: ReportData;
  avgCompletionTime: number | string;
  priorityCounts: { high: number; urgent: number; medium: number; low: number };
  velocityData: { date: string; tasks: number }[];
  teamPerformanceData: { subject: string; A: number; fullMark: number }[];
  statusChartData: { name: string; value: number; color: string }[];
  memberChartData: { name: string; Assigned: number; Completed: number; Reworks: number }[];
}

export function ReportCharts({
  reportData,
  avgCompletionTime,
  priorityCounts,
  velocityData,
  teamPerformanceData,
  statusChartData,
  memberChartData,
}: ReportChartsProps) {
  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Tasks</p>
                <h3 className="text-2xl font-bold">{reportData.totalTasks}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <FileBarChart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Completion Rate</p>
                <h3 className="text-2xl font-bold text-green-600">
                  {reportData.totalTasks > 0
                    ? Math.round((reportData.statusBreakdown.approved / reportData.totalTasks) * 100)
                    : 0}%
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg. Completion Time</p>
                <h3 className="text-2xl font-bold text-blue-600">
                  {avgCompletionTime} <span className="text-sm font-normal text-slate-500">days</span>
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Timer className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Urgent & High Priority</p>
                <h3 className="text-2xl font-bold text-orange-600">
                  {priorityCounts.urgent + priorityCounts.high}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Needs Approval</p>
                <h3 className="text-2xl font-bold text-amber-600">
                  {reportData.statusBreakdown.notApproved}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                <h3 className="text-2xl font-bold text-red-600">
                  {reportData.tasks.filter(t => t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0))).length}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Velocity & Team Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Velocity Chart
            </CardTitle>
            <CardDescription>Tasks completed over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Team Health
                </CardTitle>
                <CardDescription>Overall performance metrics</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Metric Calculations</DialogTitle>
                    <DialogDescription>How we measure team health</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">Reliability</h4>
                      <p className="text-xs text-slate-500">Percentage of tasks completed on or before the due date.</p>
                      <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        (On-time / Total Completed) × 100
                      </code>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">Quality</h4>
                      <p className="text-xs text-slate-500">Percentage of tasks approved without any rejections or rework.</p>
                      <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        (No Reworks / Total Completed) × 100
                      </code>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">Velocity</h4>
                      <p className="text-xs text-slate-500">Completion rate relative to the total number of tasks assigned in this period.</p>
                      <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        (Completed / Total Assigned) × 100
                      </code>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">Efficiency</h4>
                      <p className="text-xs text-slate-500">Ratio of estimated duration versus actual time taken.</p>
                      <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        (Estimated / Actual) × 100
                      </code>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={teamPerformanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Status Breakdown Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Distribution of active tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Member Performance</CardTitle>
            <CardDescription>Tasks assigned vs. completed vs. reworks</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Assigned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reworks" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
