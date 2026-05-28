import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR10_HANDBOOK_VERSION = "M-BOOK.FR.10";
export const MBOOK_FR10_HANDBOOK_PATH = "docs/operations/handbook-fr-training-onboarding-certification.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR10_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.10 — Training, onboarding & certification handbook source-level validation. */
describe("French handbook training onboarding certification (M-BOOK.FR.10)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 9 — Formation, intégration et certification opérationnelle");
    expect(handbook).toContain("M-BOOK.FR.10");
  });

  it("includes training introduction and institutional responsibility", () => {
    expect(handbook).toContain("# 1. Introduction à la formation Medora-S");
    expect(handbook).toMatch(/certification opérationnelle Medora/i);
    expect(handbook).toMatch(/direction et les responsables formation restent responsables/i);
    expect(handbook).toMatch(/n'accorde pas.*droits cliniques|Ne remplace pas.*licence/i);
  });

  it("maps handbook volumes to roles in curriculum section", () => {
    expect(handbook).toContain("# 2. Cartographie des volumes par rôle");
    expect(handbook).toContain("handbook-fr-registration-intake.md");
    expect(handbook).toContain("handbook-fr-triage-clinical-intake.md");
    expect(handbook).toContain("handbook-fr-provider-workflow-documentation.md");
    expect(handbook).toContain("handbook-fr-nursing-discharge-execution.md");
    expect(handbook).toMatch(/M-BOOK\.FR\.(2|3|4|5|6|7|8|9|10)/);
  });

  it("includes onboarding workflow section", () => {
    expect(handbook).toContain("# 3. Intégration (onboarding) — workflow standard");
    expect(handbook).toMatch(/Jour 1/i);
    expect(handbook).toMatch(/Offboarding|désactivation compte/i);
    expect(handbook).toMatch(/super-utilisateur/i);
  });

  it("includes operational certification levels section", () => {
    expect(handbook).toContain("# 4. Niveaux de certification opérationnelle");
    expect(handbook).toMatch(/Niveau 1/i);
    expect(handbook).toMatch(/Niveau 2/i);
    expect(handbook).toMatch(/Super-utilisateur|Niveau 3/i);
    expect(handbook).toMatch(/Registre d'attestation/i);
  });

  it("includes trainer and facilitator guide section", () => {
    expect(handbook).toContain("# 5. Guide du formateur / facilitateur");
    expect(handbook).toMatch(/Démonstration/i);
    expect(handbook).toMatch(/Scénario/i);
    expect(handbook).toMatch(/orientation vs disposition/i);
  });

  it("includes Haiti pilot training program section", () => {
    expect(handbook).toContain("# 6. Programme pilote Haïti");
    expect(handbook).toMatch(/HAITI_MVP_PILOT/i);
    expect(handbook).toMatch(/protocole papier/i);
    expect(handbook).toMatch(/19M\.8/i);
  });

  it("includes super-user program section", () => {
    expect(handbook).toContain("# 7. Programme super-utilisateur");
    expect(handbook).toMatch(/Volumes.*1–8|1-8/i);
    expect(handbook).toMatch(/pending sync/i);
  });

  it("includes practical exercises and scenarios section", () => {
    expect(handbook).toContain("# 8. Exercices pratiques et scénarios");
    expect(handbook).toMatch(/Mauvais patient/i);
    expect(handbook).toMatch(/Exécution sortie/i);
    expect(handbook).toMatch(/intelligence motif/i);
  });

  it("includes recertification and annual review section", () => {
    expect(handbook).toContain("# 9. Recertification et revue annuelle");
    expect(handbook).toMatch(/Annuelle|annuelle/i);
    expect(handbook).toMatch(/recertification/i);
  });

  it("includes competency assessment section", () => {
    expect(handbook).toContain("# 11. Évaluation des compétences");
    expect(handbook).toMatch(/Observation directe/i);
    expect(handbook).toMatch(/compétence opérationnelle/i);
  });

  it("includes cross-cutting training and cloud dependency awareness", () => {
    expect(handbook).toContain("# 10. Formation transversale obligatoire");
    expect(handbook).toMatch(/dépendant du cloud/i);
    expect(handbook).toMatch(/comptes nominatifs|comptes partagés/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 12. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist onboarding nouvel utilisateur/i);
    expect(handbook).toMatch(/Checklist certification niveau 1/i);
    expect(handbook).toMatch(/Checklist formation Haïti go-live/i);
    expect(handbook).toMatch(/Checklist recertification annuelle/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[DIAGRAMME — Parcours formation par rôle]");
    expect(handbook).toContain("[DIAGRAMME — Niveaux certification]");
    expect(handbook).toContain("[DIAGRAMME — Calendrier Haïti 4 semaines]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Parcours intégration]");
  });

  it("includes handbook governance and volume index", () => {
    expect(handbook).toContain("# 13. Gouvernance du chapitre");
    expect(handbook).toMatch(/M-BOOK\.FR\.10/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toMatch(/Index des volumes/i);
  });

  it("distinguishes operational certification from professional licensure", () => {
    expect(handbook).toMatch(/licence professionnelle/i);
    expect(handbook).toMatch(/certification ESI/i);
    expect(handbook).toMatch(/attestation interne/i);
  });
});
