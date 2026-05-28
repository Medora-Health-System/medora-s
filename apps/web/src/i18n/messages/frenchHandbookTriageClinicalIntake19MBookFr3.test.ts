import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR3_HANDBOOK_VERSION = "M-BOOK.FR.3";
export const MBOOK_FR3_HANDBOOK_PATH = "docs/operations/handbook-fr-triage-clinical-intake.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR3_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.3 — Triage & clinical intake handbook source-level validation. */
describe("French handbook triage clinical intake (M-BOOK.FR.3)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 2 — Triage et intake clinique");
    expect(handbook).toContain("M-BOOK.FR.3");
  });

  it("documents triage workflow overview and sequence", () => {
    expect(handbook).toContain("# 3. Vue d'ensemble du workflow triage");
    expect(handbook).toContain("/app/emergency/triage");
    expect(handbook).toContain("/app/emergency/active/{id}");
    expect(handbook).toMatch(/Confirmation identité/i);
    expect(handbook).toMatch(/Signes vitaux/i);
  });

  it("includes chief complaint workflow section", () => {
    expect(handbook).toContain("# 4. Workflow motif de consultation");
    expect(handbook).toMatch(/Motif de consultation ≠ diagnostic final/i);
    expect(handbook).toContain("Douleur thoracique");
    expect(handbook).toContain("Dyspnée");
  });

  it("includes ESI operational workflow section", () => {
    expect(handbook).toContain("# 5. Workflow ESI");
    expect(handbook).toMatch(/Indice ESI/i);
    expect(handbook).toMatch(/priorisation/i);
    expect(handbook).toMatch(/ne remplace pas/i);
  });

  it("includes carry-forward history section with review statuses", () => {
    expect(handbook).toContain("# 7. Reprise d'antécédents (carry-forward)");
    expect(handbook).toMatch(/19T\.1/i);
    expect(handbook).toMatch(/pending_review|En attente de revue/i);
    expect(handbook).toMatch(/reviewed|Revu/i);
    expect(handbook).toMatch(/modified|Modifié/i);
    expect(handbook).toMatch(/removed|Retiré/i);
    expect(handbook).toMatch(/NOT.*auto|ne sont pas.*auto|pas.*auto-confirm/i);
  });

  it("includes reassessment workflow section", () => {
    expect(handbook).toContain("# 9. Workflow de réévaluation");
    expect(handbook).toMatch(/surveillance clinique continue/i);
    expect(handbook).toMatch(/Réévaluation infirmière/i);
  });

  it("includes allergy and medication reconciliation section", () => {
    expect(handbook).toContain("# 6. Allergies et conciliation médicamenteuse");
    expect(handbook).toMatch(/NKDA|aucune allergie médicamenteuse connue/i);
    expect(handbook).toMatch(/médicaments domicile/i);
    expect(handbook).toMatch(/vérifier.*pas supposer|ne pas supposer/i);
  });

  it("includes mobile and tablet triage guidance aligned with 19M", () => {
    expect(handbook).toContain("# 10. Mobile et tablette — triage");
    expect(handbook).toMatch(/19M/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/Haïti|connectivité/i);
  });

  it("includes operational safety section", () => {
    expect(handbook).toContain("# 11. Sécurité opérationnelle");
    expect(handbook).toMatch(/Mauvais patient/i);
    expect(handbook).toMatch(/Doublons/i);
    expect(handbook).toMatch(/détérioration/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 12. Résumé opérationnel rapide");
    expect(handbook).toMatch(/Checklist intake triage/i);
    expect(handbook).toMatch(/Checklist.*carry-forward/i);
    expect(handbook).toMatch(/Checklist réévaluation/i);
    expect(handbook).toMatch(/Checklist escalade/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Triage Medora]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Reprise d'antécédents]");
    expect(handbook).toContain("[DIAGRAMME — Workflow triage]");
    expect(handbook).toContain("[DIAGRAMME — Réévaluation]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Tableau des urgences]");
  });

  it("includes handbook governance section and terminology canon reference", () => {
    expect(handbook).toContain("# 13. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-registration-intake.md");
  });

  it("states triage supports prioritization but does not replace provider evaluation", () => {
    expect(handbook).toMatch(/Le triage soutient la priorisation/i);
    expect(handbook).toMatch(/ne remplace pas l'évaluation/i);
  });
});
