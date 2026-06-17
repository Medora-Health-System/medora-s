import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  shouldAllowOrderLineCompletionDespitePrnContinuity,
  shouldSkipOrderLineCompletionForDoseGatedMar,
  shouldSkipOrderLineCompletionForMar,
} from "@medora/shared";

const repoRoot = join(import.meta.dirname, "../../../..");

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const flagsOn = {
  MEDICATION_SCHEDULING_V1: true,
  MEDICATION_DOSE_INSTANCES: true,
  MEDICATION_DOSE_GATED_MAR: true,
};

describe("providerDocumentationMarPrnContinuityGovernance — MEDUI.ED.MAR.H2", () => {
  it("uses classification-based skip for PRN and ON_DEMAND only", () => {
    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "PRN",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);

    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "Q6H",
        directionsSig: "q6h PRN pain",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);

    expect(
      shouldSkipOrderLineCompletionForMar({
        frequencyCode: "NOW",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("preserves scheduled dose-gated completion skip without affecting direct NOW", () => {
    expect(
      shouldSkipOrderLineCompletionForDoseGatedMar({
        featureFlags: flagsOn,
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: false,
      })
    ).toBe(true);

    expect(
      shouldSkipOrderLineCompletionForMar({
        featureFlags: { MEDICATION_DOSE_GATED_MAR: false },
        frequencyCode: "BID",
        scheduleClassification: "RECURRING",
        doseGatedMarPathUsed: false,
      })
    ).toBe(false);
  });

  it("allows explicit quantity exhaustion to complete PRN lines", () => {
    expect(
      shouldAllowOrderLineCompletionDespitePrnContinuity({
        skipForPrnContinuity: true,
        marAction: "administered",
        prescribedQuantity: 2,
        priorAdministeredSum: 1,
        administrationIncrement: 1,
      })
    ).toBe(true);
  });

  it("MAR create service delegates to shared completion policy helpers", () => {
    const service = readRepo("apps/api/src/medication-administration/medication-administration.service.ts");
    expect(service).toContain("shouldSkipOrderLineCompletionForMar(");
    expect(service).toContain("shouldAllowOrderLineCompletionDespitePrnContinuity(");
    expect(service).not.toContain("frequencyCode === \"PRN\"");
  });

  it("task resolution uses shared policy for completed PRN lines", () => {
    const workload = readRepo("apps/web/src/lib/nurseMedicationWorkload.ts");
    expect(workload).toContain("shouldSkipOrderLineCompletionForMar");
  });

  it("drawer resync uses PRN fallback lookup without duplicate MAR paths", () => {
    const display = readRepo("apps/web/src/features/mar/marShiftTimelineDisplay.ts");
    expect(display).toContain("findMarShiftTimelinePrnCellItemFallback");
    expect(display).toContain("findMarShiftTimelineCellItem");
  });

  it("does not alter infusion lifecycle completion skip wiring", () => {
    const service = readRepo("apps/api/src/medication-administration/medication-administration.service.ts");
    expect(service).toContain("ivpbDoseSessionMarContext?.skipOrderLineCompletion");
    expect(service).toContain("allowAdministeredForInfusionTerminal");
  });
});
