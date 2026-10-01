import "dotenv/config";
import { createApp } from "./app.js";
import { pool, purgeExpiredDrafts } from "./database.js";
import { createReportJobs } from "./reportJobs.js";

const port = Number(process.env.PORT ?? 3001);
const reportJobs = createReportJobs(pool);
const app = createApp(pool, { reportJobs });

app.listen(port, "0.0.0.0", () => {
  console.log(`Doctor Com API listening on port ${port}`);
});

const purgeTimer = setInterval(() => {
  void purgeExpiredDrafts().catch(() => console.warn("Could not purge expired questionnaire drafts."));
}, 6 * 60 * 60 * 1000);
purgeTimer.unref();
void purgeExpiredDrafts().catch(() => console.warn("Could not purge expired questionnaire drafts."));
void reportJobs.resumePending().catch(() => console.warn("Could not resume pending communication plans."));