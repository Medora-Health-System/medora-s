import { describe, expect, it } from "vitest";
import {
  resolveToxicIngestionOverdoseContext,
} from "./toxicIngestionOverdoseClinicalIntelligence";
import { isToxicAmountUnknown, parseToxicExposureFromText } from "./toxicExposureFoundation";

describe("toxicIngestionOverdoseClinicalIntelligence", () => {
  it("resolves acetaminophen exposure", () => {
    const context = resolveToxicIngestionOverdoseContext({
      displayName: "Acetaminophen overdose, amount known, acute ingestion",
    });
    expect(context.branches).toContain("acetaminophen");
  });

  it("withholds routine discharge for intentional overdose and sets psychiatric linkage", () => {
    const context = resolveToxicIngestionOverdoseContext({
      displayName: "Intentional overdose with suicidal ingestion",
    });
    expect(context.branches).toContain("intentional_overdose");
    expect(context.psychiatricLinkageAdvisory).toBe(true);
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for unknown ingestion", () => {
    const context = resolveToxicIngestionOverdoseContext({
      displayName: "Unknown ingestion, amount unknown",
    });
    expect(context.branches).toContain("unknown_ingestion");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("does not invent dose when amount is unknown", () => {
    const findings = parseToxicExposureFromText("Unknown ingestion, dose unknown, amount unknown");
    expect(isToxicAmountUnknown(findings)).toBe(true);
    expect(findings.amountUnknown).toBe(true);
  });

  it("allows post-observation acetaminophen follow-up family", () => {
    const context = resolveToxicIngestionOverdoseContext({
      displayName: "Acetaminophen exposure, post-observation follow-up",
    });
    expect(context.branches).toContain("acetaminophen");
    expect(context.dischargeFamilyId).toBe("acetaminophen_exposure_followup_v1");
  });
});
