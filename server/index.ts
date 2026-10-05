import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createReportJobs } from "./reportJobs.js";

const port = Number(process.env.PORT ?? 3001);
const reportJobs = createReportJobs();
const app = createApp({ reportJobs });

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

const httpServer = app.listen(port, "0.0.0.0", () => {
  console.log(`Doctor Com API listening on port ${port}`);
});

function shutdown() {
  httpServer.close(() => {
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);