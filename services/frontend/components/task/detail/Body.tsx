'use client';

import React, { useState } from "react";
import {
  Upload,
  ExternalLink,
  File,
  Download,
  Send,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import RichTextEditor from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildBackendUrl } from "@/lib/config";
import { toast } from "sonner";
import type { Task, HandoverEntry, TaskAttachment } from "./types";

// Attachments panel (ported verbatim from OLD @/components/task/AttachmentsPanel)
interface AttachmentsPanelProps {
  attachments: TaskAttachment[];
  onDelete?: (index: number) => void;
  onPreview?: (attachment: TaskAttachment) => void;
  canDelete?: boolean;
  className?: string;
}

function AttachmentsPanel({
  attachments,
  onDelete,
  onPreview,
  canDelete = false,
  className,
}: AttachmentsPanelProps) {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (attachment: TaskAttachment) => {
    if (attachment.fileType === "image") {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }

    if (attachment.mimeType?.includes("pdf")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }

    if (attachment.mimeType?.includes("word") || attachment.mimeType?.includes("document")) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }

    return <FileIcon className="w-5 h-5 text-gray-500" />;
  };

  const handleDownload = (attachment: TaskAttachment) => {
    const link = document.createElement("a");
    link.href = buildBackendUrl(attachment.fileUrl);
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: TaskAttachment, index: number) => {
    if (attachment.fileType === "image") {
      const imageAttachments = attachments.filter((a) => a.fileType === "image");
      const imageIndex = imageAttachments.findIndex((img) => img.fileUrl === attachment.fileUrl);

      if (imageIndex >= 0) {
        setPreviewImageIndex(imageIndex);
        setPreviewModalOpen(true);
      }
    } else {
      handleDownload(attachment);
    }
  };

  const imageAttachments = attachments.filter((a) => a.fileType === "image");

  if (!attachments || attachments.length === 0) {
    return (
      <div className={cn("p-4 text-center text-gray-500 text-sm", className)}>
        <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No attachments</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[250px]", className)}>
      <div className="space-y-2 p-1 sm:p-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group overflow-hidden"
          >
            {/* File Icon */}
            <div className="flex-shrink-0">{getFileIcon(attachment)}</div>

            {/* File Info */}
            <div
              className="flex-1 min-w-0 cursor-pointer overflow-hidden max-w-full"
              onClick={() => {
                window.open(buildBackendUrl(attachment.fileUrl), "_blank");
              }}
            >
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate overflow-hidden text-ellipsis whitespace-nowrap">
                {attachment.fileName}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>

            {/* Actions - Commented out as requested */}
            {/*
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePreview(attachment, index)}
                className="h-7 w-7 p-0"
                title={attachment.fileType === 'image' ? 'Preview' : 'Download'}
              >
                {attachment.fileType === 'image' ? (
                  <Eye className="h-4 w-4 text-gray-600" />
                ) : (
                  <svg
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                )}
              </Button>

              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  className="h-7 w-7 p-0 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            */}
          </div>
        ))}
      </div>

      {/* Enhanced Image Preview Modal */}
      {imageAttachments.length > 0 && (
        <ImagePreviewModal
          images={imageAttachments}
          initialIndex={previewImageIndex}
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </ScrollArea>
  );
}

const formatDate = (date: string) => {
  if (!date) return "-";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Rich-text display used for handover entries (renders stored HTML / basic markdown)
const RichTextDisplay = ({ content }: { content: string }) => {
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderContent = (text: string) => {
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    let html = escapeHtml(text);
    html = html.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");
    html = html.replace(/\n/g, "<br>");
    return html;
  };

  return (
    <div
      className="text-sm text-gray-700 prose prose-sm max-w-none [&_p]:m-0"
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
};

// File preview used inside handover entries
const HandoverFilePreview: React.FC<{ attachments: HandoverEntry["attachments"] }> = ({
  attachments,
}) => {
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("sheet")) return "📊";
    return "📁";
  };

  const downloadFile = (attachment: any) => {
    window.open(buildBackendUrl(attachment.fileUrl), "_blank");
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === "image" ? (
            <div
              className="relative group cursor-pointer"
              onClick={() => downloadFile(attachment)}
            >
              <img
                src={buildBackendUrl(attachment.fileUrl)}
                alt={attachment.fileName}
                className="rounded max-h-32 hover:opacity-90 transition-opacity w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1.5 rounded">
                <span className="truncate block">
                  {attachment.fileName.length > 20
                    ? `${attachment.fileName.substring(0, 20)}...`
                    : attachment.fileName}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => downloadFile(attachment)}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">
                  {getFileIcon(attachment.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {attachment.fileName.length > 20
                      ? `${attachment.fileName.substring(0, 20)}...`
                      : attachment.fileName}
                  </div>
                  <div className="text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export interface BodyProps {
  task: Task;

  // Permissions / view flags
  isAdmin: boolean;
  isProjectHead: boolean;
  isAssignee: boolean;
  isTaskLocked: boolean;

  // Task attachments
  isUploadingTaskAttachments: boolean;
  taskAttachmentsInputRef: React.RefObject<HTMLInputElement | null>;
  onTaskAttachmentsSelect: (files: FileList | null) => void;

  // Handover
  handoverEntries: HandoverEntry[];
  newHandoverContent: string;
  setNewHandoverContent: (value: string) => void;
  handoverSelectedFiles: File[];
  setHandoverSelectedFiles: (files: File[]) => void;
  submittingHandover: boolean;
  onSubmitHandoverEntry: () => void;
  handoverEditor: any;
  setHandoverEditor: (editor: any) => void;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isUnderlineActive: boolean;
}

export function Body({
  task,
  isAdmin,
  isProjectHead,
  isAssignee,
  isTaskLocked,
  isUploadingTaskAttachments,
  taskAttachmentsInputRef,
  onTaskAttachmentsSelect,
  handoverEntries,
  newHandoverContent,
  setNewHandoverContent,
  handoverSelectedFiles,
  setHandoverSelectedFiles,
  submittingHandover,
  onSubmitHandoverEntry,
  handoverEditor,
  setHandoverEditor,
  isBoldActive,
  isItalicActive,
  isUnderlineActive,
}: BodyProps) {
  return (
    <>
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <div className="space-y-4">
            {/* Description - Full width */}
            <div className="flex flex-col gap-[5px]">
              <p className="text-sm text-[#040110] opacity-60 font-normal">Description</p>
              <p className="text-sm text-neutral-700 font-normal whitespace-pre-wrap break-all">
                {task.description || "-"}
              </p>
            </div>

            {/* Start Date & Due Date - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-[5px]">
                <p className="text-sm text-[#040110] opacity-60 font-normal">Start Date</p>
                <p className="text-sm text-neutral-700 font-normal">{formatDate(task.startDate || "")}</p>
              </div>
              <div className="flex flex-col gap-[5px]">
                <p className="text-sm text-[#040110] opacity-60 font-normal">Due Date</p>
                <p className="text-sm text-neutral-700 font-normal">{formatDate(task.dueDate || "")}</p>
              </div>
            </div>

            {/* Duration - Full width */}
            <div className="flex flex-col gap-[5px]">
              <p className="text-sm text-[#040110] opacity-60 font-normal">Duration</p>
              <p className="text-sm text-neutral-700 font-normal">
                {task.durationDays ? `${task.durationDays} Day${task.durationDays > 1 ? "s" : ""}` : "N/A"}
              </p>
            </div>

            {/* Status - Full width */}
            <div className="flex flex-col gap-[5px]">
              <p className="text-sm text-[#040110] opacity-60 font-normal">Status</p>
              <p
                className={`text-sm font-medium capitalize ${
                  task.status === "done"
                    ? "text-[#22c55e]"
                    : task.status === "in-progress"
                    ? "text-[#f2761b]"
                    : task.status === "on-hold"
                    ? "text-[#CD2812]"
                    : "text-neutral-700"
                }`}
              >
                {task.status.replace("-", " ")}
              </p>
            </div>

            {/* Approval Status - Inline Display with Rejection Reason */}
            {task.approvalStatus && task.approvalStatus !== "not-required" && (
              <div className="pt-2 border-t border-[#e0e0e0]/50">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#040110] opacity-60">Approval:</span>
                  <span
                    className={`text-sm font-medium capitalize ${
                      task.approvalStatus === "approved"
                        ? "text-[#22c55e]"
                        : task.approvalStatus === "rejected"
                        ? "text-[#ef4444]"
                        : task.approvalStatus === "pending-approval"
                        ? "text-[#f59e0b]"
                        : "text-neutral-700"
                    }`}
                  >
                    {task.approvalStatus.replace("-", " ")}
                  </span>
                </div>
                {task.approvalStatus === "rejected" && task.rejectionReason && (
                  <div className="mt-2 text-sm">
                    <span className="text-[#040110] opacity-60">Reason: </span>
                    <span className="text-[#ef4444]">{task.rejectionReason}</span>
                  </div>
                )}
                {task.approvalStatus === "rejected" &&
                  task.rejectionAttachments &&
                  task.rejectionAttachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-sm text-[#040110] opacity-60 font-medium">
                        Rejection Attachments:
                      </span>
                      <div className="space-y-2">
                        {task.rejectionAttachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {attachment.type === "file" ? (
                              <a
                                href={buildBackendUrl(attachment.fileUrl || "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <File className="w-4 h-4" />
                                <span className="truncate">{attachment.fileName}</span>
                                <Download className="w-3 h-3" />
                              </a>
                            ) : (
                              <a
                                href={attachment.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                <span className="truncate capitalize">{attachment.linkType} Link</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 pt-4">
          {/* Reference Links Section */}
          {task.referenceLinks && task.referenceLinks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">Reference Links</h3>
              <ul className="space-y-2">
                {task.referenceLinks.map((linkStr, idx) => {
                  let links = [linkStr];
                  try {
                    if (linkStr.startsWith("[") && linkStr.endsWith("]")) {
                      links = JSON.parse(linkStr);
                    }
                  } catch (e) {
                    // keep as is
                  }

                  return links.map((link, i) => (
                    <li key={`${idx}-${i}`} className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {link}
                      </a>
                    </li>
                  ));
                })}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">Attachments</h3>
              {(isAdmin || isProjectHead) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{task.attachments?.length || 0}/10</span>
                  <label
                    htmlFor="task-attach"
                    className={`cursor-pointer ${
                      (task.attachments?.length || 0) >= 10 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title={isUploadingTaskAttachments ? "Uploading..." : "Upload files"}
                  >
                    <Upload className="w-5 h-5 text-gray-600 hover:text-gray-800" />
                  </label>
                </div>
              )}
              <input
                id="task-attach"
                ref={taskAttachmentsInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="hidden"
                disabled={(task.attachments?.length || 0) >= 10}
                onChange={(e) => onTaskAttachmentsSelect(e.target.files)}
              />
            </div>
            <AttachmentsPanel attachments={task.attachments || []} />
          </div>
        </CardContent>
      </Card>

      {/* Handover Progress - Figma Design */}
      <div className="bg-[#e5efff] border border-[#cccccc] rounded-lg px-5 py-[18px] flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-[5px]">
          <h3 className="text-lg font-medium text-neutral-700">Handover Notes</h3>
          <p className="text-sm text-[#040110] opacity-60 font-normal">
            Add your progress updates and handover information here
          </p>
        </div>

        {/* Handover Entries Display */}
        {handoverEntries && handoverEntries.length > 0 && (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {handoverEntries.map((entry) => (
              <div key={entry._id} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-gray-900">{entry.author.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <RichTextDisplay content={entry.content} />
                {entry.attachments && entry.attachments.length > 0 && (
                  <div className="mt-2">
                    <HandoverFilePreview attachments={entry.attachments} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message Composer - Figma Design */}
        {isAssignee && !isTaskLocked && (
          <div className="bg-white rounded-lg border border-[#cccccc]">
            {/* Rich Text Editor */}
            <div className="p-2 pb-0">
              <RichTextEditor
                content={newHandoverContent}
                onChange={setNewHandoverContent}
                placeholder="Type your message here..."
                className="min-h-[80px] w-full border-none shadow-none rounded-none"
                toolbarPosition="none"
                onEditorReady={setHandoverEditor}
              />
            </div>

            {/* Selected Files Display */}
            {handoverSelectedFiles.length > 0 && (
              <div className="px-4 pb-2 space-y-2">
                {handoverSelectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <button
                      onClick={() =>
                        setHandoverSelectedFiles(handoverSelectedFiles.filter((_, i) => i !== index))
                      }
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Separator */}
            <div className="w-full h-px bg-[#cccccc]" />

            {/* Bottom Row - Attach Icon and Share Button */}
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handoverEditor && handoverEditor.chain().focus().toggleBold().run()}
                    disabled={!handoverEditor}
                    aria-pressed={isBoldActive}
                    className={`p-1.5 rounded-md hover:bg-gray-100 ${
                      isBoldActive ? "bg-gray-200 text-gray-900" : "text-gray-600"
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handoverEditor && handoverEditor.chain().focus().toggleItalic().run()}
                    disabled={!handoverEditor}
                    aria-pressed={isItalicActive}
                    className={`p-1.5 rounded-md hover:bg-gray-100 ${
                      isItalicActive ? "bg-gray-200 text-gray-900" : "text-gray-600"
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handoverEditor && handoverEditor.chain().focus().toggleUnderline().run()
                    }
                    disabled={!handoverEditor}
                    aria-pressed={isUnderlineActive}
                    className={`p-1.5 rounded-md hover:bg-gray-100 ${
                      isUnderlineActive ? "bg-gray-200 text-gray-900" : "text-gray-600"
                    }`}
                    title="Underline"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                </div>
                {/* Attach Icon */}
                <label htmlFor="handover-attach" className="cursor-pointer">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <path
                      d="M17.8668 9.29175L10.2001 16.9584C8.78346 18.3751 6.46679 18.3751 5.05012 16.9584C3.63346 15.5417 3.63346 13.2251 5.05012 11.8084L12.7168 4.14175C13.6418 3.21675 15.1418 3.21675 16.0668 4.14175C16.9918 5.06675 16.9918 6.56675 16.0668 7.49175L8.40846 15.1501C7.94596 15.6126 7.19596 15.6126 6.73346 15.1501C6.27096 14.6876 6.27096 13.9376 6.73346 13.4751L13.5585 6.66675"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    id="handover-attach"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const fileArray = Array.from(files);
                        const oversizedFiles = fileArray.filter(
                          (file) => file.size > 5 * 1024 * 1024
                        );
                        if (oversizedFiles.length > 0) {
                          toast.error("File too large", {
                            description: `${oversizedFiles
                              .map((f) => f.name)
                              .join(", ")} exceeds 5MB limit`,
                          });
                          return;
                        }
                        setHandoverSelectedFiles([...handoverSelectedFiles, ...fileArray]);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Share Button */}
              <Button
                onClick={onSubmitHandoverEntry}
                disabled={submittingHandover || !newHandoverContent.trim()}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive py-2 has-[>svg]:px-3 flex-1 bg-[#FF6B2C] hover:bg-[#FF5A1A] text-white h-9 px-6 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                {submittingHandover ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
        )}

        {/* Show locked message when task is locked */}
        {isAssignee && isTaskLocked && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              Handover notes are disabled because this task is{" "}
              {task?.approvalStatus === "approved" ? "approved" : "awaiting approval"}.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              The task must be reassigned to add new handover notes.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default Body;
