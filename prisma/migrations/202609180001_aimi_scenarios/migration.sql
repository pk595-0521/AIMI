CREATE TABLE "public"."aimi_scenarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_key" TEXT NOT NULL,
  "track" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "context_brief" TEXT NOT NULL,
  "exhibits" JSONB NOT NULL,
  "stakeholder_inbox" JSONB NOT NULL,
  "branching_options" JSONB NOT NULL,
  "minute_20_shock" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aimi_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "aimi_scenarios_track_idx" ON "public"."aimi_scenarios"("track");
CREATE UNIQUE INDEX "aimi_scenarios_source_key_key" ON "public"."aimi_scenarios"("source_key");
ALTER TABLE "public"."aimi_scenarios" ENABLE ROW LEVEL SECURITY;
