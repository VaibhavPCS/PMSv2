'use client';

import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Upload,
  File as FileIcon,
  Image as ImageIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { buildBackendUrl } from "@/lib/config";
import { toast } from "sonner";
import type { Comment, ActiveUser, Task } from "./types";

// File Upload Component
const FileUpload: React.FC<{
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  maxFiles?: number;
  maxFileSize?: number;
}> = ({ onFilesSelect, selectedFiles, maxFiles = 3, maxFileSize = 5 }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max ${maxFileSize}MB)`);
        return;
      }

      if (selectedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast.error(errors.join("\n"));
    }

    if (validFiles.length > 0) {
      onFilesSelect([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelect(newFiles);
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full">
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                {isImage(file) ? (
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                ) : (
                  <FileIcon className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {selectedFiles.length < maxFiles && (
        <div className="border border-[#d5d7da] rounded-[8px]">
          <label
            htmlFor="file-upload"
            className="flex items-center gap-[8px] px-[14px] py-[10px] cursor-pointer hover:bg-gray-50"
          >
            <span className="flex-1 text-[14px] font-normal font-['Inter'] text-[#717680]">
              Upload ({selectedFiles.length}/{maxFiles})
            </span>
            <Upload className="w-5 h-5 text-[#717680]" />
          </label>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

// File Preview Component with Context Menu
const FilePreview: React.FC<{
  attachments: Comment["attachments"];
  canDelete?: boolean;
  onDelete?: (index: number) => void;
  isOwnAttachment?: boolean;
}> = ({ attachments, canDelete = false, onDelete, isOwnAttachment = false }) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

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

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    if (isOwnAttachment && canDelete) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, index });
    }
  };

  const handleDeleteFromContext = () => {
    if (contextMenu && onDelete) {
      onDelete(contextMenu.index);
      setContextMenu(null);
    }
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  if (!attachments || attachments.length === 0) return null;

  const imageAttachments = attachments.filter((a) => a.fileType === "image");

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === "image" ? (
            <div
              className="relative group cursor-pointer"
              onClick={() => downloadFile(attachment)}
              onContextMenu={(e) => handleContextMenu(e, index)}
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
              onContextMenu={(e) => handleContextMenu(e, index)}
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDeleteFromContext}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Attachment
          </button>
        </div>
      )}

      {/* Enhanced Image Preview Modal */}
      {imageAttachments.length > 0 && (
        <ImagePreviewModal
          images={imageAttachments}
          initialIndex={0}
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </div>
  );
};

// Chat Message Component
const ChatMessage: React.FC<{
  comment: Comment;
  currentUser: any;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replies?: Comment[];
  isExpanded?: boolean;
  onReply: (comment: Comment) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onToggleExpand: (commentId: string) => void;
  onLoadReplies?: (commentId: string) => void;
}> = ({
  comment,
  currentUser,
  canReply,
  canEdit,
  canDelete,
  replies = [],
  isExpanded = false,
  onReply,
  onEdit,
  onDelete,
  onToggleExpand,
  onLoadReplies,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwnMessage = comment.author._id === (currentUser?._id || currentUser?.id);
  const hasReplies = (comment.replyCount ?? 0) > 0;

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment._id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleToggleExpand = () => {
    if (hasReplies && !isExpanded && replies.length === 0 && onLoadReplies) {
      onLoadReplies(comment._id);
    }
    onToggleExpand(comment._id);
  };

  return (
    <div className="group mb-3">
      <div
        className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isOwnMessage && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-blue-500 text-white">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex-1 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] ${
            isOwnMessage ? "flex flex-col items-end" : ""
          }`}
        >
          <div
            className={`p-2 sm:p-3 rounded-lg ${
              isOwnMessage
                ? "bg-[#DCF8C6] text-black rounded-tr-none"
                : "bg-white border border-gray-200 text-black rounded-tl-none"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {isOwnMessage ? "You" : comment.author.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {comment.parentComment && (
              <div className="mb-2 p-2 bg-gray-100 rounded border-l-2 border-gray-300">
                <div className="text-xs text-gray-600">
                  Replying to{" "}
                  <span className="font-medium">
                    {comment.parentComment.author.name}
                  </span>
                </div>
                <div className="text-xs text-gray-700 truncate">
                  {comment.parentComment.content.length > 30
                    ? `${comment.parentComment.content.substring(0, 30)}...`
                    : comment.parentComment.content}
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="mb-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm p-2 border rounded resize-none"
                  rows={2}
                />
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="h-7 px-3 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="h-7 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {comment.content}
              </div>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <FilePreview
                attachments={comment.attachments}
                isOwnAttachment={isOwnMessage}
                canDelete={isOwnMessage}
              />
            )}
          </div>

          {hasReplies && (
            <div className="mt-2">
              <button
                onClick={handleToggleExpand}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-xs"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>
                  {comment.replyCount || 0}{" "}
                  {comment.replyCount === 1 ? "reply" : "replies"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {hasReplies && isExpanded && (
        <div className={`mt-2 space-y-2 pl-10 ${isOwnMessage ? "pr-0" : "pr-10"}`}>
          {replies.map((reply) => (
            <ChatMessage
              key={reply._id}
              comment={reply}
              currentUser={currentUser}
              canReply={canReply}
              canEdit={canEdit}
              canDelete={canDelete}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleExpand={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface CommentsSectionProps {
  comments: Comment[];
  activeUser: ActiveUser | null;
  task: Task | null;
  isTaskLocked: boolean;

  // Composer
  newComment: string;
  setNewComment: (value: string) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  isSubmitting: boolean;
  onAddComment: () => void;

  // Replies / threads
  replyingTo: Comment | null;
  setReplyingTo: (comment: Comment | null) => void;
  replies: Record<string, Comment[]>;
  expandedThreads: Set<string>;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleExpand: (commentId: string) => void;
  onLoadReplies: (commentId: string) => void;

  chatScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function CommentsSection({
  comments,
  activeUser,
  task,
  isTaskLocked,
  newComment,
  setNewComment,
  selectedFiles,
  setSelectedFiles,
  isSubmitting,
  onAddComment,
  replyingTo,
  setReplyingTo,
  replies,
  expandedThreads,
  onEditComment,
  onDeleteComment,
  onToggleExpand,
  onLoadReplies,
  chatScrollRef,
}: CommentsSectionProps) {
  const topLevelComments = comments.filter((c) => !c.parentComment);

  return (
    <Card className="min-h-[300px] shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          Discussion
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Communicate with your team about this task
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea
          ref={chatScrollRef}
          className="h-[350px] sm:h-[450px] md:h-[500px] pr-2 sm:pr-4"
          viewportClassName="scrollbar-visible"
        >
          <div className="space-y-3 sm:space-y-4">
            {topLevelComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                <p className="text-xs sm:text-sm">No comments yet. Start the discussion!</p>
              </div>
            ) : (
              topLevelComments.map((comment) => (
                <ChatMessage
                  key={comment._id}
                  comment={comment}
                  currentUser={activeUser}
                  canReply={!isTaskLocked}
                  canEdit={!isTaskLocked}
                  canDelete={!isTaskLocked}
                  replies={replies[comment._id] || []}
                  isExpanded={expandedThreads.has(comment._id)}
                  onReply={(c) => setReplyingTo(c)}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  onToggleExpand={onToggleExpand}
                  onLoadReplies={onLoadReplies}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
          {isTaskLocked ? (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Discussion is disabled because this task is{" "}
                {task?.approvalStatus === "approved" ? "approved" : "awaiting approval"}.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The task must be reassigned to continue the discussion.
              </p>
            </div>
          ) : (
            <>
              {replyingTo && (
                <div className="mb-2 sm:mb-3 p-2 bg-blue-50 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] sm:text-xs text-blue-600 font-medium">
                      Replying to {replyingTo.author.name}
                    </span>
                    <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                      {replyingTo.content.substring(0, 50)}...
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {activeUser?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      replyingTo
                        ? `Reply to ${replyingTo.author.name}...`
                        : "Write a comment..."
                    }
                    className="min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onAddComment();
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <FileUpload
                      onFilesSelect={setSelectedFiles}
                      selectedFiles={selectedFiles}
                      maxFiles={3}
                      maxFileSize={5}
                    />
                    <Button
                      onClick={onAddComment}
                      disabled={isSubmitting || (!newComment.trim() && selectedFiles.length === 0)}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs sm:text-sm"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      {isSubmitting ? "Sending..." : "Send"}
                    </Button>
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs text-gray-500">
                    <span className="hidden sm:inline">
                      Press Enter to send, Shift + Enter for new line
                    </span>
                    <span className="sm:hidden">Enter to send</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CommentsSection;
