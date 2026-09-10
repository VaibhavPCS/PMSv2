// Excel Data Upload page (Next.js App Router port of the OLD
// app/routes/excel-upload/excel-upload.tsx). Thin wrapper: the header block is
// pixel-identical to the old route and the screen body lives in the client
// ExcelUploadComponent, which is split into <1,000-LOC presentational pieces.

import ExcelUploadComponent from '@/components/excel-upload/ExcelUploadComponent';

export default function ExcelUploadPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Excel Data Upload</h1>
        <p className="text-muted-foreground">
          Upload project tasks from Excel files with workspace and project selection
        </p>
      </div>
      <ExcelUploadComponent />
    </div>
  );
}
