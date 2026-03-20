-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_parentTask_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_sprintId_fkey";

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'planned';

-- CreateTable
CREATE TABLE "ProjectMemberRoleCache" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMemberRoleCache_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "RecurringTaskTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "assignees" TEXT[],
    "intervalDays" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "projectHeadId" TEXT,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTaskTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RecurringTaskTemplate"
ADD CONSTRAINT "RecurringTaskTemplate_intervalDays_check"
CHECK ("intervalDays" > 0);

-- CreateIndex
CREATE INDEX "ProjectMemberRoleCache_projectId_idx" ON "ProjectMemberRoleCache"("projectId");

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_projectId_idx" ON "RecurringTaskTemplate"("projectId");

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_nextDueDate_idx" ON "RecurringTaskTemplate"("nextDueDate");

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_isActive_idx" ON "RecurringTaskTemplate"("isActive");

-- CreateIndex
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");
