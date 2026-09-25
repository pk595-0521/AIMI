CREATE TABLE IF NOT EXISTS public.enterprise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 1 AND 200),
  work_email text NOT NULL UNIQUE CHECK (work_email = lower(work_email) AND char_length(work_email) <= 320),
  company_name text NOT NULL CHECK (char_length(trim(company_name)) BETWEEN 1 AND 200),
  team_size text NOT NULL CHECK (team_size IN ('1–10', '11–50', '51–200', '201–1000', '1000+')),
  track_interest text NOT NULL CHECK (track_interest IN ('IB', 'PM', 'Consulting', 'Ops')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enterprise_leads FROM anon, authenticated;
COMMENT ON TABLE public.enterprise_leads IS 'Private enterprise pilot inquiries; writes only through the origin-checked, rate-limited server endpoint.';
