-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "cycleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flagReason" TEXT;

-- CreateTable
CREATE TABLE "ProjectEndDateCache" (
    "projectId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEndDateCache_pkey" PRIMARY KEY ("projectId")
);

-- CreateIndex
CREATE INDEX "Task_isFlagged_idx" ON "Task"("isFlagged");
