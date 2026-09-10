'use client';

// Handover details modal for the Report Screen.
// JSX copied VERBATIM from OLD report-screen.tsx (the bottom Dialog block).
// Caller: ReportScreenView.tsx.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { buildBackendUrl } from '@/lib/config';
import type { TaskData } from './types';

interface HandoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData | null;
}

export function HandoverModal({ open, onOpenChange, task }: HandoverModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Handover Details</DialogTitle>
          <DialogDescription>
            Task: {task?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-900">Handover Notes</h4>
            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 min-h-[80px]">
              {task?.handoverNotes || "No notes provided."}
            </div>
          </div>

          {task?.handoverAttachments && task.handoverAttachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900">Attachments</h4>
              <div className="space-y-2">
                {task.handoverAttachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-white">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm truncate">{file.originalName || file.filename}</span>
                    </div>
                    <a
                      href={buildBackendUrl(file.path.replace(/\\/g, '/'))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs flex-shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
