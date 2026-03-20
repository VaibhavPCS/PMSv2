-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_entityType_entityId_idx" ON "files"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "files_workspaceId_idx" ON "files"("workspaceId");

-- CreateIndex
CREATE INDEX "files_uploadedBy_createdAt_idx" ON "files"("uploadedBy", "createdAt");
