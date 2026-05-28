import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MBOOK_FR8_HANDBOOK_VERSION = "M-BOOK.FR.8";
export const MBOOK_FR8_HANDBOOK_PATH = "docs/operations/handbook-fr-administration-governance-operations.md";

const repoRoot = join(import.meta.dirname, "../../../../..");

function readHandbook(): string {
  return readFileSync(join(repoRoot, MBOOK_FR8_HANDBOOK_PATH), "utf8");
}

function normalizeApostrophes(text: string): string {
  return text.replace(/\u2019/g, "'");
}

const handbook = normalizeApostrophes(readHandbook());

/** Phase M-BOOK.FR.8 — Administration, governance & platform operations handbook source-level validation. */
describe("French handbook administration governance operations (M-BOOK.FR.8)", () => {
  it("handbook file exists with volume title and phase marker", () => {
    expect(handbook.length).toBeGreaterThan(5000);
    expect(handbook).toContain("Volume 7 — Administration, gouvernance et opérations plateforme");
    expect(handbook).toContain("M-BOOK.FR.8");
  });

  it("includes platform governance introduction section", () => {
    expect(handbook).toContain("# 1. Introduction à la gouvernance plateforme");
    expect(handbook).toMatch(/Medora-S soutient les workflows de gouvernance/i);
    expect(handbook).toMatch(/direction institutionnelle reste responsable/i);
    expect(handbook).toMatch(/journal d'audit/i);
  });

  it("includes facility and user management section", () => {
    expect(handbook).toContain("# 3. Établissement et gestion utilisateurs");
    expect(handbook).toContain("/app/admin/users");
    expect(handbook).toMatch(/Provisionnement|provisionnement/i);
    expect(handbook).toMatch(/établissement|facility/i);
    expect(handbook).toMatch(/désactiv/i);
  });

  it("includes RBAC and access governance section", () => {
    expect(handbook).toContain("# 4. RBAC et gouvernance des accès");
    expect(handbook).toMatch(/Contrôle d'accès par rôle|RBAC/i);
    expect(handbook).toMatch(/moindre privilège|Moindre privilège/i);
    expect(handbook).toMatch(/Pas de détail sur.*schémas permissions|schémas permissions internes/i);
  });

  it("includes audit and governance workflow section", () => {
    expect(handbook).toContain("# 5. Audit et workflows de gouvernance");
    expect(handbook).toContain("/app/admin/audit");
    expect(handbook).toMatch(/Traçabilité/i);
    expect(handbook).toMatch(/carry-forward|Phase 5F|export dossier/i);
  });

  it("includes ROI administration and monitoring section", () => {
    expect(handbook).toContain("# 6. Administration ROI et surveillance");
    expect(handbook).toContain("/app/admin/roi");
    expect(handbook).toMatch(/Phase 5G/i);
    expect(handbook).toMatch(/roi-monitoring|Surveillance ROI/i);
    expect(handbook).toMatch(/minimum nécessaire/i);
  });

  it("includes downtime and business continuity section with cloud dependency", () => {
    expect(handbook).toContain("# 8. Panne et continuité d'activité");
    expect(handbook).toMatch(/dépendant du cloud/i);
    expect(handbook).toMatch(/pas.*hors-ligne complet|hors-ligne complet/i);
    expect(handbook).toMatch(/synchronisation en attente/i);
    expect(handbook).toMatch(/protocole papier|papier/i);
  });

  it("includes mobile and tablet governance aligned with 19M", () => {
    expect(handbook).toContain("# 9. Mobile et tablette — gouvernance");
    expect(handbook).toMatch(/19M/i);
    expect(handbook).toMatch(/Tablette/i);
    expect(handbook).toMatch(/Appareil partagé|partagé/i);
    expect(handbook).toMatch(/Haïti/i);
  });

  it("includes security and privacy safety section", () => {
    expect(handbook).toContain("# 10. Sécurité et confidentialité");
    expect(handbook).toMatch(/Identifiants partagés|comptes partagés/i);
    expect(handbook).toMatch(/Poste non verrouillé|verrouill/i);
    expect(handbook).toMatch(/Hameçonnage|hameçonnage/i);
  });

  it("includes operational support workflow section", () => {
    expect(handbook).toContain("# 11. Support opérationnel");
    expect(handbook).toMatch(/Escalade/i);
    expect(handbook).toMatch(/Dépannage opérationnel/i);
    expect(handbook).toMatch(/pas outillage engineering|engineering interne/i);
  });

  it("includes quick-reference checklists", () => {
    expect(handbook).toContain("# 12. Résumé opérationnel rapide — checklists");
    expect(handbook).toMatch(/Checklist onboarding administrateur/i);
    expect(handbook).toMatch(/Checklist provisionnement utilisateur/i);
    expect(handbook).toMatch(/Checklist revue RBAC/i);
    expect(handbook).toMatch(/Checklist gouvernance ROI/i);
    expect(handbook).toMatch(/Checklist panne/i);
    expect(handbook).toMatch(/Checklist déploiement Haïti/i);
  });

  it("includes screenshot and diagram placeholders", () => {
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Administration Medora]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Surveillance ROI]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Gestion utilisateurs]");
    expect(handbook).toContain("[CAPTURE D'ÉCRAN — Tableau de bord plateforme]");
    expect(handbook).toContain("[DIAGRAMME — Gouvernance accès]");
    expect(handbook).toContain("[DIAGRAMME — Workflow ROI]");
    expect(handbook).toContain("[DIAGRAMME — Escalade opérationnelle]");
    expect(handbook).toContain("[DIAGRAMME — Continuité activité]");
  });

  it("includes handbook governance section and prior volume references", () => {
    expect(handbook).toContain("# 13. Gouvernance du chapitre");
    expect(handbook).toMatch(/révision annuelle|annuelle/i);
    expect(handbook).toContain("french-terminology-canon.md");
    expect(handbook).toContain("handbook-fr-disposition-admission-transfer-roi.md");
    expect(handbook).toMatch(/Phase 5F|5G/i);
  });

  it("states least-privilege philosophy for operational access", () => {
    expect(handbook).toMatch(/informations requises pour ses fonctions opérationnelles/i);
    expect(handbook).toMatch(/minimum.*rôles|minimum.*nécessaire/i);
  });

  it("states shared-account prohibition explicitly", () => {
    expect(handbook).toMatch(/comptes partagés sont interdits/i);
    expect(handbook).toMatch(/compte nominatif|comptes nominatifs/i);
  });

  it("documents administrative role definitions section", () => {
    expect(handbook).toContain("# 2. Définitions des rôles administratifs");
    expect(handbook).toMatch(/Administrateur plateforme|Administrateur/i);
    expect(handbook).toMatch(/Responsable ROI/i);
    expect(handbook).toMatch(/Responsable conformité/i);
    expect(handbook).toMatch(/Responsable formation/i);
  });
});
