import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR7_HANDBOOK_VERSION = "M-BOOK.FR.7";
export const MBOOK_FR7_HANDBOOK_PATH = "docs/operations/handbook-fr-disposition-admission-transfer-roi.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR7_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.7 — Disposition, admission, transfer & ROI handbook source-level validation. */
describe("French handbook disposition admission transfer roi (M-BOOK.FR.7)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 6 — Orientation, admission, transfert et dévoilement de dossier");
    expect(handbook).toContain("M-BOOK.FR.7");
  });

  it("includes discharge workflow section with provider vs nursing distinction", () => {
    expect(handbook).toContain("# 2. Workflow congé et sortie");
    expect(handbook).toMatch(/Documentation de sortie prestataire/i);
    expect(handbook).toMatch(/Exécution sortie infirmière/i);
    expect(handbook).toMatch(/ne crée pas la décision clinique de sortie/i);
    expect(handbook).toMatch(/Enregistrer la décision d'orientation/i);
    expect(handbook).toMatch(/Consignes de retour/i);
  });

  it("includes observation workflow section", () => {
    expect(handbook).toContain("# 3. Workflow observation");
    expect(handbook).toMatch(/Observation ≠ admission automatique|Observation ≠ admission/i);
    expect(handbook).toContain("/app/hospitalisation");
    expect(handbook).toMatch(/séjour prolongé|boarding/i);
  });

  it("includes admission workflow section", () => {
    expect(handbook).toContain("# 4. Workflow admission");
    expect(handbook).toMatch(/Handoff infirmier/i);
    expect(handbook).toMatch(/placement|lit/i);
    expect(handbook).toMatch(/justification/i);
  });

  it("includes transfer workflow section", () => {
    expect(handbook).toContain("# 5. Workflow transfert");
    expect(handbook).toMatch(/ne fournit pas de conseil juridique/i);
    expect(handbook).toMatch(/EMTALA/i);
    expect(handbook).toMatch(/transport/i);
  });

  it("includes ROI workflow section with institutional policy limitation", () => {
    expect(handbook).toContain("# 6. Dévoilement de dossier (ROI)");
    expect(handbook).toContain("/app/admin/roi");
    expect(handbook).toMatch(/Dévoilement de dossier \(ROI\)/i);
    expect(handbook).toMatch(/politique institutionnelle et juridique de l'établissement/i);
    expect(handbook).toMatch(/instantané|instantane/i);
  });

  it("includes chart export awareness section without implementation internals", () => {
    expect(handbook).toContain("# 7. Export dossier et instantané");
    expect(handbook).toMatch(/instantané figé|figé/i);
    expect(handbook).toMatch(/clôturée|cloturée/i);
    expect(handbook).toMatch(/JSON|HTML/i);
    expect(handbook).toMatch(/Pas de détail sur|empreintes cryptographiques|schémas internes/i);
  });

  it("includes operational safety section for disposition and ROI", () => {
    expect(handbook).toContain("# 8. Sécurité opérationnelle disposition et ROI");
    expect(handbook).toMatch(/Sortie avant réévaluation/i);
    expect(handbook).toMatch(/Dévoilement mauvais patient/i);
    expect(handbook).toMatch(/minimum nécessaire/i);
  });

  it("includes mobile and tablet disposition workflow aligned with 19M.6", () => {
    expect(handbook).toContain("# 9. Mobile et tablette — disposition");
    expect(handbook).toMatch(/19M\.6/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/bureau préféré.*ROI|ROI.*bureau/i);
    expect(handbook).toMatch(/Haïti/i);
  });

  it("includes communication and handoff section", () => {
    expect(handbook).toContain("# 10. Communication opérationnelle et handoffs");
    expect(handbook).toMatch(/Handoff admission/i);
    expect(handbook).toMatch(/Handoff transfert/i);
    expect(handbook).toMatch(/Prestataire.*infirmier|infirmier.*prestataire/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 11. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist sortie/i);
    expect(handbook).toMatch(/Checklist observation/i);
    expect(handbook).toMatch(/Checklist admission/i);
    expect(handbook).toMatch(/Checklist transfert/i);
    expect(handbook).toMatch(/Checklist demande ROI/i);
    expect(handbook).toMatch(/Checklist anti mauvais patient/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Workflow disposition]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Exécution de sortie]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Observation]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Admission]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — ROI]");
    expect(handbook).toContain("[DIAGRAMME — Workflow congé]");
    expect(handbook).toContain("[DIAGRAMME — Workflow admission/transfert]");
    expect(handbook).toContain("[DIAGRAMME — Workflow ROI]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 12. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuellement/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-provider-workflow-documentation.md");
    expect(handbook).toContain("handbook-fr-nursing-discharge-execution.md");
    expect(handbook).toMatch(/Phase 5F|5F/i);
    expect(handbook).toMatch(/Phase 5G|5G/i);
  });

  it("documents orientation vs disposition terminology distinction", () => {
    expect(handbook).toMatch(/Distinction terminologique canonique/i);
    expect(handbook).toMatch(/Orientation.*décision clinique/i);
    expect(handbook).toMatch(/Disposition.*panneau|panneau.*Disposition/i);
    expect(handbook).toMatch(/Orientation = décision clinique/i);
  });

  it("states Medora supports workflow but does not replace provider judgment and institutional policy", () => {
    expect(handbook).toMatch(/Medora-S soutient le workflow/i);
    expect(handbook).toMatch(/ne remplace pas le jugement du prestataire/i);
    expect(handbook).toMatch(/politique d'admission institutionnelle/i);
  });
});
