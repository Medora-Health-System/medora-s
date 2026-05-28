import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR11_ENTERPRISE_HANDBOOK_VERSION = "M-BOOK.FR.11";
export const MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT =
  "docs/operations/medora-enterprise-handbook-fr";

const repoRoot = join(import.meta.dirname, "../../../../..");
const handbookRoot = join(repoRoot, MBOOK_FR11_ENTERPRISE_HANDBOOK_ROOT);

function readDoc(relativePath: string): string {
  return readFileSync(join(handbookRoot, relativePath), "utf8");
}

function readRepoDoc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const manifest = normalizeApostrophes(
  readFileSync(join(handbookRoot, "handbook-manifest-fr.ts"), "utf8"),
);
const toc = normalizeApostrophes(readDoc("01-table-des-matieres.md"));
const introduction = normalizeApostrophes(readDoc("02-introduction-generale.md"));
const glossary = normalizeApostrophes(readDoc("03-glossaire.md"));
const workflowIndex = normalizeApostrophes(readDoc("04-index-workflows.md"));
const routeIndex = normalizeApostrophes(readDoc("05-index-routes.md"));
const acronymIndex = normalizeApostrophes(readDoc("06-index-acronymes.md"));
const screenshotIndex = normalizeApostrophes(readDoc("07-index-captures-ecran.md"));
const diagramIndex = normalizeApostrophes(readDoc("08-index-diagrammes.md"));
const governance = normalizeApostrophes(readDoc("09-gouvernance-documentaire.md"));
const exportChecklist = normalizeApostrophes(
  readDoc("exports/export-readiness-checklist.md"),
);

const VOLUME_SOURCE_FILES = [
  "handbook-fr-registration-intake.md",
  "handbook-fr-triage-clinical-intake.md",
  "handbook-fr-provider-workflow-documentation.md",
  "handbook-fr-nursing-discharge-execution.md",
  "handbook-fr-pharmacy-lab-radiology.md",
  "handbook-fr-disposition-admission-transfer-roi.md",
  "handbook-fr-administration-governance-operations.md",
  "handbook-fr-mobile-tablette-haiti.md",
  "handbook-fr-training-onboarding-certification.md",
] as const;

const APPENDIX_FILES = [
  "appendices/appendix-a-haiti-deployment.md",
  "appendices/appendix-b-mobile-safety.md",
  "appendices/appendix-c-quick-reference.md",
  "appendices/appendix-d-training-scenarios.md",
  "appendices/appendix-e-downtime-paper-workflow.md",
] as const;

/** Phase M-BOOK.FR.11 — Enterprise handbook assembly source-level validation. */
describe("French enterprise handbook assembly (M-BOOK.FR.11)", () => {
  it("master handbook directory exists with core assembly files", () => {
    expect(existsSync(handbookRoot)).toBe(true);
    expect(existsSync(join(handbookRoot, "00-page-garde.md"))).toBe(true);
    expect(existsSync(join(handbookRoot, "volumes"))).toBe(true);
    expect(existsSync(join(handbookRoot, "appendices"))).toBe(true);
    expect(existsSync(join(handbookRoot, "exports"))).toBe(true);
    expect(existsSync(join(handbookRoot, "assets-placeholders"))).toBe(true);
  });

  it("handbook manifest exists with structured volume metadata", () => {
    expect(manifest).toContain("MBOOK_FR11_ENTERPRISE_HANDBOOK_VERSION");
    expect(manifest).toContain('"M-BOOK.FR.11"');
    expect(manifest).toContain("ENTERPRISE_HANDBOOK_MANIFEST");
    expect(manifest).toContain("volumeNumber");
    expect(manifest).toContain("governanceSensitive");
    expect(manifest).toContain("haitiRelevance");
    expect(manifest).toContain("mobileRelevance");
    for (const file of VOLUME_SOURCE_FILES) {
      expect(manifest).toContain(file);
    }
    expect(manifest).toContain("french-terminology-canon.md");
    expect(manifest).toContain("french-workflow-inventory.md");
    expect(manifest).toContain("french-terminology-risks.md");
    expect(manifest).toContain("french-handbook-style-guide.md");
  });

  it("table of contents exists with enterprise structure", () => {
    expect(toc).toContain("M-BOOK.FR.11");
    expect(toc).toContain("00-page-garde.md");
    expect(toc).toContain("Partie II — Volumes opérationnels");
    expect(toc).toMatch(/\*\*1\*\*|Volumes 1|Volume 1/);
    expect(toc).toMatch(/\*\*9\*\*|Volume 9/);
    expect(toc).toContain("07-index-captures-ecran.md");
    expect(toc).toContain("08-index-diagrammes.md");
    expect(toc).toContain("appendix-a-haiti-deployment.md");
    expect(toc).toContain("handbook-fr-training-onboarding-certification.md");
  });

  it("glossary exists and aligns with terminology canon domains", () => {
    expect(glossary).toContain("french-terminology-canon.md");
    expect(glossary).toMatch(/Orientation.*Disposition|orientation.*disposition/i);
    expect(glossary).toMatch(/carry-forward|Carry-forward/i);
    expect(glossary).toMatch(/intelligence motif|Intelligence motif/i);
    expect(glossary).toMatch(/dépendant du cloud|Dépendant du cloud/i);
    expect(glossary).toMatch(/ROI|dévoilement de dossier/i);
  });

  it("workflow index exists with role and governance cross-index", () => {
    expect(workflowIndex).toContain("french-workflow-inventory.md");
    expect(workflowIndex).toMatch(/FRONT_DESK|Accueil/i);
    expect(workflowIndex).toMatch(/19T|carry-forward/i);
    expect(workflowIndex).toMatch(/19MDM|intelligence motif/i);
    expect(workflowIndex).toMatch(/gouvernance|Gouvernance/i);
    expect(workflowIndex).toContain("05-index-routes.md");
  });

  it("route index exists with operational routes and handbook volumes", () => {
    expect(routeIndex).toContain("/app/registration");
    expect(routeIndex).toContain("/app/emergency/trackboard");
    expect(routeIndex).toContain("/app/emergency/triage");
    expect(routeIndex).toContain("/app/provider");
    expect(routeIndex).toContain("/app/nursing");
    expect(routeIndex).toContain("/app/pharmacy-worklist");
    expect(routeIndex).toContain("/app/lab-worklist");
    expect(routeIndex).toContain("/app/rad-worklist");
    expect(routeIndex).toContain("/app/admin/roi");
    expect(routeIndex).toMatch(/Vol\.|Volume/i);
    expect(routeIndex).toMatch(/Mobile|mobile/i);
  });

  it("acronym index exists with clinical and governance acronyms", () => {
    expect(acronymIndex).toMatch(/\bED\b/);
    expect(acronymIndex).toMatch(/\bUC\b/);
    expect(acronymIndex).toMatch(/\bESI\b/);
    expect(acronymIndex).toMatch(/\bROI\b/);
    expect(acronymIndex).toMatch(/\bMDM\b/);
    expect(acronymIndex).toMatch(/\bHPI\b/);
    expect(acronymIndex).toMatch(/\bROS\b/);
    expect(acronymIndex).toMatch(/\bEMTALA\b/);
    expect(acronymIndex).toMatch(/\bLWBS\b/);
    expect(acronymIndex).toMatch(/\bLAMA\b/);
    expect(acronymIndex).toMatch(/\bPMH\b/);
    expect(acronymIndex).toMatch(/\bPSH\b/);
    expect(acronymIndex).toMatch(/19M|19T|19MDM/);
  });

  it("screenshot inventory exists with naming convention and volume coverage", () => {
    expect(screenshotIndex).toContain("medora-fr-v2-triage-tablette.png");
    expect(screenshotIndex).toMatch(/medora-fr-v5-pharmacie-file-mobile|pharmacy.*mobile/i);
    expect(screenshotIndex).toMatch(/PHI|patient fictif|fictif/i);
    expect(screenshotIndex).toMatch(/desktop|tablette|mobile/i);
    expect(screenshotIndex).toMatch(/carry-forward|carry forward/i);
    expect(screenshotIndex).toMatch(/ESI/i);
  });

  it("diagram inventory exists with required workflow diagrams", () => {
    expect(diagramIndex).toMatch(/registration|inscription/i);
    expect(diagramIndex).toMatch(/triage/i);
    expect(diagramIndex).toMatch(/provider|prestataire/i);
    expect(diagramIndex).toMatch(/nursing|infirmier/i);
    expect(diagramIndex).toMatch(/disposition|orientation/i);
    expect(diagramIndex).toMatch(/ROI|roi/i);
    expect(diagramIndex).toMatch(/carry-forward|carry forward/i);
    expect(diagramIndex).toMatch(/Haïti|haiti/i);
    expect(diagramIndex).toMatch(/connectivité|degraded|dégradée/i);
    expect(diagramIndex).toMatch(/formation|onboarding|certification/i);
  });

  it("document governance exists with versioning and review cadence", () => {
    expect(governance).toContain("M-BOOK.FR.11");
    expect(governance).toMatch(/versionnement|Versionnement/i);
    expect(governance).toMatch(/revue annuelle|Revue annuelle/i);
    expect(governance).toMatch(/traduction|Traduction/i);
    expect(governance).toMatch(/capture|screenshot/i);
    expect(governance).toMatch(/Haïti/i);
    expect(governance).toMatch(/dépendant du cloud/i);
  });

  it("appendix scaffolds exist with handbook volume references", () => {
    for (const appendix of APPENDIX_FILES) {
      const path = join(handbookRoot, appendix);
      expect(existsSync(path), appendix).toBe(true);
      const content = normalizeApostrophes(readFileSync(path, "utf8"));
      expect(content).toMatch(/M-BOOK\.FR\.11|Volume|handbook-fr-/i);
    }
  });

  it("export readiness checklist exists", () => {
    expect(exportChecklist).toContain("M-BOOK.FR.11");
    expect(exportChecklist).toMatch(/PDF|DOCX/i);
    expect(exportChecklist).toMatch(/PHI|patient fictif/i);
    expect(exportChecklist).toMatch(/terminolog/i);
    expect(exportChecklist).toMatch(/mobile|tablette/i);
  });

  it("asset placeholder folders are referenced with capture rules", () => {
    expect(existsSync(join(handbookRoot, "assets-placeholders/screenshots/README.md"))).toBe(true);
    expect(existsSync(join(handbookRoot, "assets-placeholders/diagrams/README.md"))).toBe(true);
    expect(existsSync(join(handbookRoot, "assets-placeholders/icons/README.md"))).toBe(true);
    const screenshotsReadme = readDoc("assets-placeholders/screenshots/README.md");
    expect(screenshotsReadme).toMatch(/patient fictif|fictif/i);
    expect(screenshotsReadme).toMatch(/medora-fr-v/);
    expect(screenshotIndex).toContain("assets-placeholders/screenshots");
    expect(diagramIndex).toContain("assets-placeholders/diagrams");
  });

  it("references all handbook volumes 1 through 9", () => {
    const assemblyCorpus = [toc, manifest, introduction, readDoc("volumes/README.md")].join("\n");
    for (const file of VOLUME_SOURCE_FILES) {
      expect(assemblyCorpus).toContain(file);
    }
    expect(toc).toMatch(/M-BOOK\.FR\.(2|3|4|5|6|7|8|9|10)/);
  });

  it("references terminology canon across assembly documents", () => {
    expect(introduction).toContain("french-terminology-canon.md");
    expect(glossary).toContain("french-terminology-canon.md");
    expect(governance).toContain("french-terminology-canon.md");
    expect(exportChecklist).toContain("french-terminology-canon.md");
    expect(existsSync(join(repoRoot, "docs/operations/french-terminology-canon.md"))).toBe(true);
  });

  it("includes Haiti deployment references", () => {
    expect(introduction).toMatch(/HAITI_MVP_PILOT|Haïti/i);
    expect(toc).toMatch(/HAITI_MVP_PILOT|Haïti/i);
    const appendixA = readDoc("appendices/appendix-a-haiti-deployment.md");
    expect(appendixA).toMatch(/HAITI_MVP_PILOT|Haïti/i);
    expect(manifest).toMatch(/haitiRelevance.*critical|critical.*haiti/i);
  });

  it("documents screenshot fake-patient policy", () => {
    expect(screenshotIndex).toMatch(/patient fictif obligatoire|Patient fictif obligatoire/i);
    expect(exportChecklist).toMatch(/patient fictif|Patient fictif/i);
    expect(introduction).not.toMatch(/données patient réelles/i);
  });

  it("preserves cloud-dependency disclaimer in introduction and governance", () => {
    expect(introduction).toMatch(/dépendant du cloud/i);
    expect(governance).toMatch(/dépendant du cloud/i);
    expect(introduction).toMatch(
      /ne remplace pas.*politiques institutionnelles|politiques institutionnelles.*jugement clinique/i,
    );
    expect(introduction).toMatch(/assiste.*workflows|workflows.*assiste/i);
    const appendixE = readDoc("appendices/appendix-e-downtime-paper-workflow.md");
    expect(appendixE).toMatch(/dépendant du cloud|cloud-dépendant/i);
  });

  it("general introduction covers operational philosophy pillars", () => {
    expect(introduction).toMatch(/19M|responsive/i);
    expect(introduction).toMatch(/19T|carry-forward/i);
    expect(introduction).toMatch(/19MDM|intelligence motif/i);
    expect(introduction).toMatch(/Orientation/i);
    expect(introduction).toMatch(/Disposition/i);
    expect(introduction).toMatch(/soins urgents|URGENT_CARE/i);
    expect(introduction).toMatch(/EMERGENCY|urgences/i);
  });
});
