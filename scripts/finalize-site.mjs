import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const siteDir = resolve("site");
const sourceHtml = resolve(siteDir, "app.html");
const targetHtml = resolve(siteDir, "index.html");

if (!existsSync(sourceHtml)) {
  throw new Error(`Expected build output at ${sourceHtml}`);
}

copyFileSync(sourceHtml, targetHtml);
