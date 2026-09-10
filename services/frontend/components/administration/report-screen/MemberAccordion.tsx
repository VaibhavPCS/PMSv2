'use client';

// Member details + task table accordion section of the Report Screen.
// JSX copied VERBATIM from OLD report-screen.tsx (the grouped accordion block).
// Caller: ReportScreenView.tsx.

import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, TaskData, ReportData } from './types';

interface MemberAccordionProps {
  members: Member[];
  selectedMember: string;
  reportData: ReportData;
  expandedMembers: Record<string, boolean>;
  toggleMember: (memberId: string) => void;
  onOpenHandover: (task: TaskData) => void;
}

export function MemberAccordion({
  members,
  selectedMember,
  reportData,
  expandedMembers,
  toggleMember,
  onOpenHandover,
}: MemberAccordionProps) {
  return (
    <div className="space-y-4">
      {(selectedMember === 'all'
        ? [...members, { _id: 'unassigned', name: 'Unassigned', email: '', role: '' }]
        : members.filter(m => m._id === selectedMember)
      ).map(member => {
        // Filter tasks for this member
        const memberTasks = reportData.tasks.filter(t => {
          if (member._id === 'unassigned') return !t.assignee;
          return t.assignee?._id === member._id;
        });

        // Skip if no tasks and we are showing 'all'
        if (memberTasks.length === 0 && selectedMember === 'all') return null;

        const isExpanded = expandedMembers[member._id];

        return (
          <Card key={member._id} className={cn(
            "border-slate-200 transition-all duration-300 overflow-hidden",
            isExpanded
              ? "shadow-lg ring-1 ring-primary/20 border-primary/20"
              : "shadow-sm hover:shadow-md hover:border-slate-300"
          )}>
            <div
              className={cn(
                "flex items-center justify-between p-4 cursor-pointer transition-colors duration-200",
                isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/50"
              )}
              onClick={() => toggleMember(member._id)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 shadow-sm",
                  member._id === 'unassigned'
                    ? "bg-slate-100 text-slate-500 ring-2 ring-white"
                    : "bg-gradient-to-br from-primary/10 to-primary/20 text-primary ring-2 ring-primary/10"
                )}>
                  {member._id === 'unassigned' ? '?' : member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                    {member.name}
                  </h3>
                  {member.email && (
                    <p className="text-slate-500 text-sm">
                      {member.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <div className="text-xs font-medium text-slate-500">
                    {memberTasks.filter(t => t.status === 'done').length} / {memberTasks.length} Done
                  </div>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full transition-all duration-500"
                      style={{ width: `${memberTasks.length > 0 ? (memberTasks.filter(t => t.status === 'done').length / memberTasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <Badge variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                  {memberTasks.length} Task{memberTasks.length !== 1 && 's'}
                </Badge>
                <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")}>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden min-h-0">
                <div className="border-t border-slate-100">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-slate-200">
                          <TableHead className="font-semibold text-slate-700">Task Name</TableHead>
                          <TableHead className="font-semibold text-slate-700">Description</TableHead>
                          <TableHead className="font-semibold text-slate-700">Start Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">End Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">Completed Date</TableHead>
                          <TableHead className="font-semibold text-slate-700">Duration (Days)</TableHead>
                          <TableHead className="font-semibold text-slate-700">Status</TableHead>
                          <TableHead className="font-semibold text-slate-700">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberTasks.length > 0 ? (
                          memberTasks.map((task) => (
                            <TableRow key={task._id} className={cn(
                              "transition-colors hover:bg-slate-50/80",
                              task.isRecurring && "bg-purple-50/30 hover:bg-purple-50/60"
                            )}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/task/${task.originalTaskId || task._id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
                                  >
                                    {task.title}
                                  </a>
                                  {task.isRecurring && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-purple-200 text-purple-700 bg-purple-50 px-1.5 shadow-sm">
                                      Recurring
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-slate-600" title={task.description}>
                                {task.description || '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {task.completedAt ? format(new Date(task.completedAt), 'MMM d, yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">{task.durationDays || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  "font-medium border shadow-sm",
                                  task.status === 'done' && task.approvalStatus === 'approved'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : task.status === 'done' && task.approvalStatus === 'pending-approval'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : task.status === 'done' && task.approvalStatus === 'rejected'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : task.status === 'in-progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                )}>
                                  {task.status === 'done' ? (
                                    task.approvalStatus === 'pending-approval' ? 'Pending Approval' :
                                    task.approvalStatus === 'approved' ? 'Approved' :
                                    task.approvalStatus === 'rejected' ? 'Rejected' : 'Done'
                                  ) : (
                                    task.status === 'to-do' ? 'To Do' :
                                    task.status === 'in-progress' ? 'In Progress' :
                                    task.status === 'on-hold' ? 'On Hold' : task.status
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {(task.handoverNotes || (task.handoverAttachments && task.handoverAttachments.length > 0)) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent accordion toggle
                                      onOpenHandover(task);
                                    }}
                                  >
                                    <FileText className="h-4 w-4 mr-1.5" />
                                    Handover
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                                  <CheckCircle2 className="h-5 w-5 text-slate-300" />
                                </div>
                                <p>No tasks found for this member</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
