import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR2_HANDBOOK_VERSION = "M-BOOK.FR.2";
export const MBOOK_FR2_HANDBOOK_PATH = "docs/operations/handbook-fr-registration-intake.md";

export const MBOOK_FR2_REQUIRED_SECTIONS = [
  "# 1. Introduction",
  "# 2. Définitions des rôles",
  "# 3. Workflows d'arrivée patient",
  "# 4. Workflow hybride UC → urgence (conversion)",
  "# 5. Introduction au tableau des urgences",
  "# 6. Sécurité identité patient",
  "# 7. Mobile et tablette",
  "# 8. Sécurité opérationnelle et escalade",
  "# 9. Résumé opérationnel rapide",
  "# 10. Gouvernance du manuel",
] as const;

export const MBOOK_FR2_REGISTRATION_WORKFLOW_HEADINGS = [
  "## 3.1 Nouvelle inscription patient",
  "## 3.2 Recherche patient existant",
  "## 3.3 Prévention des doublons",
  "## 3.4 Patient walk-in — urgences (ED)",
  "## 3.5 Patient soins urgents (UC)",
] as const;

export const MBOOK_FR2_PLACEHOLDER_MARKERS = [
  "[CAPTURE D'ÉCRAN",
  "[DIAGRAMME",
] as const;

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR2_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.2 — Registration / intake handbook source-level validation. */
describe("French handbook registration intake (M-BOOK.FR.2)", () => {

  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 1 — Accueil, inscription et arrivée patient");
    expect(handbook).toContain("M-BOOK.FR.2");
  });

  it("documents UC→ER conversion workflow section with staff-driven rule", () => {
    expect(handbook).toContain("# 4. Workflow hybride UC → urgence (conversion)");
    expect(handbook).toMatch(/Conversion initiée par le staff clinique/i);
    expect(handbook).toMatch(/jamais par le motif saisi seul/i);
    expect(handbook).toContain("## 4.2 Workflow cible");
    expect(handbook).toContain("## 4.1 État actuel du produit");
  });

  it("documents registration and arrival workflows", () => {
    for (const heading of MBOOK_FR2_REGISTRATION_WORKFLOW_HEADINGS) {
      expect(handbook, `missing ${heading}`).toContain(heading);
    }
    expect(handbook).toContain("## 3.8 Escalade patient critique");
    expect(handbook).toContain("## 3.10 Patient de retour");
  });

  it("includes trackboard operational introduction", () => {
    expect(handbook).toContain("# 5. Introduction au tableau des urgences");
    expect(handbook).toContain("/app/emergency/trackboard");
    expect(handbook).toContain("Tableau des urgences");
  });

  it("includes dedicated patient identity safety section", () => {
    expect(handbook).toContain("# 6. Sécurité identité patient");
    expect(handbook).toContain("## 6.1 Prévention mauvais patient");
    expect(handbook).toContain("## 6.2 Doublons");
    expect(handbook).toMatch(/vérifier identité/i);
  });

  it("includes mobile and tablet workflow guidance aligned with 19M", () => {
    expect(handbook).toContain("# 7. Mobile et tablette");
    expect(handbook).toMatch(/19M/i);
    expect(handbook).toMatch(/Connectivité Haïti/i);
  });

  it("references terminology canon", () => {
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("Consultation d'urgence");
    expect(handbook).toMatch(/Orientation/i);
  });

  it("includes operational safety and escalation section", () => {
    expect(handbook).toContain("# 8. Sécurité opérationnelle et escalade");
    expect(handbook).toContain("## 8.1 Quand appeler le superviseur");
    expect(handbook).toMatch(/downtime|panne/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN");
    expect(handbook).toContain("[DIAGRAMME");
    expect(handbook).toContain("[DIAGRAMME — Conversion consultation UC → urgence]");
  });

  it("includes handbook governance section", () => {
    expect(handbook).toContain("# 10. Gouvernance du manuel");
    expect(handbook).toContain("## 10.4 Formation");
    expect(handbook).toMatch(/révision annuelle/i);
    expect(handbook).toContain("french-terminology-canon.md");
  });

  it("covers all major numbered handbook sections", () => {
    for (const section of MBOOK_FR2_REQUIRED_SECTIONS) {
      expect(handbook, `missing section ${section}`).toContain(section);
    }
  });

  it("states Medora assists but staff remain responsible for accuracy", () => {
    expect(handbook).toMatch(/Medora-S assiste les workflows/i);
    expect(handbook).toMatch(/personnel reste responsable/i);
  });
});
