import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = process.argv[2] ?? "chrome";
const sourceManifest = target === "firefox" ? "manifest.firefox.json" : "manifest.json";

const from = resolve(sourceManifest);
const to = resolve("dist/manifest.json");

await copyFile(from, to);
console.log(`Copied ${sourceManifest} to dist/manifest.json`);
