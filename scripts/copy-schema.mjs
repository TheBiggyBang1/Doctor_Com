import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await copyFile("server/schema.sql", "dist/server/schema.sql");