#!/usr/bin/env node
/**
 * M-BOOK.FR.12 — Render wireframe screenshot placeholders (PNG) for P1 handbook inventory.
 * Clearly labeled — NOT live UI captures. Replace via capture-screenshots runbook.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablette: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPlaceholderSvg(entry) {
  const vp = VIEWPORTS[entry.viewport] ?? VIEWPORTS.desktop;
  const w = vp.width;
  const h = vp.height;
  const title = entry.title;
  const route = entry.route;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#f1f5f9"/>
  <rect x="24" y="24" width="${w - 48}" height="56" rx="8" fill="#1e293b"/>
  <text x="40" y="58" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#f8fafc">Medora-S — ${escapeXml(title)}</text>
  <rect x="24" y="96" width="220" height="${h - 120}" rx="8" fill="#e2e8f0" stroke="#94a3b8"/>
  <text x="40" y="130" font-family="system-ui,sans-serif" font-size="12" fill="#475569">Navigation</text>
  <rect x="260" y="96" width="${w - 284}" height="${h - 120}" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="280" y="140" font-family="system-ui,sans-serif" font-size="14" fill="#334155">${escapeXml(route)}</text>
  <text x="280" y="180" font-family="system-ui,sans-serif" font-size="13" fill="#64748b">Zone contenu — capture formation à produire</text>
  <rect x="280" y="210" width="320" height="36" rx="6" fill="#fef3c7" stroke="#f59e0b"/>
  <text x="292" y="233" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#92400e">PLACEHOLDER — PATIENT FORMATION FICTIF UNIQUEMENT</text>
  <text x="24" y="${h - 16}" font-family="system-ui,sans-serif" font-size="11" fill="#94a3b8">${escapeXml(entry.id)} · ${escapeXml(entry.viewport)} · ${escapeXml(entry.filename)}</text>
</svg>`;
}

async function loadManifestEntries() {
  const manifestPath = path.join(
    repoRoot,
    "docs/operations/medora-enterprise-handbook-fr/exports/screenshot-manifest-fr.ts",
  );
  const src = fs.readFileSync(manifestPath, "utf8");
  const entries = [];
  const re =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?filename:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?route:\s*"([^"]+)"[\s\S]*?viewport:\s*"([^"]+)"[\s\S]*?priority:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push({
      id: m[1],
      filename: m[2],
      title: m[3],
      route: m[4],
      viewport: m[5],
      priority: m[6],
    });
  }
  return entries;
}

async function loadSharp() {
  const sharpPath = path.join(repoRoot, "apps/web/node_modules/sharp/lib/index.js");
  if (!fs.existsSync(sharpPath)) return null;
  const mod = await import(sharpPath);
  return mod.default ?? mod;
}

const outDir = path.join(
  repoRoot,
  "docs/operations/medora-enterprise-handbook-fr/assets/screenshots",
);
const legacyDir = path.join(
  repoRoot,
  "docs/operations/medora-enterprise-handbook-fr/assets-placeholders/screenshots",
);

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(legacyDir, { recursive: true });

const sharp = await loadSharp();
if (!sharp) {
  console.error("sharp required — run pnpm install in apps/web first");
  process.exit(1);
}

const entries = await loadManifestEntries();
const p1 = entries.filter((e) => e.priority === "P1");

for (const entry of p1) {
  const svg = renderPlaceholderSvg(entry);
  const pngPath = path.join(outDir, entry.filename);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  fs.copyFileSync(pngPath, path.join(legacyDir, entry.filename));
}

console.log(`Rendered ${p1.length} P1 screenshot placeholder PNG(s) → ${path.relative(repoRoot, outDir)}`);
