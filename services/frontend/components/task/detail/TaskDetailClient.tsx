'use client';

import React, { useRef } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTaskDetail } from "./useTaskDetail";
import { Header } from "./Header";
import { Body } from "./Body";
import { Sidebar } from "./Sidebar";
import { CommentsSection } from "./CommentsSection";
import { SubtasksSection } from "./SubtasksSection";
import { ActivitySection } from "./ActivitySection";
import type { Subtask, TaskPriority } from "./types";

/**
 * TaskDetailClient — the ported task-detail screen orchestrator. Pulls the full
 * data/state/handler surface from `useTaskDetail()` and feeds slices into the six
 * sub-sections. The create/edit-subtask overlay dialogs are rendered inline here;
 * the reject/reassign/hold/resume dialogs live inside <Sidebar />.
 * Faithfully mirrors OLD app/routes/task/task-detail.tsx render tree.
 */
export function TaskDetailClient() {
  const detail = useTaskDetail();
  const {
    navigate,

    task,
    comments,
    handoverEntries,
    subtasks,
    assignableMembers,
    replies,

    loading,
    authLoading,
    isAuthenticated,
    activeUser,

    isCreator,
    isAssignee,
    isAdmin,
    isProjectHead,
    isTL,
    isTLAssignedToParent,
    canApprove,
    isTaskLocked,
    showLockWarning,
    canCreateSubtask,

    newComment,
    setNewComment,
    selectedFiles,
    setSelectedFiles,
    replyingTo,
    setReplyingTo,
    expandedThreads,
    isSubmitting,

    newHandoverContent,
    setNewHandoverContent,
    handoverSelectedFiles,
    setHandoverSelectedFiles,
    submittingHandover,
    handoverEditor,
    setHandoverEditor,
    isBoldActive,
    isItalicActive,
    isUnderlineActive,

    isUploadingTaskAttachments,
    taskAttachmentsInputRef,

    isChangingStatus,

    showRejectDialog,
    setShowRejectDialog,
    rejectionReason,
    setRejectionReason,
    isApproving,
    isRejecting,
    rejectDueDate,
    setRejectDueDate,
    rejectReassigneeId,
    setRejectReassigneeId,
    rejectProjectEnd,
    setRejectProjectEnd,
    setRejectionFiles,
    setRejectionLink,
    rejectionFileInputRef,

    showReassignDialog,
    setShowReassignDialog,
    reassignAssigneeId,
    setReassignAssigneeId,
    reassignDueDate,
    setReassignDueDate,
    reassignProjectEnd,
    setReassignProjectEnd,
    isReassigning,

    showHoldDialog,
    setShowHoldDialog,
    holdReason,
    setHoldReason,
    isHolding,
    showResumeDialog,
    setShowResumeDialog,
    resumeNewEndDate,
    setResumeNewEndDate,
    isResuming,
    endDateCrossed,
    setEndDateCrossed,

    showCreateSubtask,
    setShowCreateSubtask,
    subtaskTitle,
    setSubtaskTitle,
    subtaskDescription,
    setSubtaskDescription,
    subtaskAssigneeId,
    setSubtaskAssigneeId,
    subtaskPriority,
    setSubtaskPriority,
    setSubtaskStartDate,
    setSubtaskEndDate,
    subtaskProjectStart,
    setSubtaskProjectStart,
    subtaskProjectEnd,
    setSubtaskProjectEnd,
    isCreatingSubtask,

    showEditSubtask,
    setShowEditSubtask,
    setEditingSubtask,
    editSubtaskTitle,
    setEditSubtaskTitle,
    editSubtaskDescription,
    setEditSubtaskDescription,
    editSubtaskAssigneeId,
    setEditSubtaskAssigneeId,
    editSubtaskPriority,
    setEditSubtaskPriority,
    setEditSubtaskStartDate,
    setEditSubtaskEndDate,
    editSubtaskProjectStart,
    setEditSubtaskProjectStart,
    editSubtaskProjectEnd,
    setEditSubtaskProjectEnd,
    isUpdatingSubtask,

    handleStatusChange,
    handleSubmitHandoverEntry,
    handleAddComment,
    handleTaskAttachmentsSelect,
    handleEditComment,
    handleDeleteComment,
    handleToggleExpand,
    handleLoadReplies,
    handleApprove,
    handleReject,
    handleReassignTask,
    handlePutOnHold,
    handleResume,
    handleCreateSubtask,
    handleUpdateSubtask,
  } = detail;

  // Local-only ref for the discussion scroll viewport (mirrors OLD chatScrollRef).
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Populate the edit-subtask form from a clicked row.
  const handleEditSubtask = (st: Subtask) => {
    setEditingSubtask(st);
    setEditSubtaskTitle(st.title || "");
    setEditSubtaskDescription(st.description || "");
    const assigneeId =
      typeof st.assignee === "string" ? st.assignee : st.assignee?._id || "";
    setEditSubtaskAssigneeId(assigneeId);
    setEditSubtaskPriority((st.priority as TaskPriority) || "medium");
    const start = st.startDate ? new Date(st.startDate) : null;
    const end = st.dueDate ? new Date(st.dueDate) : null;
    setEditSubtaskProjectStart(start);
    setEditSubtaskProjectEnd(end);
    setEditSubtaskStartDate(start ? start.toISOString() : "");
    setEditSubtaskEndDate(end ? end.toISOString() : "");
    setShowEditSubtask(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Task Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              The task you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button
              onClick={() => navigate("/tasks")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* -------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 sm:mb-6">
          <Breadcrumb
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: (
                  <img
                    src="/assets/4001ba5860d2858f2469e275a4ce7fe2c2c2a952.svg"
                    alt="Dashboard"
                    className="w-[20px] h-[20px]"
                  />
                ),
              },
              {
                label: "Workspace",
                href: "/workspace",
                icon: (
                  <img
                    src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
                    alt="Workspace"
                    className="w-[20px] h-[20px]"
                  />
                ),
              },
              {
                label: task.project?.title || "Project",
                href: `/project/${task.project?._id}`,
                icon: (
                  <img
                    src="/assets/folder-project-icon.svg"
                    alt="Project"
                    className="w-[20px] h-[20px]"
                  />
                ),
              },
              {
                label: task.title,
                href: "#",
                icon: (
                  <svg
                    className="w-[20px] h-[20px]"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M6 10L9 13L14 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="14"
                      height="14"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                ),
              },
            ]}
          />
        </div>

        {/* Warning Banner for Locked Tasks */}
        {showLockWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Task Locked
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This task is currently locked because it's{" "}
                    {task?.approvalStatus === "approved"
                      ? "been approved"
                      : "awaiting approval"}
                    .
                    {isCreator
                      ? " You can reassign this task to unlock it and make changes."
                      : " The task creator must reassign it to unlock and make changes."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column - Task Details and Handover Progress */}
          <div className="space-y-4 md:space-y-6">
            {/* Task Details Card */}
            <Card className="shadow-sm border-gray-200 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                  {/* Title and Actions Row */}
                  <Header
                    task={task}
                    canApprove={canApprove}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    isCreator={isCreator}
                    isAssignee={isAssignee}
                    isProjectHead={isProjectHead}
                    isAdmin={isAdmin}
                    isTL={isTL}
                    isTaskLocked={isTaskLocked}
                    isChangingStatus={isChangingStatus}
                    isHolding={isHolding}
                    isResuming={isResuming}
                    onApprove={handleApprove}
                    onOpenReject={() => setShowRejectDialog(true)}
                    onOpenReassign={() => setShowReassignDialog(true)}
                    onStatusChange={handleStatusChange}
                    onOpenHold={() => setShowHoldDialog(true)}
                    onOpenResume={() => setShowResumeDialog(true)}
                    setEndDateCrossed={setEndDateCrossed}
                  />

                  {/* Project Details Card + reject/reassign/hold/resume dialogs */}
                  <Sidebar
                    task={task}
                    assignableMembers={assignableMembers}
                    showRejectDialog={showRejectDialog}
                    setShowRejectDialog={setShowRejectDialog}
                    rejectionReason={rejectionReason}
                    setRejectionReason={setRejectionReason}
                    rejectDueDate={rejectDueDate}
                    setRejectDueDate={setRejectDueDate}
                    rejectReassigneeId={rejectReassigneeId}
                    setRejectReassigneeId={setRejectReassigneeId}
                    rejectProjectEnd={rejectProjectEnd}
                    setRejectProjectEnd={setRejectProjectEnd}
                    setRejectionFiles={setRejectionFiles}
                    setRejectionLink={setRejectionLink}
                    rejectionFileInputRef={rejectionFileInputRef}
                    isRejecting={isRejecting}
                    onReject={handleReject}
                    showReassignDialog={showReassignDialog}
                    setShowReassignDialog={setShowReassignDialog}
                    reassignAssigneeId={reassignAssigneeId}
                    setReassignAssigneeId={setReassignAssigneeId}
                    reassignDueDate={reassignDueDate}
                    setReassignDueDate={setReassignDueDate}
                    reassignProjectEnd={reassignProjectEnd}
                    setReassignProjectEnd={setReassignProjectEnd}
                    isReassigning={isReassigning}
                    onReassign={handleReassignTask}
                    showHoldDialog={showHoldDialog}
                    setShowHoldDialog={setShowHoldDialog}
                    holdReason={holdReason}
                    setHoldReason={setHoldReason}
                    isHolding={isHolding}
                    onPutOnHold={handlePutOnHold}
                    showResumeDialog={showResumeDialog}
                    setShowResumeDialog={setShowResumeDialog}
                    resumeNewEndDate={resumeNewEndDate}
                    setResumeNewEndDate={setResumeNewEndDate}
                    isResuming={isResuming}
                    endDateCrossed={endDateCrossed}
                    setEndDateCrossed={setEndDateCrossed}
                    onResume={handleResume}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Reference Links, Attachments and Handover Notes */}
            <Body
              task={task}
              isAdmin={isAdmin}
              isProjectHead={isProjectHead}
              isAssignee={isAssignee}
              isTaskLocked={isTaskLocked}
              isUploadingTaskAttachments={isUploadingTaskAttachments}
              taskAttachmentsInputRef={taskAttachmentsInputRef}
              onTaskAttachmentsSelect={handleTaskAttachmentsSelect}
              handoverEntries={handoverEntries || []}
              newHandoverContent={newHandoverContent}
              setNewHandoverContent={setNewHandoverContent}
              handoverSelectedFiles={handoverSelectedFiles}
              setHandoverSelectedFiles={setHandoverSelectedFiles}
              submittingHandover={submittingHandover}
              onSubmitHandoverEntry={handleSubmitHandoverEntry}
              handoverEditor={handoverEditor}
              setHandoverEditor={setHandoverEditor}
              isBoldActive={isBoldActive}
              isItalicActive={isItalicActive}
              isUnderlineActive={isUnderlineActive}
            />
          </div>

          {/* Right Column - Discussion and Subtasks */}
          <div className="space-y-4 md:space-y-6">
            {/* Discussion Section - First on right */}
            <CommentsSection
              comments={comments}
              activeUser={activeUser}
              task={task}
              isTaskLocked={isTaskLocked}
              newComment={newComment}
              setNewComment={setNewComment}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              isSubmitting={isSubmitting}
              onAddComment={handleAddComment}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replies={replies}
              expandedThreads={expandedThreads}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              onToggleExpand={handleToggleExpand}
              onLoadReplies={handleLoadReplies}
              chatScrollRef={chatScrollRef}
            />

            {/* Subtasks Section */}
            <SubtasksSection
              subtasks={subtasks}
              isTLAssignedToParent={isTLAssignedToParent}
              canCreateSubtask={canCreateSubtask}
              onCreateSubtask={() => setShowCreateSubtask(true)}
              onEditSubtask={handleEditSubtask}
              onNavigate={navigate}
            />

            {/* Activity Section */}
            <ActivitySection task={task} />
          </div>
        </div>
      </div>

      {/* Create Subtask Dialog */}
      <Dialog open={showCreateSubtask} onOpenChange={setShowCreateSubtask}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Create Subtask
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create a subtask under "
              <span className="font-medium">{task.title}</span>"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title"
                className="h-10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Description
              </label>
              <Textarea
                value={subtaskDescription}
                onChange={(e) => setSubtaskDescription(e.target.value)}
                placeholder="Enter subtask description"
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Two Column Layout for Assignee and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignee */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Assignee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={subtaskAssigneeId}
                  onValueChange={setSubtaskAssigneeId}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers
                      .filter((m) => m.role === "member" || m.role === "trainee")
                      .map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={subtaskPriority}
                  onValueChange={(val) =>
                    setSubtaskPriority(val as TaskPriority)
                  }
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Pickers Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {subtaskProjectStart
                        ? format(subtaskProjectStart, "PPP")
                        : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskProjectStart || undefined}
                      onSelect={(date) => {
                        setSubtaskProjectStart(date || null);
                        if (date) {
                          setSubtaskStartDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate
                          ? new Date(task.startDate)
                          : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate
                          ? new Date(task.dueDate)
                          : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);

                        if (dateToCheck < today) return true;
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {subtaskProjectEnd
                        ? format(subtaskProjectEnd, "PPP")
                        : "Pick due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskProjectEnd || undefined}
                      onSelect={(date) => {
                        setSubtaskProjectEnd(date || null);
                        if (date) {
                          setSubtaskEndDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate
                          ? new Date(task.startDate)
                          : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate
                          ? new Date(task.dueDate)
                          : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);
                        const selectedStart = subtaskProjectStart
                          ? new Date(subtaskProjectStart)
                          : null;
                        if (selectedStart) selectedStart.setHours(0, 0, 0, 0);

                        if (dateToCheck < today) return true;
                        if (selectedStart && dateToCheck < selectedStart)
                          return true;
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateSubtask(false);
                setSubtaskTitle("");
                setSubtaskDescription("");
                setSubtaskAssigneeId("");
                setSubtaskStartDate("");
                setSubtaskEndDate("");
                setSubtaskProjectStart(null);
                setSubtaskProjectEnd(null);
                setSubtaskPriority("medium");
              }}
              disabled={isCreatingSubtask}
              className="w-full sm:w-auto h-10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubtask}
              disabled={
                isCreatingSubtask ||
                !subtaskTitle ||
                !subtaskAssigneeId ||
                !subtaskProjectStart ||
                !subtaskProjectEnd
              }
              className="w-full sm:w-auto bg-[#007aff] hover:bg-[#0066cc] text-white h-10 font-semibold"
            >
              {isCreatingSubtask ? "Creating..." : "Create Subtask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subtask Dialog */}
      <Dialog
        open={showEditSubtask}
        onOpenChange={(open) => {
          setShowEditSubtask(open);
          if (!open) {
            setEditingSubtask(null);
            setEditSubtaskTitle("");
            setEditSubtaskDescription("");
            setEditSubtaskAssigneeId("");
            setEditSubtaskPriority("medium");
            setEditSubtaskStartDate("");
            setEditSubtaskEndDate("");
            setEditSubtaskProjectStart(null);
            setEditSubtaskProjectEnd(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Edit Subtask
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update the subtask under "
              <span className="font-medium">{task.title}</span>"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={editSubtaskTitle}
                onChange={(e) => setEditSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Description
              </label>
              <Textarea
                value={editSubtaskDescription}
                onChange={(e) => setEditSubtaskDescription(e.target.value)}
                placeholder="Enter subtask description"
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Assignee <span className="text-red-500">*</span>
                </label>
                <Select
                  value={editSubtaskAssigneeId}
                  onValueChange={setEditSubtaskAssigneeId}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers
                      .filter((m) => m.role === "member" || m.role === "trainee")
                      .map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={editSubtaskPriority}
                  onValueChange={(val) =>
                    setEditSubtaskPriority(val as TaskPriority)
                  }
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {editSubtaskProjectStart
                        ? format(editSubtaskProjectStart, "PPP")
                        : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editSubtaskProjectStart || undefined}
                      onSelect={(date) => {
                        setEditSubtaskProjectStart(date || null);
                        if (date) {
                          setEditSubtaskStartDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate
                          ? new Date(task.startDate)
                          : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate
                          ? new Date(task.dueDate)
                          : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);

                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {editSubtaskProjectEnd
                        ? format(editSubtaskProjectEnd, "PPP")
                        : "Pick due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editSubtaskProjectEnd || undefined}
                      onSelect={(date) => {
                        setEditSubtaskProjectEnd(date || null);
                        if (date) {
                          setEditSubtaskEndDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate
                          ? new Date(task.startDate)
                          : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate
                          ? new Date(task.dueDate)
                          : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);
                        const selectedStart = editSubtaskProjectStart
                          ? new Date(editSubtaskProjectStart)
                          : null;
                        if (selectedStart) selectedStart.setHours(0, 0, 0, 0);

                        if (selectedStart && dateToCheck < selectedStart)
                          return true;
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditSubtask(false);
                setEditingSubtask(null);
                setEditSubtaskTitle("");
                setEditSubtaskDescription("");
                setEditSubtaskAssigneeId("");
                setEditSubtaskPriority("medium");
                setEditSubtaskStartDate("");
                setEditSubtaskEndDate("");
                setEditSubtaskProjectStart(null);
                setEditSubtaskProjectEnd(null);
              }}
              disabled={isUpdatingSubtask}
              className="w-full sm:w-auto h-10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubtask}
              disabled={
                isUpdatingSubtask ||
                !editSubtaskTitle ||
                !editSubtaskAssigneeId ||
                !editSubtaskProjectStart ||
                !editSubtaskProjectEnd
              }
              className="w-full sm:w-auto bg-[#007aff] hover:bg-[#0066cc] text-white h-10 font-semibold"
            >
              {isUpdatingSubtask ? "Updating..." : "Update Subtask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default TaskDetailClient;
