-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('super_admin', 'admin', 'project_head', 'team_lead', 'member'));
