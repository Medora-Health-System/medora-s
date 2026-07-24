/**
 * D4A.2.7B — Inpatient workspace recovery shared contract tests.
 */
import { describe, expect, it } from "vitest";
import {
  INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID,
  buildEncounterMismatchResolution,
  humanizeClinicalLabel,
  mustNotExposeCertificationInClinicalUi,
  nursingPrimaryNav,
  providerPrimaryNav,
  resolveHospitalChartPathKind,
  technicianPrimaryNav,
  inpatientWorkspaceMustBlockWritersWhenUnresolved,
  inpatientWorkspaceMustNotDuplicateGenericNotes,
  inpatientWorkspaceMustNotEnablePlacement,
  inpatientWorkspaceMustNotReuseEdEncounterAsInpatient,
  inpatientWorkspaceMustSeparateProviderAndNursing,
} from "../index.js";

describe("MEDUI.INPATIENT_WORKSPACE_RECOVERY.D4A2_7B shared", () => {
  it("exposes certification and architectural invariants", () => {
    expect(INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID).toBe(
      "MEDUI.INPATIENT_WORKSPACE_RECOVERY.D4A2_7B"
    );
    expect(inpatientWorkspaceMustBlockWritersWhenUnresolved()).toBe(true);
    expect(inpatientWorkspaceMustSeparateProviderAndNursing()).toBe(true);
    expect(inpatientWorkspaceMustNotReuseEdEncounterAsInpatient()).toBe(true);
    expect(inpatientWorkspaceMustNotDuplicateGenericNotes()).toBe(true);
    expect(inpatientWorkspaceMustNotEnablePlacement()).toBe(true);
  });

  it("rejects ED encounter masquerading as inpatient and routes bed occupants by unit", () => {
    const mismatch = buildEncounterMismatchResolution({
      requestedEncounterId: "enc-ed",
      actualType: "EMERGENCY",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.category).toBe("ED_ENCOUNTER_REJECTED");
      expect(mismatch.writersEnabled).toBe(false);
    }
    expect(resolveHospitalChartPathKind({ unitCode: "ED" })).toBe("EMERGENCY");
    expect(resolveHospitalChartPathKind({ unitCode: "OBS" })).toBe("OBSERVATION");
    expect(resolveHospitalChartPathKind({ unitCode: "MS" })).toBe("INPATIENT");
    expect(resolveHospitalChartPathKind({ unitCode: "ICU" })).toBe("INPATIENT");
  });

  it("keeps provider and nursing primary nav separated", () => {
    const provider = providerPrimaryNav();
    const nursing = nursingPrimaryNav();
    const tech = technicianPrimaryNav();
    expect(provider).toContain("historyPhysical");
    expect(provider).not.toContain("admission");
    expect(nursing).toContain("admission");
    expect(nursing).toContain("notes");
    expect(nursing).toContain("nursing");
    expect(nursing).not.toContain("historyPhysical");
    expect(nursing).not.toContain("timeline");
    expect(nursing).not.toContain("summary");
    expect(tech).not.toContain("historyPhysical");
    expect(tech).not.toContain("admission");
  });

  it("humanizes compressed labels and detects certification leakage", () => {
    expect(humanizeClinicalLabel("CodeStatusConfirmed")).toBe("Code Status Confirmed");
    expect(humanizeClinicalLabel("npoStatus")).toBe("Npo Status");
    expect(humanizeClinicalLabel("Level of consciousness")).toBe("Level of consciousness");
    expect(
      mustNotExposeCertificationInClinicalUi("MEDUI.AUTHORITATIVE_DOMAIN_LINKAGE.D4A2_6H")
    ).toBe(true);
    expect(mustNotExposeCertificationInClinicalUi("Code status confirmed")).toBe(false);
  });
});
