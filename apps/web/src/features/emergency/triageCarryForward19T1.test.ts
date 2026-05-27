/**
 * Phase 19T.1 — triage carry-forward wiring (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("triageCarryForward UI wiring (19T.1)", () => {
  const panel = readWebSource("src/features/emergency/EmergencyTriagePanel.tsx");
  const sections = readWebSource("src/features/emergency/EmergencyTriageV1Sections.tsx");
  const summary = readWebSource("src/features/emergency/emergencyVisitSummaryModel.ts");
  const controller = readFileSync(join(webRoot, "../api/src/triage/triage.controller.ts"), "utf8");

  it("loads carry-forward from API when triage row is empty", () => {
    expect(panel).toContain("/triage/carry-forward");
    expect(panel).toContain("mergeCarryForwardApiPayloadIntoTriageForm");
    expect(panel).toContain("TriageCarryForwardBanner");
    expect(panel).toContain("carryForwardMeta");
  });

  it("shows carried-forward banner and section badges", () => {
    expect(sections).toContain("TriageCarryForwardSectionBadge");
    expect(sections).toContain("carryForwardMeta");
    expect(readWebSource("src/features/emergency/TriageCarryForwardBanner.tsx")).toContain(
      'data-testid="triage-carry-forward-banner"'
    );
  });

  it("persists carry-forward meta on triage save", () => {
    expect(readWebSource("src/features/emergency/emergencyTriageVitalsMerge.ts")).toContain(
      "attachTriageCarryForwardMetaToVitalsJson"
    );
    expect(panel).toContain("normalizeCarryForwardMetaFromForm(carryForwardMeta, formData)");
  });

  it("supports per-section confirm and clear actions (19T.2)", () => {
    expect(panel).toContain("handleConfirmCarryForwardSection");
    expect(panel).toContain("handleClearCarryForwardSection");
    expect(sections).toContain("TriageCarryForwardSectionToolbar");
    expect(readWebSource("src/features/emergency/TriageCarryForwardBanner.tsx")).toContain("confirmAll");
  });

  it("includes carry-forward summary in visit summary model", () => {
    expect(summary).toContain("triageCarryForward");
    expect(summary).toContain("buildTriageCarryForwardSummaryBlock");
  });

  it("exposes server carry-forward endpoint", () => {
    expect(controller).toContain(":id/triage/carry-forward");
    expect(controller).toContain("TriageCarryForwardService");
  });
});

describe("triageCarryForward French i18n (19T.1 / 19T.2)", () => {
  const fr = readWebSource("src/i18n/messages/erTriage.fr.ts");

  it("uses French carry-forward copy", () => {
    expect(fr).toContain("Antécédents repris de la visite UE antérieure");
    expect(fr).toContain("Confirmer tout l'historique repris");
    expect(fr).toContain("En attente de revue");
    expect(fr).toContain("Antécédent source datant de plus de 6 mois");
    expect(fr).toContain("Antécédent source datant de plus de 12 mois");
    expect(fr).toContain("Reprise — en attente de revue");
  });
});
