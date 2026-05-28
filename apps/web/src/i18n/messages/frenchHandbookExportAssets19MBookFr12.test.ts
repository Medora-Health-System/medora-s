import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR12_EXPORT_VERSION = "M-BOOK.FR.12";
export const MBOOK_FR12_HANDBOOK_ROOT = "docs/operations/medora-enterprise-handbook-fr";

const repoRoot = join(import.meta.dirname, "../../../../..");
const handbookRoot = join(repoRoot, MBOOK_FR12_HANDBOOK_ROOT);

const DIAGRAM_BASENAMES = [
  "medora-fr-diag-registration-flux-principal",
  "medora-fr-diag-registration-types-consultation",
  "medora-fr-diag-triage-flux-principal",
  "medora-fr-diag-triage-reevaluation-esi",
  "medora-fr-diag-provider-doc-flux",
  "medora-fr-diag-complaint-intelligence",
  "medora-fr-diag-nursing-soins-flux",
  "medora-fr-diag-nursing-sortie-execution",
  "medora-fr-diag-disposition-cycle",
  "medora-fr-diag-orientation-disposition-distinction",
  "medora-fr-diag-admission-observation",
  "medora-fr-diag-roi-cycle-vie",
  "medora-fr-diag-carry-forward-cycle",
  "medora-fr-diag-connectivite-degradee",
  "medora-fr-diag-haiti-deploiement",
  "medora-fr-diag-haiti-super-users",
  "medora-fr-diag-formation-par-role",
  "medora-fr-diag-certification-niveaux",
  "medora-fr-diag-formation-calendrier-haiti",
  "medora-fr-diag-parcours-patient-ed-master",
] as const;

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

/** Phase M-BOOK.FR.12 — Export assets, diagrams, screenshots, PDF/DOCX pipeline validation. */
describe("French handbook export assets (M-BOOK.FR.12)", () => {
  it("export pipeline scripts exist in scripts/handbook", () => {
    const scriptsDir = join(repoRoot, "scripts/handbook");
    expect(existsSync(join(scriptsDir, "render-diagrams.mjs"))).toBe(true);
    expect(existsSync(join(scriptsDir, "render-screenshot-placeholders.mjs"))).toBe(true);
    expect(existsSync(join(scriptsDir, "assemble-handbook.mjs"))).toBe(true);
    expect(existsSync(join(scriptsDir, "export-handbook.mjs"))).toBe(true);
    expect(existsSync(join(scriptsDir, "diagram-definitions-fr.json"))).toBe(true);
  });

  it("screenshot manifest exists with P1 entries and fake-patient policy", () => {
    const manifest = normalizeApostrophes(
      readFileSync(join(handbookRoot, "exports/screenshot-manifest-fr.ts"), "utf8"),
    );
    expect(manifest).toContain("M-BOOK.FR.12");
    expect(manifest).toContain("HANDBOOK_SCREENSHOT_MANIFEST");
    expect(manifest).toContain("medora-fr-v2-triage-tablette.png");
    expect(manifest).toContain("placeholder: true");
    expect(manifest).toContain("phiReviewRequired");

    const runbook = normalizeApostrophes(
      readFileSync(join(handbookRoot, "exports/screenshot-capture-runbook.md"), "utf8"),
    );
    expect(runbook).toMatch(/patient fictif|Patient fictif/i);
    expect(runbook).toMatch(/PHI/i);
  });

  it("diagram SVG assets exist for all inventory entries", () => {
    const diagramsDir = join(handbookRoot, "assets/diagrams");
    expect(existsSync(diagramsDir)).toBe(true);
    for (const base of DIAGRAM_BASENAMES) {
      expect(existsSync(join(diagramsDir, `${base}.svg`)), base).toBe(true);
    }
    const master = readFileSync(
      join(diagramsDir, "medora-fr-diag-parcours-patient-ed-master.svg"),
      "utf8",
    );
    expect(master).toMatch(/Parcours patient|Accueil/i);
    expect(master).not.toMatch(/John Doe|Jane Doe/i);
  });

  it("P1 screenshot placeholder PNGs exist", () => {
    const manifest = readFileSync(join(handbookRoot, "exports/screenshot-manifest-fr.ts"), "utf8");
    const p1Files = [...manifest.matchAll(/filename:\s*"(medora-fr-v[^"]+\.png)"/g)]
      .map((m) => m[1])
      .filter((f) => manifest.includes(`filename: "${f}"`));

    const screenshotsDir = join(handbookRoot, "assets/screenshots");
    expect(existsSync(screenshotsDir)).toBe(true);

    const required = [
      "medora-fr-v2-triage-tablette.png",
      "medora-fr-v3-doc-desktop.png",
      "medora-fr-v8-nav-mobile.png",
      "medora-fr-vx-login-desktop.png",
    ];
    for (const file of required) {
      expect(existsSync(join(screenshotsDir, file)), file).toBe(true);
    }
    expect(p1Files.length).toBeGreaterThanOrEqual(25);
  });

  it("assembled handbook markdown exists with cloud disclaimer", () => {
    const assembled = join(
      handbookRoot,
      "exports/assembled/medora-enterprise-handbook-fr-assembled.md",
    );
    expect(existsSync(assembled)).toBe(true);
    const content = normalizeApostrophes(readFileSync(assembled, "utf8"));
    expect(content).toContain("M-BOOK.FR.12");
    expect(content).toMatch(/dépendant du cloud/i);
    expect(content).toMatch(/ne remplace pas.*politiques institutionnelles|politiques institutionnelles.*jugement clinique/i);
    expect(content).toContain("handbook-fr-registration-intake.md");
    expect(content).toContain("Volume 9");
  });

  it("export pipeline documentation exists", () => {
    const pipeline = normalizeApostrophes(
      readFileSync(join(handbookRoot, "exports/export-pipeline.md"), "utf8"),
    );
    expect(pipeline).toContain("M-BOOK.FR.12");
    expect(pipeline).toMatch(/PDF|DOCX/i);
    expect(pipeline).toMatch(/handbook:assemble|assemble/i);
    expect(pipeline).toMatch(/dépendant du cloud|cloud/i);
  });

  it("handbook manifest includes FR.12 export asset paths", () => {
    const manifest = readFileSync(join(handbookRoot, "handbook-manifest-fr.ts"), "utf8");
    expect(manifest).toContain("MBOOK_FR12_EXPORT_VERSION");
    expect(manifest).toContain("ENTERPRISE_HANDBOOK_EXPORT_ASSETS");
    expect(manifest).toContain("ENTERPRISE_HANDBOOK_DIAGRAM_BASENAMES");
    expect(manifest).toContain("assets/diagrams");
    expect(manifest).toContain("assets/screenshots");
  });

  it("diagram definitions align with 19T 19MDM and governance domains", () => {
    const defs = readFileSync(
      join(repoRoot, "scripts/handbook/diagram-definitions-fr.json"),
      "utf8",
    );
    expect(defs).toContain("medora-fr-diag-carry-forward-cycle");
    expect(defs).toContain("medora-fr-diag-complaint-intelligence");
    expect(defs).toContain("medora-fr-diag-roi-cycle-vie");
    expect(defs).toContain("medora-fr-diag-orientation-disposition-distinction");
    expect(defs).toMatch(/19T|Insertion manuelle|réconciliation/i);
  });

  it("package.json exposes handbook export scripts", () => {
    const pkg = readFileSync(join(repoRoot, "package.json"), "utf8");
    expect(pkg).toContain("handbook:diagrams");
    expect(pkg).toContain("handbook:assemble");
    expect(pkg).toContain("handbook:export");
    expect(pkg).toContain("handbook:assets");
  });

  it("screenshot placeholders are explicitly marked not live PHI captures", () => {
    const sample = join(handbookRoot, "assets/screenshots/medora-fr-v2-triage-tablette.png");
    expect(existsSync(sample)).toBe(true);
    expect(sample.endsWith(".png")).toBe(true);
    const runbook = readFileSync(
      join(handbookRoot, "exports/screenshot-capture-runbook.md"),
      "utf8",
    );
    expect(runbook).toMatch(/PLACEHOLDER|placeholder/i);
  });
});
