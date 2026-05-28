import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR5_HANDBOOK_VERSION = "M-BOOK.FR.5";
export const MBOOK_FR5_HANDBOOK_PATH = "docs/operations/handbook-fr-nursing-discharge-execution.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR5_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.5 — Nursing workflow & discharge execution handbook source-level validation. */
describe("French handbook nursing discharge execution (M-BOOK.FR.5)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 4 — Workflow infirmier et exécution de sortie");
    expect(handbook).toContain("M-BOOK.FR.5");
  });

  it("includes nursing workflow overview section", () => {
    expect(handbook).toContain("# 2. Vue d'ensemble du workflow infirmier");
    expect(handbook).toContain("/app/nursing");
    expect(handbook).toContain("/app/emergency/active/{id}");
    expect(handbook).toMatch(/Exécution sortie/i);
    expect(handbook).toMatch(/Réévaluation/i);
  });

  it("includes reassessment workflow section", () => {
    expect(handbook).toContain("# 4. Workflow réévaluation");
    expect(handbook).toMatch(/évaluation continue du risque/i);
    expect(handbook).toMatch(/Détérioration/i);
    expect(handbook).toMatch(/signaler au prestataire selon le protocole de l'établissement/i);
  });

  it("includes order and result follow-up section", () => {
    expect(handbook).toContain("# 5. Suivi des ordres et résultats");
    expect(handbook).toMatch(/Ordres en attente/i);
    expect(handbook).toMatch(/Ne pas interpréter/i);
    expect(handbook).toMatch(/signaler au prestataire selon le protocole de l'établissement/i);
  });

  it("includes medication administration workflow section", () => {
    expect(handbook).toContain("# 6. Administration de médicament");
    expect(handbook).toMatch(/MAR/i);
    expect(handbook).toMatch(/Refus patient/i);
    expect(handbook).toMatch(/ne remplace pas le MAR légal/i);
  });

  it("includes discharge execution workflow section", () => {
    expect(handbook).toContain("# 7. Exécution de sortie infirmière");
    expect(handbook).toMatch(/NursingDischargeExecutionSection/i);
    expect(handbook).toMatch(/Vérifier.*orientation prestataire|orientation prestataire enregistrée/i);
    expect(handbook).toMatch(/Consignes de retour/i);
    expect(handbook).toMatch(/Exécution sortie infirmière complétée/i);
  });

  it("includes patient education section", () => {
    expect(handbook).toContain("# 8. Éducation patient et enseignement");
    expect(handbook).toMatch(/Consignes de retour/i);
    expect(handbook).toMatch(/Barrière linguistique/i);
    expect(handbook).toMatch(/non-compréhension|Refus/i);
  });

  it("includes admission transfer and observation nursing section", () => {
    expect(handbook).toContain("# 9. Admission, transfert et observation — workflow infirmier");
    expect(handbook).toMatch(/Handoff/i);
    expect(handbook).toMatch(/observation/i);
    expect(handbook).toMatch(/Transfert/i);
  });

  it("includes longitudinal history and carry-forward section", () => {
    expect(handbook).toContain("# 10. Historique longitudinal et carry-forward");
    expect(handbook).toMatch(/19T\.3/i);
    expect(handbook).toMatch(/Allergies/i);
    expect(handbook).toMatch(/Ne pas se fier au profil seul|revérifier/i);
  });

  it("includes mobile and tablet nursing workflow aligned with 19M", () => {
    expect(handbook).toContain("# 11. Mobile et tablette — infirmier");
    expect(handbook).toMatch(/19M/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/Haïti/i);
  });

  it("includes nursing operational safety section", () => {
    expect(handbook).toContain("# 12. Sécurité opérationnelle infirmière");
    expect(handbook).toMatch(/Mauvais patient/i);
    expect(handbook).toMatch(/Sortie sans disposition prestataire/i);
    expect(handbook).toMatch(/Réévaluation manquée/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 13. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist intake infirmier/i);
    expect(handbook).toMatch(/Checklist réévaluation/i);
    expect(handbook).toMatch(/Checklist administration médicament/i);
    expect(handbook).toMatch(/Checklist exécution sortie/i);
    expect(handbook).toMatch(/Checklist anti mauvais patient/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Workflow infirmier]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Réévaluation infirmière]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Administration médicament]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Exécution de sortie]");
    expect(handbook).toContain("[DIAGRAMME — Workflow sortie infirmière]");
    expect(handbook).toContain("[DIAGRAMME — Admission / transfert / observation infirmière]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 14. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuellement/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-registration-intake.md");
    expect(handbook).toContain("handbook-fr-triage-clinical-intake.md");
    expect(handbook).toContain("handbook-fr-provider-workflow-documentation.md");
  });

  it("distinguishes provider discharge documentation from nursing discharge execution", () => {
    expect(handbook).toMatch(/Documentation de sortie prestataire/i);
    expect(handbook).toMatch(/Exécution de sortie infirmière/i);
    expect(handbook).toMatch(/ne crée pas la décision clinique de sortie/i);
    expect(handbook).toMatch(/confirme et exécute le processus opérationnel de sortie/i);
    expect(handbook).toMatch(/Disposition \(urgences\)/i);
  });

  it("states Medora supports nursing workflow but does not replace clinical judgment", () => {
    expect(handbook).toMatch(/Medora-S soutient le workflow infirmier/i);
    expect(handbook).toMatch(/ne remplace pas le jugement clinique infirmier/i);
  });
});
