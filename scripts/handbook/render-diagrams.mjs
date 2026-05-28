#!/usr/bin/env node
/**
 * M-BOOK.FR.12 — Render handbook diagram SVG (+ optional PNG) assets.
 * Usage: node scripts/handbook/render-diagrams.mjs [--png]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderFlowchartSvg } from "./flowchart-svg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const definitionsPath = path.join(__dirname, "diagram-definitions-fr.json");
const outDir = path.join(
  repoRoot,
  "docs/operations/medora-enterprise-handbook-fr/assets/diagrams",
);
const legacyDir = path.join(
  repoRoot,
  "docs/operations/medora-enterprise-handbook-fr/assets-placeholders/diagrams",
);

const withPng = process.argv.includes("--png");

async function loadSharp() {
  try {
    const sharpPath = path.join(repoRoot, "apps/web/node_modules/sharp/lib/index.js");
    if (!fs.existsSync(sharpPath)) return null;
    const mod = await import(sharpPath);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

const definitions = JSON.parse(fs.readFileSync(definitionsPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(legacyDir, { recursive: true });

const sharp = withPng ? await loadSharp() : null;
let count = 0;

for (const [basename, def] of Object.entries(definitions)) {
  const svg = renderFlowchartSvg({
    title: def.title,
    steps: def.steps,
    id: def.id,
  });
  const svgPath = path.join(outDir, `${basename}.svg`);
  fs.writeFileSync(svgPath, svg, "utf8");
  fs.writeFileSync(path.join(legacyDir, `${basename}.svg`), svg, "utf8");

  if (sharp) {
    const pngPath = path.join(outDir, `${basename}.png`);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    fs.copyFileSync(pngPath, path.join(legacyDir, `${basename}.png`));
  }
  count += 1;
}

console.log(`Rendered ${count} diagram SVG(s) → ${path.relative(repoRoot, outDir)}`);
if (withPng && sharp) {
  console.log(`PNG exports generated via sharp`);
} else if (withPng) {
  console.warn("sharp not found — SVG only (run from repo with apps/web installed)");
}
