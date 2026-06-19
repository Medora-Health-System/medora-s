import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMarPrnCurrentlyEligible,
  isPrnAdministrationBeforeNextEligible,
  resolveMarPrnNextEligibleAt,
  validatePrnAdministrationForMarCreate,
  shouldSkipOrderLineCompletionForMar,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");
const repoRoot = join(import.meta.dirname, "../../../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("marPrnFrequencyContinuity (H9J.1)", () => {
  it("Q6H PRN last given 09:54 resolves next eligible 15:54", () => {
    const next = resolveMarPrnNextEligibleAt({
      lastAdministeredAt: "2026-06-12T09:54:00.000Z",
      frequencyCode: "Q6H",
    });
    expect(next?.toISOString()).toBe("2026-06-12T15:54:00.000Z");
  });

  it("PRN eligible administers without early-override requirement when interval met", () => {
    expect(
      isMarPrnCurrentlyEligible({
        now: "2026-06-12T16:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:54:00.000Z",
        frequencyCode: "Q6H",
      })
    ).toBe(true);
    expect(
      validatePrnAdministrationForMarCreate({
        marAction: "administered",
        frequencyCode: "Q6H",
        directionsSig: "q6h PRN pain",
        prnReasonCode: "mild_pain",
        proposedAdministeredAt: "2026-06-12T16:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:54:00.000Z",
      })
    ).toBeNull();
  });

  it("PRN is never blocked as late — only early-before-next-eligible", () => {
    expect(
      isPrnAdministrationBeforeNextEligible({
        proposedAdministeredAt: "2026-06-12T20:00:00.000Z",
        lastAdministeredAt: "2026-06-12T09:54:00.000Z",
        frequencyCode: "Q6H",
      })
    ).toBe(false);
  });

  it("early PRN requires one override reason on create validation", () => {
    const blocked = validatePrnAdministrationForMarCreate({
      marAction: "administered",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN nausea",
      prnReasonCode: "nausea",
      proposedAdministeredAt: "2026-06-12T11:00:00.000Z",
      lastAdministeredAt: "2026-06-12T09:54:00.000Z",
      prnEarlyOverrideReason: null,
    });
    expect(blocked?.code).toBe("prn_early_override_required");

    const allowed = validatePrnAdministrationForMarCreate({
      marAction: "administered",
      frequencyCode: "Q6H",
      directionsSig: "q6h PRN nausea",
      prnReasonCode: "nausea",
      proposedAdministeredAt: "2026-06-12T11:00:00.000Z",
      lastAdministeredAt: "2026-06-12T09:54:00.000Z",
      prnEarlyOverrideReason: "Patient distress",
    });
    expect(allowed).toBeNull();
  });

  it("PRN order remains active after administration (completion skip)", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "Q6H",
        directionsSig: "q6h PRN pain",
        orderRoute: "PO",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);
  });

  it("MedicationAdministrationTab skips schedule variance for PRN", () => {
    const tab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(tab).toContain("modalItem.isPrn ? null : modalItem.scheduledAt");
    expect(tab).toContain("isPrn: modalItem.isPrn");
  });

  it("API skips schedule timing governance for PRN lines", () => {
    const service = readRepo("apps/api/src/medication-administration/medication-administration.service.ts");
    expect(service).toContain("!isPrnMedicationLine");
    expect(service).toContain("proposedAdministeredAt:");
    expect(service).toContain("prnEarlyOverrideReason");
  });
});
