'use client';

import React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { TruncatedTextModal } from "@/components/ui/truncated-text-modal";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { TeamAvatars } from "@/components/project/TeamAvatars";
import { ProjectOverviewPanel } from "@/components/project/ProjectOverviewPanel";
import { InviteMembersButton } from "@/components/project/InviteMembersButton";
import { AttachmentsSidebar } from "@/components/project/AttachmentsSidebar";
import type { Project, FilterType, TaskStats } from "./types";

interface ProjectHeaderProps {
  project: Project;
  taskStats: TaskStats;
  filters: FilterType;
  updateFilter: (key: keyof FilterType, value: string) => void;
  clearFilters: () => void;
  isAdmin: boolean;
  isProjectLead: boolean;
  permissionsIsAdmin: boolean;
  onOpenMembers: () => void;
  onInviteSuccess: () => void | Promise<void>;
  onDeleteAttachment: (attachmentId: string) => void | Promise<void>;
  onPreviewAttachment: (attachment: NonNullable<Project['attachments']>[0]) => void;
  onUploadClick: () => void;
}

export function ProjectHeader({
  project,
  taskStats,
  filters,
  updateFilter,
  clearFilters,
  isAdmin,
  isProjectLead,
  permissionsIsAdmin,
  onOpenMembers,
  onInviteSuccess,
  onDeleteAttachment,
  onPreviewAttachment,
  onUploadClick,
}: ProjectHeaderProps) {
  return (
    <>
      {/* MOBILE HEADER (unchanged) */}
      <div className="block md:hidden bg-white border-b p-3 sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumb />
        </div>

        <div className="flex items-center justify-between mb-3">
          {/* Filter Button - Left Side */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-72">
              <SheetHeader>
                <SheetTitle className="text-base">Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Search</Label>
                  <Input
                    placeholder="Search tasks..."
                    value={filters.search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value: string) => updateFilter("status", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">Active</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={(value: string) => updateFilter("priority", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={clearFilters} variant="outline" className="w-full h-8 text-sm">
                  Clear All
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Team Avatars - Right Side (For Project Lead or Admin) */}
          {(isProjectLead || isAdmin) && (
            <TeamAvatars
              members={project.members || []}
              maxVisible={3}
              onClick={onOpenMembers}
            />
          )}
        </div>

        {/* MOBILE PROJECT DETAILS - Custom Layout */}
        <div className="bg-[#E5EFFF] rounded-[10px] p-[15px] space-y-3 mt-3">
          {/* Project Title */}
          <div>
            <h1 className="text-base font-bold text-[#040110] mb-1">
              {project.title}
            </h1>
          </div>

          {/* Progress Bar - Full Width */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Progress
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#040110]">{project.progress}%</span>
              <Progress value={project.progress} className="flex-1 h-2" />
            </div>
          </div>

          {/* Project Lead */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project Lead
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {(project.projectHeads?.length
                ? project.projectHeads.map(h => h.name).filter(Boolean).join(', ')
                : project.projectHead?.name) || '—'}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Description
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              <TruncatedTextModal
                text={project.description}
                lines={3}
                ellipsisClassName="text-[#040110] bg-[#E5EFFF]"
                modalBgClassName="bg-[#E5EFFF]"
                modalTitle="Description"
              />
            </div>
          </div>

          {/* Project Start Date */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project Start Date
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {(() => {
                const date = new Date(project.startDate);
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          </div>

          {/* Project End Date */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project End Date
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {(() => {
                const date = new Date(project.endDate);
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          </div>

          {/* Duration & Status - 1x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
                Duration
              </div>
              <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
                {(() => {
                  const start = new Date(project.startDate);
                  const end = new Date(project.endDate);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return `${Math.max(1, diffDays)} Days`;
                })()}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
                Status
              </div>
              <StatusBadge status={project.status} />
            </div>
          </div>

          {/* Task Stats - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D1E3FF]">
            {[
              {
                label: "Total",
                value: taskStats.total,
                bg: "#E0E7FF",
                stripe: "#6366F1",
              },
              {
                label: "Done",
                value: taskStats.completed,
                bg: "#D1FAE5",
                stripe: "#10B981",
              },
              {
                label: "Active",
                value: taskStats.inProgress,
                bg: "#FEF3C7",
                stripe: "#F59E0B",
              },
              {
                label: "Overdue",
                value: taskStats.overdue,
                bg: "#FED7AA",
                stripe: "#F97316",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-[6px] py-2 px-1 text-center"
                style={{ backgroundColor: stat.bg }}
              >
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[2px]"
                  style={{ backgroundColor: stat.stripe }}
                />
                <div className="text-sm font-bold text-[#040110]">{stat.value}</div>
                <div className="text-xs text-[#040110] opacity-70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP HEADER */}
      <div className="hidden md:block bg-white border-b px-4 py-3">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumb />
        </div>

        {/* Header: Title, Progress, Team Avatars, Invite Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-[5px]">
            <h1 className="text-[24px] font-bold font-['Inter'] text-[#040110] leading-normal">{project.title}</h1>
            <p className="text-[14px] font-normal font-['Work_Sans'] text-[#040110] opacity-60 leading-normal truncate max-w-md">{project.description}</p>
          </div>

          <div className="flex items-center gap-[11px]">
            {/* Progress Bar - Figma Style */}
            <div className="flex flex-col gap-[5px] items-end">
              <div className="flex items-center justify-between w-[150px] text-[14px] font-normal font-['Inter'] text-neutral-700">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="bg-[#e9edf0] h-[10px] w-[150px] rounded-[8px] relative">
                <div
                  className="absolute bg-[#3a5afe] h-[10px] left-0 top-0 rounded-[8px]"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {/* Team Avatars */}
            <TeamAvatars
              members={project.members || []}
              maxVisible={3}
              onClick={(isAdmin || isProjectLead) ? onOpenMembers : undefined}
            />

            {/* Invite/Add Members (visible only to Project Lead) */}
            {isProjectLead && (
              <InviteMembersButton
                projectId={project._id}
                workspaceId={typeof window !== "undefined" ? (localStorage.getItem("currentWorkspaceId") || undefined) : undefined}
                onInviteSuccess={onInviteSuccess}
              />
            )}
            {/* Existing Add employee button is provided by InviteMembersButton */}
          </div>
        </div>

        {/* Project Overview Heading */}
        <div className="mb-3">
          <h2 className="text-[18px] font-semibold font-['Inter'] text-[#040110]">
            Project Overview
          </h2>
        </div>

        {/* Three Column Layout: Metrics + Overview Panel + Attachments */}
        <div className="flex flex-wrap xl:flex-nowrap gap-4">
          {/* Left: Metric Cards */}
          <div className="w-full md:w-auto xl:w-[238px] flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3">
              {[
                {
                  label: "Total Task",
                  value: taskStats.total,
                  bg: "#E0E7FF",
                  stripe: "#6366F1",
                  textColor: "#040110"
                },
                {
                  label: "Completed",
                  value: taskStats.completed,
                  bg: "#D1FAE5",
                  stripe: "#10B981",
                  textColor: "#040110"
                },
                {
                  label: "Active",
                  value: taskStats.inProgress,
                  bg: "#FEF3C7",
                  stripe: "#F59E0B",
                  textColor: "#040110"
                },
                {
                  label: "Overdue",
                  value: taskStats.overdue,
                  bg: "#FED7AA",
                  stripe: "#F97316",
                  textColor: "#040110"
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="relative rounded-[8px] h-[114px] flex flex-col justify-center pl-[19px] pr-[14px]"
                  style={{ backgroundColor: stat.bg }}
                >
                  {/* 5px Vertical Stripe */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[28px] rounded-r-[4px]"
                    style={{ backgroundColor: stat.stripe }}
                  />

                  {/* Label */}
                  <div className="text-[14px] font-normal font-['Inter'] mb-[4px]" style={{ color: stat.textColor }}>
                    {stat.label}
                  </div>

                  {/* Number */}
                  <div className="text-[34px] font-bold font-['Inter'] leading-none" style={{ color: stat.textColor }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Project Overview Panel */}
          <div className="w-full md:flex-1 xl:w-[560px] xl:flex-none min-w-[300px]">
            <ProjectOverviewPanel
              projectManager={project.creator.name}
              projectHead={project.projectHead?.name}
              projectHeads={(project.projectHeads || []).map(h => h.name).filter(Boolean)}
              description={project.description}
              startDate={project.startDate}
              endDate={project.endDate}
              status={project.status}
            />
          </div>

          {/* Right: Attachments Sidebar */}
          <div className="w-full xl:flex-1 min-w-[300px]">
            <AttachmentsSidebar
              attachments={project.attachments || []}
              canDelete={permissionsIsAdmin}
              canPreview={permissionsIsAdmin || isProjectLead}
              canUpload={permissionsIsAdmin || isProjectLead}
              onDelete={onDeleteAttachment}
              onPreview={onPreviewAttachment}
              onUploadClick={onUploadClick}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default ProjectHeader;
