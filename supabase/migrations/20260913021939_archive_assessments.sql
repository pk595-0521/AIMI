ALTER TABLE "AssessmentSession" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AssessmentSession_org_unarchived_idx" ON "AssessmentSession" ("organizationId", "createdAt" DESC) WHERE "archivedAt" IS NULL;
