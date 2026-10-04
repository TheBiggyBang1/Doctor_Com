CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_token_hash TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  current_step INTEGER NOT NULL DEFAULT 1,
  answers TEXT NOT NULL CHECK (json_valid(answers)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  score_total INTEGER,
  score_budget INTEGER,
  score_urgency INTEGER,
  score_company INTEGER,
  lead_category TEXT CHECK (lead_category IS NULL OR lead_category IN ('A', 'B', 'C')),
  scored_at TEXT,
  report_status TEXT NOT NULL DEFAULT 'not_started' CHECK (report_status IN ('not_started', 'pending', 'processing', 'ready', 'failed')),
  report_markdown TEXT,
  report_html TEXT,
  report_pdf BLOB,
  report_generated_at TEXT,
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_status_updated ON questionnaire_submissions (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_questionnaire_report_status ON questionnaire_submissions (report_status, id);

CREATE TRIGGER IF NOT EXISTS questionnaire_submissions_updated_at
AFTER UPDATE ON questionnaire_submissions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE questionnaire_submissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;