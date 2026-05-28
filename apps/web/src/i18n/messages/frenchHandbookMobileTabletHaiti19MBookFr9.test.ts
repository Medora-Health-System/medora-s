import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR9_HANDBOOK_VERSION = "M-BOOK.FR.9";
export const MBOOK_FR9_HANDBOOK_PATH = "docs/operations/handbook-fr-mobile-tablette-haiti.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR9_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");

}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.9 — Mobile, tablet & Haiti deployment operations handbook source-level validation. */
describe("French handbook mobile tablet Haiti (M-BOOK.FR.9)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 8 — Mobile, tablette et opérations de déploiement Haïti");
    expect(handbook).toContain("M-BOOK.FR.9");
  });

  it("includes responsive workflow overview with 19M initiative", () => {
    expect(handbook).toContain("# 2. Vue d'ensemble des workflows responsive");
    expect(handbook).toMatch(/19M\.1/i);
    expect(handbook).toMatch(/19M\.7/i);
    expect(handbook).toMatch(/19M\.9/i);
    expect(handbook).toMatch(/Menu tiroir|tiroir/i);
    expect(handbook).toMatch(/MedoraCard/i);
  });

  it("includes device-class guidance section", () => {
    expect(handbook).toContain("# 3. Guide par classe d'appareil");
    expect(handbook).toMatch(/Poste de travail hospitalier|poste fixe/i);
    expect(handbook).toMatch(/Portable \(laptop\)|Portable/i);
    expect(handbook).toMatch(/Tablette portrait/i);
    expect(handbook).toMatch(/Téléphone/i);
  });

  it("includes bedside tablet workflow section", () => {
    expect(handbook).toContain("# 4. Triage et workflows tablette au chevet");
    expect(handbook).toMatch(/tablette est l'appareil préféré|appareil préféré.*chevet/i);
    expect(handbook).toMatch(/Exécution sortie/i);
    expect(handbook).toMatch(/carry-forward/i);
  });

  it("includes provider mobile workflow section", () => {
    expect(handbook).toContain("# 5. Workflow mobile prestataire");
    expect(handbook).toMatch(/MDM/i);
    expect(handbook).toMatch(/intelligence motif/i);
    expect(handbook).toMatch(/Disposition/i);
  });

  it("includes trackboard mobile workflow section", () => {
    expect(handbook).toContain("# 6. Tableau des urgences et flux ED mobile");
    expect(handbook).toMatch(/puces|rail/i);
    expect(handbook).toMatch(/conscience opérationnelle|conscience situationnelle/i);
    expect(handbook).toMatch(/cartes patient/i);
  });

  it("includes ancillary mobile workflow section aligned with 19M.7", () => {
    expect(handbook).toContain("# 7. Workflows mobile auxiliaires");
    expect(handbook).toMatch(/19M\.7/i);
    expect(handbook).toContain("/app/pharmacy-worklist");
    expect(handbook).toMatch(/laboratoire|labo/i);
    expect(handbook).toMatch(/imagerie/i);
  });

  it("includes Haiti deployment operations section with cloud dependency", () => {
    expect(handbook).toContain("# 8. Opérations de déploiement Haïti");
    expect(handbook).toMatch(/dépendant du cloud/i);
    expect(handbook).toMatch(/pas.*hors-ligne complet|hors-ligne complet/i);
    expect(handbook).toMatch(/Connectivité variable/i);
    expect(handbook).toMatch(/HAITI_MVP_PILOT/i);
  });

  it("includes degraded-connectivity workflow section", () => {
    expect(handbook).toContain("# 9. Connectivité dégradée");
    expect(handbook).toMatch(/synchronisation en attente/i);
    expect(handbook).toMatch(/après reconnexion|reconnexion/i);
    expect(handbook).toMatch(/protocole papier|papier/i);
  });

  it("includes shared-device and privacy safety section", () => {
    expect(handbook).toContain("# 10. Appareils partagés et confidentialité");
    expect(handbook).toMatch(/Tablette partagée|partagée/i);
    expect(handbook).toMatch(/Confidentialité écran/i);
    expect(handbook).toMatch(/Wi-Fi public/i);
  });

  it("includes mobile operational safety section", () => {
    expect(handbook).toContain("# 11. Sécurité opérationnelle mobile");
    expect(handbook).toMatch(/Mauvais patient/i);
    expect(handbook).toMatch(/Petit écran/i);
    expect(handbook).toMatch(/overflow|scroll/i);
  });

  it("includes deployment and training recommendations", () => {
    expect(handbook).toContain("# 12. Déploiement et formation — recommandations");
    expect(handbook).toMatch(/Super-utilisateur/i);
    expect(handbook).toMatch(/Go-live|go-live/i);
    expect(handbook).toMatch(/19M\.8/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 13. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist déploiement tablette/i);
    expect(handbook).toMatch(/Checklist workflow chevet/i);
    expect(handbook).toMatch(/Checklist déploiement Haïti/i);
    expect(handbook).toMatch(/Checklist connectivité dégradée/i);
    expect(handbook).toMatch(/Checklist appareil partagé/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Navigation mobile]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Triage tablette]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Documentation prestataire tablette]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — File pharmacie mobile]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Workflow disposition mobile]");
    expect(handbook).toContain("[DIAGRAMME — Déploiement Haïti]");
    expect(handbook).toContain("[DIAGRAMME — Workflow connectivité dégradée]");
    expect(handbook).toContain("[DIAGRAMME — Architecture responsive Medora]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 14. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuelle/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-administration-governance-operations.md");
    expect(handbook).toMatch(/19M/i);
  });

  it("states desktop remains preferred for prolonged complex documentation", () => {
    expect(handbook).toMatch(/poste fixe ou portable reste préféré|reste préféré pour la documentation clinique prolongée/i);
    expect(handbook).toMatch(/documentation clinique prolongée et complexe/i);
  });

  it("states cloud dependency without offline-first false claims", () => {
    expect(handbook).toMatch(/Medora est dépendant du cloud/i);
    expect(handbook).toMatch(/pas.*architecture de synchronisation locale autonome|synchronisation locale autonome/i);
  });
});
