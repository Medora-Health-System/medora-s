import { describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr";
import {
  facilityFeeCategoryLabelKey,
  facilityFeeReasonLabelKey,
  observationOperationalStatusLabelKey,
} from "@/lib/facilityFeeReadinessDisplay";
import { FORBIDDEN_FACILITY_FEE_READINESS_KEYS } from "@medora/shared";

function tFrom(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

describe("facilityFeeReadiness display (19UCED.5)", () => {
  it("renders preview-only disclaimer in FR", () => {
    expect(tFrom(fr, "facilityFeeReadiness.previewOnlyDisclaimer")).toMatch(/Aperçu uniquement/i);
    expect(tFrom(fr, "facilityFeeReadiness.previewOnlyDisclaimer")).toMatch(/aucune réclamation/i);
  });

  it("covers observation status and category labels", () => {
    expect(tFrom(fr, observationOperationalStatusLabelKey("ACTIVE_OBSERVATION"))).toMatch(/observation/i);
    expect(tFrom(fr, facilityFeeCategoryLabelKey("EMERGENCY_FACILITY"))).toMatch(/urgence/i);
  });

  it("covers facility fee reason labels", () => {
    expect(tFrom(fr, facilityFeeReasonLabelKey("EXTENDED_LENGTH_OF_STAY_REVIEW"))).toMatch(/prolong/i);
    expect(tFrom(fr, facilityFeeReasonLabelKey("INPATIENT_REVIEW_REQUIRED"))).toMatch(/hospitalisation/i);
  });

  it("card component has no submit claim action", async () => {
    const fs = await import("node:fs/promises");
    const cardPath = new URL("../components/billing/EncounterFacilityFeeReadinessCard.tsx", import.meta.url);
    const src = await fs.readFile(cardPath, "utf8");
    expect(src).not.toMatch(/submit.*claim|soumettre.*réclamation/i);
    expect(src).toContain("previewOnlyDisclaimer");
    expect(src).not.toMatch(/onSubmit|type=\"submit\"/i);
    expect(src).toContain("facility-fee-observation-status");
    expect(src).toContain("facility-fee-extended-observation");
  });

  it("forbidden PHI keys remain documented in shared package", () => {
    expect(FORBIDDEN_FACILITY_FEE_READINESS_KEYS).toContain("reimbursementAmount");
    expect(FORBIDDEN_FACILITY_FEE_READINESS_KEYS).toContain("claimPayload");
  });
});
