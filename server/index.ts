import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { database, purgeExpiredDrafts } from "./database.js";
import { createReportJobs } from "./reportJobs.js";

const port = Number(process.env.PORT ?? 3001);
const reportJobs = createReportJobs(database);
const app = createApp(database, { reportJobs });

if (process.env.NODE_ENV === "production") {
  const clientDirectory = fileURLToPath(new URL("../client/", import.meta.url));
  app.use(express.static(clientDirectory, { index: false, immutable: true, maxAge: "1y" }));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.sendFile(resolve(clientDirectory, "index.html"));
  });
}

database.get("SELECT 1");

const httpServer = app.listen(port, "0.0.0.0", () => {
  console.log(`Doctor Com API listening on port ${port}`);
});

const purgeTimer = setInterval(() => {
  void purgeExpiredDrafts().catch(() => console.warn("Could not purge expired questionnaire drafts."));
}, 6 * 60 * 60 * 1000);
purgeTimer.unref();
void purgeExpiredDrafts().catch(() => console.warn("Could not purge expired questionnaire drafts."));
void reportJobs.resumePending().catch(() => console.warn("Could not resume pending communication plans."));

function shutdown() {
  clearInterval(purgeTimer);
  httpServer.close(() => {
    database.close();
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);