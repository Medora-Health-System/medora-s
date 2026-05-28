import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR6_HANDBOOK_VERSION = "M-BOOK.FR.6";
export const MBOOK_FR6_HANDBOOK_PATH = "docs/operations/handbook-fr-pharmacy-lab-radiology.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR6_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.6 — Pharmacy, lab & radiology operations handbook source-level validation. */
describe("French handbook pharmacy lab radiology (M-BOOK.FR.6)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 5 — Pharmacie, laboratoire et imagerie");
    expect(handbook).toContain("M-BOOK.FR.6");
  });

  it("includes pharmacy workflow overview section", () => {
    expect(handbook).toContain("# 2. Workflow pharmacie — vue d'ensemble");
    expect(handbook).toContain("/app/pharmacy-worklist");
    expect(handbook).toMatch(/File pharmacie|file pharmacie/i);
    expect(handbook).toMatch(/système pharmacie hospitalier complet/i);
    expect(handbook).toMatch(/n'est.*pas.*système pharmacie/i);
    expect(handbook).toMatch(/dispensation/i);
  });

  it("includes laboratory workflow overview section", () => {
    expect(handbook).toContain("# 3. Workflow laboratoire — vue d'ensemble");
    expect(handbook).toContain("/app/lab-worklist");
    expect(handbook).toMatch(/prélèvement/i);
    expect(handbook).toMatch(/saisie résultat/i);
  });

  it("includes radiology workflow overview section", () => {
    expect(handbook).toContain("# 4. Workflow imagerie — vue d'ensemble");
    expect(handbook).toContain("/app/rad-worklist");
    expect(handbook).toMatch(/transport/i);
    expect(handbook).toMatch(/compte-rendu/i);
  });

  it("includes order and result lifecycle section", () => {
    expect(handbook).toContain("# 5. Cycle de vie ordre / résultat");
    expect(handbook).toMatch(/Accusé de réception/i);
    expect(handbook).toMatch(/En cours/i);
    expect(handbook).toMatch(/Complété/i);
    expect(handbook).toMatch(/Résultat disponible/i);
    expect(handbook).toMatch(/Synchronisation en attente/i);
  });

  it("includes critical-result escalation awareness section", () => {
    expect(handbook).toContain("# 6. Résultats critiques et sensibilisation à l'escalade");
    expect(handbook).toMatch(/selon la politique de l'établissement/i);
    expect(handbook).toMatch(/ne définit pas.*politique|pas de politique institutionnelle/i);
  });

  it("includes ancillary dispensing and result safety section", () => {
    expect(handbook).toContain("# 7. Sécurité dispensation et résultats");
    expect(handbook).toMatch(/Dispensation mauvais patient/i);
    expect(handbook).toMatch(/Échantillon mauvais patient/i);
    expect(handbook).toMatch(/Examen mauvais patient/i);
  });

  it("includes mobile and tablet ancillary workflow aligned with 19M.7", () => {
    expect(handbook).toContain("# 8. Mobile et tablette — workflows auxiliaires");
    expect(handbook).toMatch(/19M\.7/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/Haïti/i);
  });

  it("includes operational communication workflow section", () => {
    expect(handbook).toContain("# 9. Communication opérationnelle");
    expect(handbook).toMatch(/prestataire/i);
    expect(handbook).toMatch(/infirmier/i);
    expect(handbook).toMatch(/relevé|Handoff/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 10. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist file pharmacie/i);
    expect(handbook).toMatch(/Checklist workflow laboratoire/i);
    expect(handbook).toMatch(/Checklist workflow imagerie/i);
    expect(handbook).toMatch(/Checklist escalade résultat critique/i);
    expect(handbook).toMatch(/Checklist anti mauvais patient/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — File pharmacie]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — File laboratoire]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — File imagerie]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Ordres en attente]");
    expect(handbook).toContain("[DIAGRAMME — Workflow pharmacie]");
    expect(handbook).toContain("[DIAGRAMME — Workflow laboratoire]");
    expect(handbook).toContain("[DIAGRAMME — Workflow imagerie]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 11. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuellement/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-provider-workflow-documentation.md");
    expect(handbook).toContain("handbook-fr-nursing-discharge-execution.md");
  });

  it("documents queue and worklist terminology", () => {
    expect(handbook).toMatch(/File de travail|file de travail/i);
    expect(handbook).toMatch(/nav\.pharmacyQueue|nav\.labWorklist|nav\.radWorklist/i);
    expect(handbook).toMatch(/MedoraCard/i);
  });

  it("states clinical interpretation remains provider responsibility", () => {
    expect(handbook).toMatch(/L'interprétation clinique et la décision thérapeutique finale/i);
    expect(handbook).toMatch(/responsabilités du prestataire clinique/i);
    expect(handbook).toMatch(/selon la politique de l'établissement/i);
  });

  it("states Medora supports coordination but does not replace institutional policy", () => {
    expect(handbook).toMatch(/Medora-S soutient la coordination opérationnelle/i);
    expect(handbook).toMatch(/ne remplace pas les politiques institutionnelles/i);
  });
});
