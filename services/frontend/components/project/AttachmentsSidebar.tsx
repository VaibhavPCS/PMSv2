'use client';

import React from "react";
import { Trash2, Image as ImageIcon, FileText, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildBackendUrl } from "@/lib/config";

interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  size?: number;
  mimeType?: string;
  path: string;
}

interface AttachmentsSidebarProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  onPreview?: (attachment: Attachment) => void;
  onUploadClick?: () => void;
  canDelete?: boolean;
  canPreview?: boolean;
  canUpload?: boolean;
}

export function AttachmentsSidebar({
  attachments = [],
  onDelete,
  onPreview,
  onUploadClick,
  canDelete = false,
  canPreview = false,
  canUpload = false,
}: AttachmentsSidebarProps) {
  const isImageFile = (attachment: Attachment) => {
    if (attachment.mimeType?.startsWith('image/')) return true;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => attachment.originalName?.toLowerCase().endsWith(ext));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const openFile = (file: Attachment) => {
    const rawPath = file.path || (isImageFile(file)
      ? `/uploads/projects/images/${file.filename}`
      : `/uploads/projects/documents/${file.filename}`);
    const safePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const fullUrl = buildBackendUrl(safePath);
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-[#E5EFFF] rounded-[10px] w-full min-w-0 flex flex-col">
      {/* Header with Upload Button */}
      <div className="p-[10px] border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold font-['Inter'] text-[#040110]">
          Attachments
        </h3>
        {onUploadClick && canUpload && attachments.length < 10 && (
          <button
            onClick={onUploadClick}
            className="p-1.5 hover:bg-white/50 rounded transition-colors"
            title="Upload files"
          >
            <Upload className="w-[16px] h-[16px] text-[#040110]" />
          </button>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-[191px] px-[10px]">
          <div className="space-y-0 py-2">
            {attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[191px] text-center px-4">
                <div className="text-sm text-gray-400 mb-2">No attachments</div>
                {onUploadClick && canUpload && (
                  <button
                    onClick={onUploadClick}
                    className="text-xs text-[#f2761b] hover:underline"
                  >
                    Upload files
                  </button>
                )}
              </div>
            ) : (
              attachments.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between h-[44px] hover:bg-white/50 transition-colors rounded-md px-[10px] py-[5px] group"
                >
                  <div
                    className="flex items-center gap-[10px] flex-1 min-w-0 cursor-pointer"
                    onClick={() => openFile(file)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        openFile(file);
                      }
                    }}
                  >
                    {isImageFile(file) ? (
                      <ImageIcon className="w-[24px] h-[24px] text-blue-500 flex-shrink-0" strokeWidth={1.5} />
                    ) : (
                      <FileText className="w-[24px] h-[24px] text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-normal font-['Inter'] text-[#040110] truncate">
                        {file.originalName || 'Unnamed file'}
                      </div>
                      <div className="text-[12px] font-normal font-['Inter'] text-gray-500">
                        {formatFileSize(file.size || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-[6px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDelete && canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(file._id); }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete (Admin only)"
                      >
                        <Trash2 className="w-[16px] h-[16px] text-red-600" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {attachments.length > 0 && (
        <div className="px-[10px] py-[8px] border-t border-gray-200">
          <div className="text-[12px] text-gray-500 text-center">
            {attachments.length} / 10 attachments
          </div>
        </div>
      )}
    </div>
  );
}
