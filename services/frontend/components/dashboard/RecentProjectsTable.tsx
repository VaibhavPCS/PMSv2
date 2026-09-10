'use client';

// "All Projects" table (2/3 width) with workspace switcher + search.
// Markup copied verbatim from the old dashboard.tsx.

import { RefObject } from "react";
import { Building2, ChevronDown, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateDDMMYYYY, calculateDaysBetween } from "@/lib/date-utils";
import { limitWords } from "@/components/dashboard/dashboard-helpers";
import type { Project, Workspace } from "@/components/dashboard/dashboard-helpers";

interface RecentProjectsTableProps {
  recentProjects: Project[];
  filteredProjects: Project[];
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  projectSearchQuery: string;
  setProjectSearchQuery: (value: string) => void;
  handleSwitchWorkspace: (workspaceId: string) => void;
  handleViewProject: (projectId: string) => void;
  projectsTableRef: RefObject<HTMLDivElement | null>;
  syncedHeight: number | null;
}

export function RecentProjectsTable({
  recentProjects,
  filteredProjects,
  currentWorkspace,
  workspaces,
  projectSearchQuery,
  setProjectSearchQuery,
  handleSwitchWorkspace,
  handleViewProject,
  projectsTableRef,
  syncedHeight,
}: RecentProjectsTableProps) {
  return (
    <div className="lg:col-span-2 order-3 md:order-none">
      <Card className="shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
        <CardHeader className="px-[20px] py-[15px]">
          <div className="flex flex-col gap-[20px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[16px]">
                <div>
                  <h3 className="font-['Inter'] font-normal text-[16px] text-black leading-[20px]">
                    All Projects
                  </h3>
                  <p className="font-['Inter'] font-medium text-[20px] text-black leading-[20px] inline ml-2">
                    {recentProjects.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-[15px]">
                {/* Workspace Dropdown (visible only when workspace exists) */}
                {currentWorkspace && workspaces.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                      >
                        <Building2 className="w-4 h-4" />
                        {currentWorkspace.name}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    {workspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace._id}
                        onClick={() => handleSwitchWorkspace(workspace._id)}
                        className={cn(
                          "cursor-pointer",
                          currentWorkspace?._id === workspace._id && "bg-blue-50"
                        )}
                      >
                        {workspace.name}
                        {currentWorkspace?._id === workspace._id && (
                          <span className="ml-auto text-blue-600">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>
            </div>
            <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px] tracking-[0.5px]">
              Complete project profile including milestones and task details
            </p>
            <div className="mt-4 mb-2">
              <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center w-full sm:w-[300px]">
                <Search className="w-[15px] h-[15px] text-[#040110] opacity-60 mr-2" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60 w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-[20px] pb-[15px]">
          <div
            ref={projectsTableRef}
            className="border border-[#cccccc] rounded-[10px] overflow-auto scrollbar-hide"
            style={{
              height: syncedHeight ? `${syncedHeight}px` : 'auto',
              overflowY: syncedHeight ? 'auto' : 'visible'
            }}
          >
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-[#d5e5ff]">
                  <th className="text-left px-[8px] sm:px-[16px] py-[12px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)] min-h-[40px] w-[40px] sm:w-[60px]">
                    <div className="flex items-center gap-2">
                      S.No
                    </div>
                  </th>
                  <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)] min-h-[40px]">
                    <div className="flex items-center gap-2">
                      Title
                      <Filter className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2">
                      Description
                      <Filter className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2">
                      Status
                      <Filter className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2">
                      Duration
                      <Filter className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2">
                      Days
                      <Filter className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-[16px] py-[14px] text-center text-[12px] font-['Inter'] text-black">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project, index) => (
                    <tr
                      key={project._id}
                      onClick={() => handleViewProject(project._id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-[#e6f2ff]",
                        index % 2 === 1 ? "bg-[#f2f7ff]" : ""
                      )}
                    >
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px]">
                        {index + 1}
                      </td>
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[150px] sm:max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={project.title}>
                        {limitWords(project.title, 2)}
                      </td>
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[180px] sm:max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap" title={project.description || "No description"}>
                        {limitWords(project.description || "No description", 3)}
                      </td>
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px]">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px]">
                        <div className="flex flex-col gap-1">
                          <div className="text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[#1a932e] tracking-[0.5px] whitespace-nowrap">
                            {formatDateDDMMYYYY(project.startDate)}
                          </div>
                          <div className="text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[#cd2812] tracking-[0.5px] whitespace-nowrap">
                            {formatDateDDMMYYYY(project.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-semibold text-black tracking-[0.5px] whitespace-nowrap">
                        {calculateDaysBetween(project.startDate, project.endDate)} days
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
