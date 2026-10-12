import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function companyLogoBuffer(): Buffer {
  const assetsDirectory = fileURLToPath(new URL("../client/assets/", import.meta.url));
  const assets = readdirSync(assetsDirectory);
  const logoFile = ["Logo_doctorcom_powered", "Logo_doctorcom_compact", "Logo_doctorcom"]
    .map((baseName) => assets.find((file) => new RegExp(`^${baseName}(?:-[\\w-]+)?\\.png$`, "i").test(file)))
    .find(Boolean);
  if (!logoFile) throw new Error("The 5 Sens logo asset is missing from the PDF build");
  return readFileSync(join(assetsDirectory, logoFile));
}
