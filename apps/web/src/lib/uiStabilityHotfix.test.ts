import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { searchSurgicalHistoryCatalog } from "@medora/shared";
import { searchErChiefComplaintTemplates } from "@/features/emergency/erChiefComplaintTemplates";
import {
  chiefComplaintSuggestsChestPain,
  erTriageV1HasHighAcuityArrivalSource,
} from "@/features/emergency/erTriageSafetyPrompts";
import {
  erTriageV1FormFromVitalsJson,
  normalizeErTriageV1Form,
  safeTrim,
} from "@/features/emergency/medoraErTriageV1";
import { appendDiagnosisToPmh } from "@/features/emergency/edTriageEfficiencyGovernance";

describe("HOTFIX.MEDUI.UI.STABILITY.1 — safe trim / search guards", () => {
  it("safeTrim handles undefined and null", () => {
    expect(safeTrim(undefined)).toBe("");
    expect(safeTrim(null)).toBe("");
    expect(safeTrim("  x  ")).toBe("x");
  });

  it("undefined chief complaint search does not crash", () => {
    expect(() => searchErChiefComplaintTemplates(undefined as unknown as string, "fr")).not.toThrow();
    expect(searchErChiefComplaintTemplates(undefined as unknown as string, "fr")).toEqual([]);
  });

  it("undefined surgical history search does not crash", () => {
    expect(() => searchSurgicalHistoryCatalog(undefined as unknown as string, "en")).not.toThrow();
    expect(searchSurgicalHistoryCatalog(null as unknown as string, "en")).toEqual([]);
  });

  it("chiefComplaintSuggestsChestPain accepts undefined chief complaint", () => {
    expect(chiefComplaintSuggestsChestPain(undefined)).toBe(false);
  });

  it("normalizeErTriageV1Form fills missing TRIAGE.2 string fields from legacy partial blob", () => {
    const normalized = normalizeErTriageV1Form({
      ppeNote: "Mask",
      gcsEye: undefined as unknown as string,
      travelDestinationCountry: undefined as unknown as string,
      safetyAssessmentNotes: undefined as unknown as string,
      sourceRoutingSelections: undefined as unknown as string[],
    });
    expect(() => safeTrim(normalized.travelDestinationCountry)).not.toThrow();
    expect(() => safeTrim(normalized.safetyAssessmentNotes)).not.toThrow();
    expect(() => safeTrim(normalized.gcsEye)).not.toThrow();
    expect(erTriageV1HasHighAcuityArrivalSource(normalized)).toBe(false);
  });

  it("existing saved triage with missing optional fields loads without crash", () => {
    const legacy = {
      medoraErTriageV1: {
        pastMedicalHistory: "HTA",
        chiefComplaint: null,
      },
    };
    const form = normalizeErTriageV1Form(erTriageV1FormFromVitalsJson(legacy));
    expect(() => appendDiagnosisToPmh(form.pastMedicalHistory, {
      id: "x",
      code: "I10",
      shortDescription: "Hypertension",
      longDescription: null,
      isBillable: true,
    }, "fr")).not.toThrow();
  });
});

describe("HOTFIX.MEDUI.UI.STABILITY.1 — dashboard steady refresh", () => {
  it("ED trackboard polls with silent background refresh", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTrackboardView.tsx"),
      "utf8"
    );
    expect(source.includes("loadEncounters({ silent: true })")).toBe(true);
    expect(source.includes("hasLoadedOnceRef")).toBe(true);
    expect(source.includes("isRefreshingSilently")).toBe(true);
  });

  it("lab worklist keeps rows during silent refresh", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/app/lab-worklist/page.tsx"),
      "utf8"
    );
    expect(source.includes("loadQueue({ silent: true })")).toBe(true);
    expect(source.includes("if (!silent) setQueue([])")).toBe(true);
    expect(source.includes("hasLoadedOnceRef")).toBe(true);
  });

  it("radiology worklist keeps rows during silent refresh", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/app/rad-worklist/page.tsx"),
      "utf8"
    );
    expect(source.includes("loadQueue({ silent: true })")).toBe(true);
    expect(source.includes("if (!silent) setQueue([])")).toBe(true);
    expect(source.includes("hasLoadedOnceRef")).toBe(true);
  });

  it("ED trackboard uses stable encounter id keys", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTrackboardView.tsx"),
      "utf8"
    );
    expect(source.includes("key={encounter.id}")).toBe(true);
  });

  it("lab worklist uses stable item id keys", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/app/lab-worklist/page.tsx"),
      "utf8"
    );
    expect(source.includes("key={item.id}")).toBe(true);
  });
});
