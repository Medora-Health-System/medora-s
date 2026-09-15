import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  medoraAssistRequestIdentity,
  shouldAcceptMedoraAssistResponse,
} from "./medoraAssistRequestIdentity";

const panel = readFileSync(join(__dirname, "AiChartReviewPanel.tsx"), "utf8");

describe("Medora Assist v1 panel", () => {
  it("clears stale findings when encounter or facility identity changes", () => {
    expect(panel).toContain("setSuggestions([])");
    expect(panel).toContain("medoraAssistRequestIdentity({ facilityId, encounterId })");
    expect(panel).toContain("shouldAcceptMedoraAssistResponse");
  });

  it("does not mix encounter A findings into encounter B", () => {
    const clinicA = medoraAssistRequestIdentity({
      facilityId: "facility-clinic",
      encounterId: "encounter-a",
    });
    const edB = medoraAssistRequestIdentity({
      facilityId: "facility-ed",
      encounterId: "encounter-b",
    });
    expect(clinicA).not.toBe(edB);
    expect(
      shouldAcceptMedoraAssistResponse({
        requestIdentity: clinicA,
        activeIdentity: edB,
        requestSequence: 1,
        activeSequence: 1,
      })
    ).toBe(false);
    expect(
      shouldAcceptMedoraAssistResponse({
        requestIdentity: edB,
        activeIdentity: edB,
        requestSequence: 2,
        activeSequence: 2,
      })
    ).toBe(true);
    expect(
      shouldAcceptMedoraAssistResponse({
        requestIdentity: edB,
        activeIdentity: edB,
        requestSequence: 1,
        activeSequence: 2,
      })
    ).toBe(false);
  });

  it("includes facilityId in request identity", () => {
    expect(
      medoraAssistRequestIdentity({ facilityId: "fac-1", encounterId: "enc-1" })
    ).not.toBe(medoraAssistRequestIdentity({ facilityId: "fac-2", encounterId: "enc-1" }));
  });

  it("renders Medora Assist chrome in EN/ES/FR and removes Revisar historia", () => {
    expect(panel).toContain("Medora Assist");
    expect(panel).toContain("Medora Asistente");
    expect(panel).toContain("Medora Assistance");
    expect(panel).toContain("No findings in this section.");
    expect(panel).toContain("Aucun constat dans cette section.");
    expect(panel).toContain("No hay hallazgos en esta sección.");
    expect(panel).not.toContain("Revisar historia");
    expect(panel).not.toContain("Revisar sección de la historia");
    expect(panel).not.toContain("reviewSection");
    expect(panel).not.toContain("copy.evidence");
    expect(panel).not.toContain("copy.snapshot");
    expect(panel).not.toContain("copy.generated");
  });

  it("keeps coding inactive and does not expose acknowledge/dismiss actions", () => {
    expect(panel).toContain("Coding intelligence is not active");
    expect(panel).not.toContain('actionType === "ACKNOWLEDGE"');
    expect(panel).not.toContain('actionType === "DISMISS"');
    expect(panel).toContain('data-read-only="true"');
  });
});
