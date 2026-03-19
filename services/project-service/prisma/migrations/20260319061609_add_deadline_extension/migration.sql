-- AlterTable
ALTER TABLE "Project" RENAME COLUMN "dueDate" TO "endDate";

-- CreateTable
CREATE TABLE "ProjectDateHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "oldEndDate" TIMESTAMP(3),
    "newEndDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "extendedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRoleCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceRoleCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDateHistory_projectId_idx" ON "ProjectDateHistory"("projectId");

-- CreateIndex
CREATE INDEX "WorkspaceRoleCache_userId_idx" ON "WorkspaceRoleCache"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceRoleCache_workspaceId_idx" ON "WorkspaceRoleCache"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRoleCache_userId_workspaceId_key" ON "WorkspaceRoleCache"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "ProjectDateHistory" ADD CONSTRAINT "ProjectDateHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
