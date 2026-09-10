'use client';

// Selection + file-upload + actions section of the Excel upload screen.
// Markup ported VERBATIM from the OLD ExcelUploadComponent.tsx (workspace /
// project / user selects, dashed dropzone, action buttons, progress bar, and
// the error / success alerts). Behaviour-only props are threaded down from the
// orchestrating ExcelUploadComponent so this file stays presentational.

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import type { Workspace, Project, User } from './types';

interface ExcelUploadFormProps {
  workspaces: Workspace[];
  projects: Project[];
  users: User[];
  selectedWorkspace: string;
  selectedProject: string;
  selectedUser: string;
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string;
  success: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onWorkspaceChange: (value: string) => void;
  onProjectChange: (projectId: string) => void;
  onUserChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onReset: () => void;
  onDownloadTemplate: () => void;
}

export const ExcelUploadForm: React.FC<ExcelUploadFormProps> = ({
  workspaces,
  projects,
  users,
  selectedWorkspace,
  selectedProject,
  selectedUser,
  selectedFile,
  isUploading,
  uploadProgress,
  error,
  success,
  fileInputRef,
  onWorkspaceChange,
  onProjectChange,
  onUserChange,
  onFileSelect,
  onUpload,
  onReset,
  onDownloadTemplate,
}) => {
  return (
    <>
      {/* Workspace Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Workspace</label>
        <Select value={selectedWorkspace} onValueChange={onWorkspaceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                {workspace.name} ({workspace.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Project</label>
        <Select value={selectedProject} onValueChange={onProjectChange}>
          <SelectTrigger className="w-full" disabled={!selectedWorkspace}>
            <SelectValue placeholder={selectedWorkspace ? "Choose a project" : "Select workspace first"} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project._id} value={project._id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select User (Assignee)</label>
        <Select value={selectedUser} onValueChange={onUserChange}>
          <SelectTrigger className="w-full" disabled={!selectedProject}>
            <SelectValue placeholder={selectedProject ? "Choose a user" : "Select project first"} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Upload Excel File</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileSelect}
            className="hidden"
            id="excel-file-input"
            disabled={!selectedUser}
          />
          <label
            htmlFor="excel-file-input"
            className={`cursor-pointer flex flex-col items-center space-y-2 ${!selectedUser ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-400" />
            <span className="text-sm text-gray-600">
              {selectedFile ? selectedFile.name : 'Click to select Excel file'}
            </span>
            <span className="text-xs text-gray-500">
              Supported formats: .xlsx, .xls (Max 10MB)
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onDownloadTemplate}
          className="flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Template</span>
        </Button>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={isUploading}
          >
            Reset
          </Button>
          <Button
            onClick={onUpload}
            disabled={!selectedFile || !selectedWorkspace || !selectedProject || isUploading}
            className="flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Tasks</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default ExcelUploadForm;
