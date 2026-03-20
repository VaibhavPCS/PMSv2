-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "currentAssigneeId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transition_history" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "transitionLabel" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "referenceLink" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transition_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_sla_tracking" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "durationMs" BIGINT,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workflow_sla_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_definitions_workspaceId_idx" ON "workflow_definitions"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_workspaceId_name_key" ON "workflow_definitions"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_taskId_key" ON "workflow_instances"("taskId");

-- CreateIndex
CREATE INDEX "workflow_instances_workflowDefinitionId_idx" ON "workflow_instances"("workflowDefinitionId");

-- CreateIndex
CREATE INDEX "workflow_instances_currentStage_idx" ON "workflow_instances"("currentStage");

-- CreateIndex
CREATE INDEX "workflow_instances_isTerminal_idx" ON "workflow_instances"("isTerminal");

-- CreateIndex
CREATE INDEX "workflow_instances_isTerminal_currentStage_idx" ON "workflow_instances"("isTerminal", "currentStage");

-- CreateIndex
CREATE INDEX "workflow_transition_history_instanceId_idx" ON "workflow_transition_history"("instanceId");

-- CreateIndex
CREATE INDEX "workflow_sla_tracking_instanceId_stage_idx" ON "workflow_sla_tracking"("instanceId", "stage");

-- CreateIndex
CREATE INDEX "workflow_sla_tracking_slaBreached_idx" ON "workflow_sla_tracking"("slaBreached");

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition_history" ADD CONSTRAINT "workflow_transition_history_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_sla_tracking" ADD CONSTRAINT "workflow_sla_tracking_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
