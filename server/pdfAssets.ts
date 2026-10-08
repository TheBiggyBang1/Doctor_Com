import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function companyLogoBuffer(): Buffer {
  try {
    return readFileSync(new URL("../client/assets/Logo_doctorcom_powered.png", import.meta.url));
  } catch {
    const assetsDirectory = fileURLToPath(new URL("../client/assets/", import.meta.url));
    const logoFile = readdirSync(assetsDirectory).find((file) => /^Logo_doctorcom_powered-.*\.png$/i.test(file));
    if (!logoFile) throw new Error("The 5 Sens logo asset is missing from the PDF build");
    return readFileSync(join(assetsDirectory, logoFile));
  }
}
