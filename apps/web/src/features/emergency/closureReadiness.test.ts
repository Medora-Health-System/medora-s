import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
} from "@medora/shared";
import {
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  emptyProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("closureReadiness (MEDUI.CLOSURE.READINESS_DISCHARGE_SYNC_FIX)", () => {
  it("shows discharge blockers when instructions are absent", () => {
    expect(hasClosureAdequateDischargeInstructions({ dischargeMode: "Domicile" }, false)).toBe(false);
    expect(hasClosureFollowUpDocumented({})).toBe(false);
    expect(hasClosureReturnPrecautionsDocumented({})).toBe(false);
    expect(hasClosurePatientInstructionsExplained({})).toBe(false);
  });

  it("clears instruction blocker when diagnosis instructions are present", () => {
    const summary = {
      providerDischargeDiagnosisDocs: [
        {
          description: "Acute bronchitis",
          diagnosisInstructions: "Rest and fluids",
        },
      ],
      providerDischargeReturnWorkSchool: "May return to work in 2 days",
    };
    expect(hasClosureAdequateDischargeInstructions(summary, false)).toBe(true);
  });

  it("clears follow-up blocker when structured follow-up row is present", () => {
    const summary = {
      providerDischargeFollowUps: [
        {
          specialty: "PRIMARY_CARE",
          providerOrFacility: "Dr Smith",
          timing: "Within 3 days",
          phone: "555-0100",
        },
      ],
    };
    expect(hasClosureFollowUpDocumented(summary)).toBe(true);
  });

  it("clears instructions-explained blocker when checkbox is persisted", () => {
    const form = {
      ...emptyProviderDischargeDocumentationForm(),
      patientInstructionsGiven: true,
    };
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-06-23T12:00:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    expect(merged.patientInstructionsGiven).toBe(true);
    expect(hasClosurePatientInstructionsExplained(merged)).toBe(true);

    const rehydrated = hydrateProviderDischargeDocumentationForm(merged);
    expect(rehydrated.patientInstructionsGiven).toBe(true);
  });

  it("rolls follow-up narrative into legacy keys on save", () => {
    const form = {
      ...emptyProviderDischargeDocumentationForm(),
      followUps: [
        {
          id: "fu-1",
          specialty: "PRIMARY_CARE",
          providerOrFacility: "Dr Smith",
          timing: "Within 3 days",
          phone: "555-0100",
          address: "",
          comments: "",
        },
      ],
    };
    const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-06-23T12:00:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    expect(typeof merged.followUpInstructions).toBe("string");
    expect(String(merged.followUpInstructions)).toContain("Dr Smith");
    expect(hasClosureFollowUpDocumented(merged)).toBe(true);
  });

  it("Summary V2 closure card refreshes readiness after encounter updates", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("DispositionReadinessBanner");
    expect(closure).toContain("refreshKey={`${String((encounter as { updatedAt?: string }).updatedAt ?? \"\")}-${resultsRefresh}`}");
  });

  it("provider discharge planning section exposes instructions-explained checkbox", () => {
    const section = readSrc("features/emergency/ProviderDischargeDocumentationSection.tsx");
    expect(section).toContain("patientInstructionsGiven");
    expect(section).toContain("patientDischargeInstructions.givenCheckbox");
  });
});
