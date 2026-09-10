-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('APPLICANT', 'GRADER', 'EMPLOYER_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NodeCategory" AS ENUM ('DIAGNOSE', 'ANALYZE', 'DECIDE', 'PILOT');

-- CreateEnum
CREATE TYPE "PromptStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'APPLICANT',
    "organizationId" UUID NOT NULL,
    "certifiedGrader" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scenario" JSONB NOT NULL,
    "phaseConfigurations" JSONB NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssessmentTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSession" (
    "id" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "trackId" TEXT NOT NULL,
    "scenarioVersion" INTEGER NOT NULL,
    "scenarioSnapshot" JSONB NOT NULL,
    "rubricSnapshot" JSONB NOT NULL,
    "activePhase" INTEGER NOT NULL DEFAULT 1,
    "phaseStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseDeadlineAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "isPeerReviewComplete" BOOLEAN NOT NULL DEFAULT false,
    "peerReview" JSONB,
    "reflection" TEXT,
    "dataHandling" JSONB,
    "drafts" JSONB NOT NULL DEFAULT '{}',
    "roadmapResponses" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapNode" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "category" "NodeCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tradeoffs" TEXT NOT NULL,
    "owner" TEXT,
    "dependencies" TEXT,
    "targetMilestone" TEXT,
    "triggerThreshold" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "connectsTo" TEXT[],
    "bezierPaths" TEXT[],
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isRevisedAfterConstraint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoadmapNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioMessage" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "ScenarioMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseCheckpoint" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "phase" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptLog" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "phase" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "response" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "status" "PromptStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PromptLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "anchors" JSONB NOT NULL,
    "hardGateRule" TEXT,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "graderId" UUID NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "scores" JSONB NOT NULL DEFAULT '{}',
    "overallScore" DOUBLE PRECISION,
    "feedback" TEXT NOT NULL DEFAULT '',
    "planningCapApplied" BOOLEAN NOT NULL DEFAULT false,
    "humanDecision" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalConsent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "policyDigest" TEXT NOT NULL,
    "monitoringAccepted" BOOLEAN NOT NULL,
    "zeroRetrainingAccepted" BOOLEAN NOT NULL,
    "humanReviewAccepted" BOOLEAN NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_subject_key" ON "User"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE INDEX "AssessmentSession_organizationId_status_idx" ON "AssessmentSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AssessmentSession_applicantId_createdAt_idx" ON "AssessmentSession"("applicantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapNode_sessionId_key_key" ON "RoadmapNode"("sessionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioMessage_sessionId_key_key" ON "ScenarioMessage"("sessionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseCheckpoint_sessionId_revision_key" ON "PhaseCheckpoint"("sessionId", "revision");

-- CreateIndex
CREATE INDEX "PromptLog_sessionId_phase_createdAt_idx" ON "PromptLog"("sessionId", "phase", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptLog_sessionId_requestId_key" ON "PromptLog"("sessionId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterion_trackId_key_key" ON "RubricCriterion"("trackId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_sessionId_graderId_key" ON "Evaluation"("sessionId", "graderId");

-- CreateIndex
CREATE INDEX "LegalConsent_userId_acceptedAt_idx" ON "LegalConsent"("userId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalConsent_sessionId_policyVersion_key" ON "LegalConsent"("sessionId", "policyVersion");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "AssessmentTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapNode" ADD CONSTRAINT "RoadmapNode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioMessage" ADD CONSTRAINT "ScenarioMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseCheckpoint" ADD CONSTRAINT "PhaseCheckpoint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptLog" ADD CONSTRAINT "PromptLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "AssessmentTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Defense in depth for invariants independent of API validation.
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "valid_phase" CHECK ("activePhase" BETWEEN 1 AND 4);
ALTER TABLE "RoadmapNode" ADD CONSTRAINT "valid_node_phase" CHECK (phase BETWEEN 1 AND 4);
ALTER TABLE "PromptLog" ADD CONSTRAINT "valid_prompt_phase" CHECK (phase BETWEEN 1 AND 4);
ALTER TABLE "PromptLog" ADD CONSTRAINT "nonnegative_usage" CHECK (("inputTokens" IS NULL OR "inputTokens" >= 0) AND ("outputTokens" IS NULL OR "outputTokens" >= 0) AND ("latencyMs" IS NULL OR "latencyMs" >= 0));
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "valid_rubric_weight" CHECK (weight > 0 AND weight <= 100 AND "maxScore" > 0);
ALTER TABLE "LegalConsent" ADD CONSTRAINT "explicit_consent" CHECK ("monitoringAccepted" AND "zeroRetrainingAccepted" AND "humanReviewAccepted");


-- Supabase Data API posture: the application server uses the private database role.
-- No anon/authenticated policy is granted; all exposed-table access is denied by default.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Organization','User','AssessmentTrack','AssessmentSession','RoadmapNode','ScenarioMessage','PhaseCheckpoint','PromptLog','RubricCriterion','Evaluation','LegalConsent'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', table_name);
  END LOOP;
END $$;

