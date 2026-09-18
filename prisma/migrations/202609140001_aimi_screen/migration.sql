CREATE TYPE "AssessmentType" AS ENUM ('AIMI_SUPERDAY', 'AIMI_SCREEN');
ALTER TABLE "AssessmentSession"
 ADD COLUMN "assessmentType" "AssessmentType" NOT NULL DEFAULT 'AIMI_SUPERDAY',
 ADD COLUMN "screenStartedAt" TIMESTAMP(3),
 ADD COLUMN "dataHygieneSelections" JSONB,
 ADD COLUMN "branchingDecision" JSONB,
 ADD COLUMN "shockTriggeredAt" TIMESTAMP(3),
 ADD COLUMN "finalDeliverable" TEXT,
 ADD COLUMN "scratchpad" TEXT;
ALTER TABLE "Evaluation" ADD COLUMN "screenCaps" JSONB;
