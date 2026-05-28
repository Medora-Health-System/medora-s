import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPLAINT_INTELLIGENCE_SUBGROUP_CANON } from "./frenchTerminologyCanonManifest";

export const MBOOK_FR4_HANDBOOK_VERSION = "M-BOOK.FR.4";
export const MBOOK_FR4_HANDBOOK_PATH = "docs/operations/handbook-fr-provider-workflow-documentation.md";

export const MBOOK_FR4_COMPLAINT_SUBGROUP_LABELS_FR = Object.values(COMPLAINT_INTELLIGENCE_SUBGROUP_CANON);

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR4_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.4 — Provider workflow & documentation handbook source-level validation. */
describe("French handbook provider workflow documentation (M-BOOK.FR.4)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 3 — Workflow prestataire et documentation clinique");
    expect(handbook).toContain("M-BOOK.FR.4");
  });

  it("includes provider workflow overview section", () => {
    expect(handbook).toContain("# 2. Vue d'ensemble du workflow prestataire");
    expect(handbook).toContain("/app/emergency/active/{id}");
    expect(handbook).toContain("/app/provider");
    expect(handbook).toMatch(/Assignation/i);
    expect(handbook).toMatch(/Signature/i);
  });

  it("includes clinical documentation workflow section", () => {
    expect(handbook).toContain("# 3. Workflow documentation clinique");
    expect(handbook).toMatch(/HPI/i);
    expect(handbook).toMatch(/ROS/i);
    expect(handbook).toMatch(/examen physique/i);
    expect(handbook).toMatch(/Consultations évoquées/i);
  });

  it("includes MDM workflow section with provider responsibility", () => {
    expect(handbook).toContain("# 4. Workflow MDM");
    expect(handbook).toMatch(/multi-sélection|multi-select/i);
    expect(handbook).toMatch(/optionnel/i);
    expect(handbook).toMatch(/prestataire reste responsable/i);
    expect(handbook).toMatch(/clic uniquement|click-to-insert|Insertion au clic/i);
  });

  it("includes complaint-intelligence section with all eight subgroups", () => {
    expect(handbook).toContain("# 5. Workflow intelligence motif (19MDM)");
    expect(handbook).toMatch(/Insertion au clic uniquement/i);
    expect(handbook).toMatch(/jamais d'application automatique|jamais.*automatique/i);
    for (const label of MBOOK_FR4_COMPLAINT_SUBGROUP_LABELS_FR) {
      expect(handbook, `missing subgroup ${label}`).toContain(label);
    }
    expect(handbook).toMatch(/Gastro-intestinal \/ abdominal/i);
    expect(handbook).toMatch(/Neurologie avancée/i);
  });

  it("documents complaint-intelligence safety and forbidden certainty language", () => {
    expect(handbook).toMatch(/Limitations et gouvernance/i);
    expect(handbook).toMatch(/exclu|ruled out/i);
    expect(handbook).toMatch(/normal|négatif/i);
    expect(handbook).toMatch(/sortie sûre|aptitude à conduire/i);
  });

  it("includes reassessment and clinical evolution section", () => {
    expect(handbook).toContain("# 6. Réévaluation et évolution clinique");
    expect(handbook).toMatch(/évaluation continue du risque/i);
    expect(handbook).toMatch(/Détérioration/i);
  });

  it("includes disposition and discharge documentation section", () => {
    expect(handbook).toContain("# 8. Orientation et documentation de sortie");
    expect(handbook).toMatch(/Disposition \(urgences\)/i);
    expect(handbook).toMatch(/Enregistrer la décision d'orientation/i);
    expect(handbook).toMatch(/Consignes de retour/i);
    expect(handbook).toMatch(/incertitude/i);
  });

  it("includes longitudinal history and carry-forward section", () => {
    expect(handbook).toContain("# 9. Historique longitudinal et carry-forward");
    expect(handbook).toMatch(/19T\.3/i);
    expect(handbook).toMatch(/Allergies/i);
    expect(handbook).toMatch(/ne pas se fier au profil seul|revérifier/i);
  });

  it("includes mobile and tablet provider workflow aligned with 19M", () => {
    expect(handbook).toContain("# 10. Mobile et tablette — prestataire");
    expect(handbook).toMatch(/19M\.5/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/Bureau/i);
    expect(handbook).toMatch(/Haïti/i);
  });

  it("includes provider operational safety section", () => {
    expect(handbook).toContain("# 11. Sécurité opérationnelle prestataire");
    expect(handbook).toMatch(/Mauvais patient/i);
    expect(handbook).toMatch(/Surconfiance modèles/i);
    expect(handbook).toMatch(/Résultats en attente/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 12. Résumé opérationnel rapide");
    expect(handbook).toMatch(/Checklist MDM/i);
    expect(handbook).toMatch(/Checklist sortie/i);
    expect(handbook).toMatch(/Checklist.*intelligence motif/i);
    expect(handbook).toMatch(/Checklist anti mauvais patient/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Documentation prestataire]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Templates MDM]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Intelligence motif]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Réévaluation]");
    expect(handbook).toContain("[DIAGRAMME — Workflow prestataire]");
    expect(handbook).toContain("[DIAGRAMME — Admission / observation / congé]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 13. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuellement/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-registration-intake.md");
    expect(handbook).toContain("handbook-fr-triage-clinical-intake.md");
  });

  it("states Medora assists but does not replace provider clinical judgment", () => {
    expect(handbook).toMatch(/Medora-S assiste le workflow/i);
    expect(handbook).toMatch(/ne remplace pas le jugement clinique/i);
  });
});
