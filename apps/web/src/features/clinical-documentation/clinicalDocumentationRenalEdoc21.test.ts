import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculateRenalNetBalance,
  calculateRenalWeightChange,
  DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
  RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
  summarizeDialysisRenalFluidPayload,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation renal (EDOC.21)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationRenalForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.21 renal form", () => {
    expect(hub).toContain("isEdoc21DialysisRenalFluidManagementDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationRenalForm");
  });

  it("form exposes cards with dropdowns, calculations, and compact layout", () => {
    expect(form).toContain("clinical-documentation-renal-form");
    expect(form).toContain("RENAL_ACCESS_TYPE_OPTIONS");
    expect(form).toContain("RENAL_HEMODIALYSIS_STATUS_OPTIONS");
    expect(form).toContain("RENAL_YES_NO_NA_OPTIONS");
    expect(form).not.toContain("RENAL_YES_NO_UNKNOWN_NA_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateDialysisRenalFluidManagementDocumentationPayloadForCard");
    expect(form).toContain("calculateRenalNetBalance");
    expect(form).toContain("calculateRenalWeightChange");
    expect(form).toContain("renal-net-balance-calculated");
    expect(form).toContain("renal-weight-change-calculated");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("net balance and weight change helpers match form display support", () => {
    expect(calculateRenalNetBalance(2000, 1500)).toBe(500);
    expect(calculateRenalWeightChange(72.5, 71)).toBe(1.5);
  });

  it("bilingual renal form keys mirrored", () => {
    expect(en).toContain("renal:");
    expect(fr).toContain("renal:");
    expect(en).toContain("netBalanceCalculated:");
    expect(fr).toContain("netBalanceCalculated:");
    expect(en).toContain("nephrologyNotified:");
    expect(fr).toContain("nephrologyNotified:");
  });

  it("EN and FR summaries render", () => {
    const enSummary = summarizeDialysisRenalFluidPayload(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: "2026-05-28T14:00:00.000Z",
        accessType: "AV_FISTULA",
        accessLocation: "LEFT_ARM",
        thrillPresent: "YES",
        bruitPresent: "YES",
        siteStatus: "NORMAL",
        dressingStatus: "NOT_APPLICABLE",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(enSummary.some((l) => l.key === "Access type")).toBe(true);

    const frSummary = summarizeDialysisRenalFluidPayload(
      RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
      {
        reviewTime: "2026-05-28T14:00:00.000Z",
        reviewPeriod: "SHIFT",
        totalIntakeMl: 1800,
        totalOutputMl: 1200,
        netBalanceMl: 600,
        fluidBalanceConcern: "NO",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(frSummary.some((l) => l.key === "Bilan net")).toBe(true);
  });
});
