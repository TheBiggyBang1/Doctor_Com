CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id BIGSERIAL PRIMARY KEY,
  resume_token_hash TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  current_step INTEGER NOT NULL DEFAULT 1,
  answers JSONB NOT NULL,
  client_coordinates JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  score_total INTEGER,
  score_budget INTEGER,
  score_urgency INTEGER,
  score_company INTEGER,
  lead_category TEXT CHECK (lead_category IS NULL OR lead_category IN ('A', 'B', 'C')),
  scored_at TIMESTAMPTZ,
  report_status TEXT NOT NULL DEFAULT 'not_started' CHECK (report_status IN ('not_started', 'pending', 'processing', 'ready', 'failed')),
  report_markdown TEXT,
  report_html TEXT,
  report_pdf BYTEA,
  report_generated_at TIMESTAMPTZ,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMPTZ
);

ALTER TABLE questionnaire_submissions
  ADD COLUMN IF NOT EXISTS client_coordinates JSONB;

CREATE INDEX IF NOT EXISTS idx_questionnaire_status_updated ON questionnaire_submissions (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_questionnaire_report_status ON questionnaire_submissions (report_status, id);

CREATE OR REPLACE FUNCTION set_questionnaire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS questionnaire_submissions_updated_at ON questionnaire_submissions;
CREATE TRIGGER questionnaire_submissions_updated_at
BEFORE UPDATE ON questionnaire_submissions
FOR EACH ROW
EXECUTE FUNCTION set_questionnaire_updated_at();