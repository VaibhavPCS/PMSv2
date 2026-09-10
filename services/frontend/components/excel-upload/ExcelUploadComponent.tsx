'use client';

// Orchestrator for the Excel-upload screen. State + data-fetching + all event
// handlers are ported VERBATIM from the OLD
// app/components/excel-upload/ExcelUploadComponent.tsx (951 LOC). The markup
// has been split into three presentational pieces — ExcelUploadForm (selectors
// + dropzone + actions), ExcelPreviewTable (editable preview / mapping) and
// ExcelUploadResults (results table) — so every file stays under 1,000 LOC.
//
// Call sites are identical to the old app: fetchData / postMultipart from the
// shared @/lib/fetch-util helper and useAuth from @/hooks/use-auth.

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { fetchData, postMultipart } from '@/lib/fetch-util';
import { ExcelUploadForm } from './ExcelUploadForm';
import { ExcelPreviewTable } from './ExcelPreviewTable';
import { ExcelUploadResults } from './ExcelUploadResults';
import type { Workspace, Project, User, UploadResult } from './types';

const ExcelUploadComponent: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [excelData, setExcelData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<any[]>([]);
  const [projectLeads, setProjectLeads] = useState<any[]>([]);
  const [selectedProjectLead, setSelectedProjectLead] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch workspaces on component mount
  React.useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Fetch projects when workspace changes
  React.useEffect(() => {
    if (selectedWorkspace) {
      fetchProjects(selectedWorkspace);
    } else {
      setProjects([]);
      setSelectedProject('');
      setUsers([]);
      setSelectedUser('');
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetchData('/excel-upload/workspaces');
      if (response.success) {
        setWorkspaces(Array.isArray(response.data) ? response.data : (response.data?.data ?? []));
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setError('Failed to fetch workspaces');
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const response = await fetchData(`/excel-upload/workspaces/${workspaceId}/projects`);
      if (response.success) {
        setProjects(Array.isArray(response.data) ? response.data : (response.data?.data ?? []));
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects');
    }
  };

  const fetchUsers = async (projectId: string) => {
    try {
      const response = await fetchData(`/excel-upload/projects/${projectId}/users`);
      if (response.success) {
        setUsers(Array.isArray(response.data) ? response.data : (response.data?.data ?? []));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedUser('');
    setUsers([]);
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setSuccess('');

    if (projectId) {
      fetchUsers(projectId);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      if (!validTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      setSelectedFile(file);
      setError('');
      setSuccess('');
      setUploadResult(null);

      // Parse Excel file for preview
      await parseExcelForPreview(file);
    }
  };

  const parseExcelForPreview = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(50);

      // Use FileReader to read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // Send to backend for parsing
          const formData = new FormData();
          formData.append('file', file);

          const response = await postMultipart('/excel-upload/parse-preview', formData);

          if (response.success) {
            setExcelData(response.data);
            setEditedData(response.data);
            setShowPreview(true);
            setError('');
          } else {
            setError('Failed to parse Excel file: ' + response.message);
          }
        } catch (error: any) {
          console.error('Excel parsing error:', error);
          setError('Failed to parse Excel file. Please check the format.');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error('File reading error:', error);
      setError('Failed to read file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedWorkspace) {
      setError('Please select a workspace');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    if (!selectedFile) {
      setError('Please select an Excel file');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('workspaceId', selectedWorkspace);
    formData.append('projectId', selectedProject);
    formData.append('userId', selectedUser);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await postMultipart('/excel-upload/upload-tasks', formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setSuccess(response.message);
        setUploadResult(response.data);
        // Reset file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError('Upload failed: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    // Create a template Excel file structure
    const templateData = [
      {
        'Task Name': 'Sample Task 1',
        'Task Description': 'This is a sample task description',
        'Status': 'to-do',
        'Priority': 'medium',
        'Start Date': '2024-01-01',
        'End Date': '2024-01-15',
        'Assignee': 'john.doe@example.com',
        'Approval Status': 'not-required',
        'Approval By': '',
        'Approval Date': ''
      },
      {
        'Task Name': 'Sample Task 2',
        'Task Description': 'Another sample task',
        'Status': 'in-progress',
        'Priority': 'high',
        'Start Date': '2024-01-10',
        'End Date': '2024-01-20',
        'Assignee': 'jane.smith@example.com',
        'Approval Status': 'approved',
        'Approval By': 'lead.user@example.com',
        'Approval Date': '2024-01-05'
      }
    ];

    // Create CSV content for download
    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-upload-template-with-approval.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedWorkspace('');
    setSelectedProject('');
    setSelectedUser('');
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setSuccess('');
    setExcelData([]);
    setShowPreview(false);
    setEditingRow(null);
    setEditedData([]);
    setProjectLeads([]);
    setSelectedProjectLead('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditCell = (rowIndex: number, field: string, value: any) => {
    const newData = [...editedData];
    newData[rowIndex][field] = value;
    setEditedData(newData);
  };

  const handleEditRow = (rowIndex: number) => {
    setEditingRow(rowIndex);
  };

  const handleSaveRow = (rowIndex: number) => {
    setEditingRow(null);
  };

  const handleCancelEdit = (rowIndex: number) => {
    // Revert changes for this row
    const newData = [...editedData];
    newData[rowIndex] = { ...excelData[rowIndex] };
    setEditedData(newData);
    setEditingRow(null);
  };

  const fetchProjectLeads = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetchData(`/excel-upload/projects/${selectedProject}/leads`);
      if (response.success) {
        setProjectLeads(Array.isArray(response.data) ? response.data : (response.data?.data ?? []));
      }
    } catch (error) {
      console.error('Error fetching project leads:', error);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !selectedWorkspace || !selectedProject || !selectedUser) {
      setError('Please complete all selections before uploading');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create form data with edited data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('workspaceId', selectedWorkspace);
      formData.append('projectId', selectedProject);
      formData.append('userId', selectedUser);
      formData.append('projectLeadId', selectedProjectLead);
      formData.append('taskData', JSON.stringify(editedData));

      const response = await postMultipart('/excel-upload/upload-tasks', formData);

      if (response.success) {
        setUploadResult(response.data);
        setSuccess(`Successfully created ${response.data.successful.length} tasks!`);
        setShowPreview(false);
        setExcelData([]);
        setEditedData([]);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError('Upload failed: ' + response.message);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setExcelData([]);
    setEditedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Upload Tasks from Excel</CardTitle>
          <CardDescription>
            Import tasks from an Excel file into your project. Download the template to see the required format. New fields added: Approval By (project lead email), Approval Date (YYYY-MM-DD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <ExcelUploadForm
              workspaces={workspaces}
              projects={projects}
              users={users}
              selectedWorkspace={selectedWorkspace}
              selectedProject={selectedProject}
              selectedUser={selectedUser}
              selectedFile={selectedFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={error}
              success={success}
              fileInputRef={fileInputRef}
              onWorkspaceChange={setSelectedWorkspace}
              onProjectChange={handleProjectChange}
              onUserChange={setSelectedUser}
              onFileSelect={handleFileSelect}
              onUpload={handleUpload}
              onReset={resetForm}
              onDownloadTemplate={downloadTemplate}
            />

            {/* Preview Table */}
            {showPreview && editedData.length > 0 && (
              <ExcelPreviewTable
                editedData={editedData}
                users={users}
                selectedUser={selectedUser}
                editingRow={editingRow}
                isUploading={isUploading}
                setEditingRow={setEditingRow}
                onEditCell={handleEditCell}
                onEditRow={handleEditRow}
                onSaveRow={handleSaveRow}
                onCancelEdit={handleCancelEdit}
                onCancelPreview={handleCancelPreview}
                onConfirmUpload={handleConfirmUpload}
              />
            )}

            {/* Results Table */}
            {uploadResult && <ExcelUploadResults uploadResult={uploadResult} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelUploadComponent;
