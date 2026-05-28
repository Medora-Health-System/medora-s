#!/usr/bin/env node
/**
 * M-BOOK.FR.12 — Export assembled handbook to PDF/DOCX via pandoc (optional external tool).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const assembled = path.join(
  repoRoot,
  "docs/operations/medora-enterprise-handbook-fr/exports/assembled/medora-enterprise-handbook-fr-assembled.md",
);
const outDir = path.join(repoRoot, "docs/operations/medora-enterprise-handbook-fr/exports/build");

function hasPandoc() {
  const r = spawnSync("pandoc", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

if (!fs.existsSync(assembled)) {
  console.error("Run handbook:assemble first");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const pdfOut = path.join(outDir, `medora-enterprise-handbook-fr-${date}.pdf`);
const docxOut = path.join(outDir, `medora-enterprise-handbook-fr-${date}.docx`);

if (!hasPandoc()) {
  const readme = `# Export build — pandoc requis

Assemblage markdown disponible : \`../assembled/medora-enterprise-handbook-fr-assembled.md\`

Installer pandoc puis exécuter :

\`\`\`bash
pnpm handbook:export
\`\`\`

Ou manuellement :

\`\`\`bash
pandoc ../assembled/medora-enterprise-handbook-fr-assembled.md -o medora-enterprise-handbook-fr.pdf --pdf-engine=xelatex
pandoc ../assembled/medora-enterprise-handbook-fr-assembled.md -o medora-enterprise-handbook-fr.docx
\`\`\`

Medora-S reste **dépendant du cloud** — ce export est documentation uniquement.
`;
  fs.writeFileSync(path.join(outDir, "README.md"), readme, "utf8");
  console.log("pandoc not installed — assembled markdown ready; wrote exports/build/README.md");
  process.exit(0);
}

const meta = [
  "-V", "title=Manuel entreprise Medora-S (FR)",
  "-V", "lang=fr",
  "-V", "geometry:margin=2.5cm",
];

const pdfArgs = [
  assembled,
  "-o",
  pdfOut,
  "--toc",
  "--toc-depth=3",
  "--pdf-engine=xelatex",
  ...meta,
];

const pdf = spawnSync("pandoc", pdfArgs, { encoding: "utf8", stdio: "inherit" });
if (pdf.status !== 0) process.exit(pdf.status ?? 1);

const docx = spawnSync(
  "pandoc",
  [assembled, "-o", docxOut, "--toc", "--toc-depth=3", ...meta],
  { encoding: "utf8", stdio: "inherit" },
);
if (docx.status !== 0) process.exit(docx.status ?? 1);

console.log(`PDF  → ${path.relative(repoRoot, pdfOut)}`);
console.log(`DOCX → ${path.relative(repoRoot, docxOut)}`);
