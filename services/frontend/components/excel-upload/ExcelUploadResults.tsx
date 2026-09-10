'use client';

// Upload-results section of the Excel upload screen. Markup ported VERBATIM
// from the OLD ExcelUploadComponent.tsx "Results Table" block (success / failed
// badges, failed-rows error table and the short successful-tasks summary).

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import type { UploadResult } from './types';

interface ExcelUploadResultsProps {
  uploadResult: UploadResult;
}

export const ExcelUploadResults: React.FC<ExcelUploadResultsProps> = ({ uploadResult }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upload Results</h3>
        <div className="flex space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Success: {uploadResult.successful.length}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700">
            Failed: {uploadResult.failed.length}
          </Badge>
        </div>
      </div>

      {uploadResult.failed.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadResult.failed.map((failure, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{failure.row}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {failure.errors?.map((error, errorIndex) => (
                        <div key={errorIndex} className="text-sm text-red-600 flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {uploadResult.successful.length > 0 && (
        <div className="text-sm text-gray-600">
          Successfully created {uploadResult.successful.length} tasks.
          {uploadResult.successful.slice(0, 3).map((success, index) => (
            <div key={index} className="flex items-center space-x-1 mt-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>{success.title}</span>
            </div>
          ))}
          {uploadResult.successful.length > 3 && (
            <div className="mt-1">...and {uploadResult.successful.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelUploadResults;
