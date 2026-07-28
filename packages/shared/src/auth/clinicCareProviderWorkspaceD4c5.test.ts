/**
 * MEDUI.D4C.5 — shared ambulatory provider workspace helpers.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS,
  CLINIC_CARE_PROVIDER_QUEUE_GROUPS,
  canAuthorAmbulatoryProviderDocumentation,
  clinicCareAmbulatoryProviderChartPath,
  filterAmbulatoryEncounterRows,
  projectClinicCareProviderQueueGroup,
  resolveClinicCareProviderDocumentationMode,
  sortClinicCareProviderQueueGroups,
} from "./clinicCareProviderWorkspaceD4c5.js";

describe("clinicCareProviderWorkspaceD4c5", () => {
  it("resolves documentation mode by encounter type", () => {
    expect(resolveClinicCareProviderDocumentationMode({ encounterType: "OUTPATIENT" })).toBe(
      "AMBULATORY"
    );
    expect(resolveClinicCareProviderDocumentationMode({ encounterType: "EMERGENCY" })).toBe("ED");
  });

  it("projects and sorts provider queue groups", () => {
    expect(projectClinicCareProviderQueueGroup("RESULTS_PENDING")).toBe("RESULTS_PENDING");
    expect(CLINIC_CARE_PROVIDER_QUEUE_GROUPS).toHaveLength(3);
    expect(sortClinicCareProviderQueueGroups(["DISCHARGE_PENDING", "RESULTS_PENDING", "IN_PROGRESS"])).toEqual([
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "DISCHARGE_PENDING",
    ]);
  });

  it("builds ambulatory chart path and filters rows", () => {
    expect(clinicCareAmbulatoryProviderChartPath("x")).toContain("workspace=ambulatory");
    expect(filterAmbulatoryEncounterRows([{ type: "OUTPATIENT" }, { type: "INPATIENT" }])).toHaveLength(1);
    expect(CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS).toContain("clinic");
    expect(canAuthorAmbulatoryProviderDocumentation(["RN"])).toBe(false);
  });
});
