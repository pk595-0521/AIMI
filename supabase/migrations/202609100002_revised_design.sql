ALTER TABLE "AssessmentSession" DROP CONSTRAINT "valid_phase", ADD CONSTRAINT "valid_phase" CHECK ("activePhase" BETWEEN 1 AND 5);
ALTER TABLE "RoadmapNode" DROP CONSTRAINT "valid_node_phase", ADD CONSTRAINT "valid_node_phase" CHECK (phase BETWEEN 1 AND 5);
ALTER TABLE "PromptLog" DROP CONSTRAINT "valid_prompt_phase", ADD CONSTRAINT "valid_prompt_phase" CHECK (phase BETWEEN 1 AND 5);
ALTER TABLE "AssessmentSession" ADD COLUMN "work" JSONB NOT NULL DEFAULT '{}', ADD COLUMN "hygieneEvents" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Evaluation" ADD COLUMN "advisory" JSONB;
CREATE TABLE "Artifact" (
 "id" UUID PRIMARY KEY, "sessionId" UUID NOT NULL REFERENCES "AssessmentSession"("id"),
 "phase" INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 5), "name" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL CHECK (size > 0 AND size <= 5000000),
 "sha256" TEXT NOT NULL, "bytes" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Artifact_sessionId_createdAt_idx" ON "Artifact"("sessionId", "createdAt");


-- Keep uploaded candidate artifacts private to the application server.
ALTER TABLE "Artifact" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Artifact" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "Artifact" FROM authenticated;
  END IF;
END $$;
