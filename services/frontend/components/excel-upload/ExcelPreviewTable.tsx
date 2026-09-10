'use client';

// Editable preview table for parsed Excel rows. Markup ported VERBATIM from the
// OLD ExcelUploadComponent.tsx "Preview Table" block (inline cell editing,
// status / priority / approval-status / approval-by mapping selects, date
// inputs and the confirm/cancel action row). State + handlers are owned by the
// orchestrating ExcelUploadComponent and passed down as props.

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, RefreshCw, Edit3, Save, X } from 'lucide-react';
import type { User } from './types';

interface ExcelPreviewTableProps {
  editedData: any[];
  users: User[];
  selectedUser: string;
  editingRow: number | null;
  isUploading: boolean;
  setEditingRow: (index: number | null) => void;
  onEditCell: (rowIndex: number, field: string, value: any) => void;
  onEditRow: (rowIndex: number) => void;
  onSaveRow: (rowIndex: number) => void;
  onCancelEdit: (rowIndex: number) => void;
  onCancelPreview: () => void;
  onConfirmUpload: () => void;
}

export const ExcelPreviewTable: React.FC<ExcelPreviewTableProps> = ({
  editedData,
  users,
  selectedUser,
  editingRow,
  isUploading,
  setEditingRow,
  onEditCell,
  onEditRow,
  onSaveRow,
  onCancelEdit,
  onCancelPreview,
  onConfirmUpload,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview Tasks</h3>
        <Badge variant="outline">{editedData.length} tasks ready to upload</Badge>
      </div>



      {/* Preview Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Edit</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Approval By</TableHead>
                <TableHead>Approval Date</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {editingRow === index ? (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSaveRow(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancelEdit(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditRow(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <input
                        type="text"
                        value={row.title || ''}
                        onChange={(e) => onEditCell(index, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingRow(null);
                          if (e.key === 'Escape') setEditingRow(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      row.title
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <textarea
                        value={row.description || ''}
                        onChange={(e) => onEditCell(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded resize-none"
                        rows={2}
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) setEditingRow(null);
                          if (e.key === 'Escape') setEditingRow(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <div className="max-w-xs truncate" title={row.description}>
                        {row.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <input
                        type="date"
                        value={row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => onEditCell(index, 'startDate', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingRow(null);
                          if (e.key === 'Escape') setEditingRow(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      new Date(row.startDate).toLocaleDateString()
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <input
                        type="date"
                        value={row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => onEditCell(index, 'dueDate', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingRow(null);
                          if (e.key === 'Escape') setEditingRow(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      new Date(row.dueDate).toLocaleDateString()
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <Select value={row.status || 'to-do'} onValueChange={(value) => onEditCell(index, 'status', value)}>
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="to-do">To Do</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{row.status || 'to-do'}</Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <Select value={row.priority || 'medium'} onValueChange={(value) => onEditCell(index, 'priority', value)}>
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{row.priority || 'medium'}</Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <Select value={row.approvalStatus || 'not-required'} onValueChange={(value) => onEditCell(index, 'approvalStatus', value)}>
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not-required">Not Required</SelectItem>
                          <SelectItem value="pending-approval">Pending Approval</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={row.approvalStatus === 'approved' ? 'default' :
                               row.approvalStatus === 'rejected' ? 'destructive' :
                               row.approvalStatus === 'pending-approval' ? 'secondary' : 'outline'}
                      >
                        {row.approvalStatus || 'not-required'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <Select
                        value={row.approvalBy || 'none'}
                        onValueChange={(value) => onEditCell(index, 'approvalBy', value === 'none' ? null : value)}
                        disabled={row.approvalStatus !== 'approved'}
                      >
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue placeholder="Select lead" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {users.filter(user => user.role === 'lead').map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">
                        {row.approvalBy && row.approvalBy !== 'none' ? users.find(u => u._id === row.approvalBy)?.name || 'Unknown' : 'None'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingRow(index)}
                  >
                    {editingRow === index ? (
                      <input
                        type="date"
                        value={row.approvalDate ? new Date(row.approvalDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => onEditCell(index, 'approvalDate', e.target.value === '' ? null : e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        disabled={row.approvalStatus !== 'approved'}
                        onBlur={() => setEditingRow(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingRow(null);
                          if (e.key === 'Escape') setEditingRow(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm">
                        {row.approvalDate ? new Date(row.approvalDate).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {users.find(u => u._id === selectedUser)?.name || 'Selected User'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Preview Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onCancelPreview}
        >
          Cancel Preview
        </Button>

        <div className="flex space-x-3">
          <Button
            onClick={onConfirmUpload}
            disabled={isUploading || editedData.length === 0}
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
                <span>Confirm Upload ({editedData.length} tasks)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExcelPreviewTable;
