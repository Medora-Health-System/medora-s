#!/usr/bin/env node
/**
 * M-BOOK.FR.12 — Assemble enterprise handbook markdown for PDF/DOCX export.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const handbookRoot = path.join(repoRoot, "docs/operations/medora-enterprise-handbook-fr");
const outDir = path.join(handbookRoot, "exports/assembled");
const outFile = path.join(outDir, "medora-enterprise-handbook-fr-assembled.md");

const ASSEMBLY_HEADER = `# Manuel d'exploitation entreprise Medora-S — Assemblage export

**Phase:** M-BOOK.FR.12  
**Langue:** Français  
**Statut:** Assemblage automatique — revue direction requise avant diffusion  

> Ce manuel soutient l'exploitation et la formation. Il ne remplace pas les politiques institutionnelles ni le jugement clinique. Medora-S est **dépendant du cloud** en production MVP.

---

`;

const SECTIONS = [
  { label: "Page de garde", file: "00-page-garde.md", base: handbookRoot },
  { label: "Table des matières", file: "01-table-des-matieres.md", base: handbookRoot },
  { label: "Introduction générale", file: "02-introduction-generale.md", base: handbookRoot },
  { label: "Glossaire", file: "03-glossaire.md", base: handbookRoot },
  { label: "Index workflows", file: "04-index-workflows.md", base: handbookRoot },
  { label: "Index routes", file: "05-index-routes.md", base: handbookRoot },
  { label: "Index acronymes", file: "06-index-acronymes.md", base: handbookRoot },
  { label: "Volume 1 — Accueil", file: "handbook-fr-registration-intake.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 2 — Triage", file: "handbook-fr-triage-clinical-intake.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 3 — Prestataire", file: "handbook-fr-provider-workflow-documentation.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 4 — Infirmier", file: "handbook-fr-nursing-discharge-execution.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 5 — Auxiliaires", file: "handbook-fr-pharmacy-lab-radiology.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 6 — Orientation / ROI", file: "handbook-fr-disposition-admission-transfer-roi.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 7 — Administration", file: "handbook-fr-administration-governance-operations.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 8 — Mobile / Haïti", file: "handbook-fr-mobile-tablette-haiti.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Volume 9 — Formation", file: "handbook-fr-training-onboarding-certification.md", base: path.join(repoRoot, "docs/operations") },
  { label: "Annexe A — Haïti", file: "appendices/appendix-a-haiti-deployment.md", base: handbookRoot },
  { label: "Annexe B — Mobile", file: "appendices/appendix-b-mobile-safety.md", base: handbookRoot },
  { label: "Annexe C — Référence rapide", file: "appendices/appendix-c-quick-reference.md", base: handbookRoot },
  { label: "Annexe D — Scénarios", file: "appendices/appendix-d-training-scenarios.md", base: handbookRoot },
  { label: "Annexe E — Panne papier", file: "appendices/appendix-e-downtime-paper-workflow.md", base: handbookRoot },
  { label: "Gouvernance documentaire", file: "09-gouvernance-documentaire.md", base: handbookRoot },
];

function readSection(section) {
  const full = path.join(section.base, section.file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing handbook section: ${full}`);
  }
  return fs.readFileSync(full, "utf8");
}

fs.mkdirSync(outDir, { recursive: true });

const parts = [ASSEMBLY_HEADER];
for (const section of SECTIONS) {
  parts.push(`\n\n<!-- SECTION: ${section.label} -->\n\n`);
  parts.push(readSection(section));
  parts.push("\n\n\\newpage\n\n");
}

fs.writeFileSync(outFile, parts.join(""), "utf8");
console.log(`Assembled handbook → ${path.relative(repoRoot, outFile)} (${SECTIONS.length} sections)`);
