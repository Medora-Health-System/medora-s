/**
 * INP.DIS.1H — discharge awareness projection + census / bed board semantics.
 */

import { describe, expect, it } from "vitest";
import {
  buildInpatientDischargeAwareness,
  formatInpatientDischargeAwarenessBadgeEn,
  resolveInpatientDischargeAwarenessTone,
} from "./inpatientDischargeAwarenessInpDis1h.js";
import { buildHospitalCensusV1, type HospitalCensusEncounterInput } from "./hospitalCensusV1.js";
import { composeUnitBedBoard } from "./bedBoardComposition.js";
import { resolveBedOperationalStatus } from "./bedOperationalStatus.js";

function finalizedSummary(code: string, extras?: Record<string, unknown>) {
  return {
    inpatientProviderDischarge: {
      providerDocumentationFinalizedAt: "2026-08-28T12:34:00.000Z",
      finalDisposition: {
        code,
        labelSnapshot: code,
        ...extras,
      },
    },
  };
}

describe("INP.DIS.1H inpatient discharge awareness", () => {
  it("HOME: badge + ordinary tone; draft has no awareness", () => {
    const draft = buildInpatientDischargeAwareness({
      dischargeSummaryJson: {
        inpatientProviderDischarge: {
          finalDisposition: { code: "HOME" },
        },
      },
      encounterStatus: "OPEN",
    });
    expect(draft).toBeNull();

    const home = buildInpatientDischargeAwareness({
      dischargeSummaryJson: finalizedSummary("HOME"),
      encounterStatus: "OPEN",
    });
    expect(home?.providerFinalized).toBe(true);
    expect(home?.tone).toBe("ordinary");
    expect(formatInpatientDischargeAwarenessBadgeEn(home!)).toBe("Discharge → Home");
  });

  it("HOME_HEALTH / SNF / ACUTE_REHAB / LTAC labels and destinations", () => {
    const hh = buildInpatientDischargeAwareness({
      dischargeSummaryJson: finalizedSummary("HOME_WITH_HOME_HEALTH", {
        homeHealth: { agencyName: "Care Now" },
      }),
      encounterStatus: "OPEN",
    });
    expect(formatInpatientDischargeAwarenessBadgeEn(hh!)).toContain("Home Health");
    expect(hh?.destinationName).toBe("Care Now");

    const snf = buildInpatientDischargeAwareness({
      dischargeSummaryJson: finalizedSummary("SKILLED_NURSING_FACILITY", {
        snf: { facilityName: "Sunrise SNF" },
      }),
      encounterStatus: "OPEN",
    });
    expect(formatInpatientDischargeAwarenessBadgeEn(snf!)).toContain("SNF");
    expect(snf?.destinationName).toBe("Sunrise SNF");

    expect(
      formatInpatientDischargeAwarenessBadgeEn(
        buildInpatientDischargeAwareness({
          dischargeSummaryJson: finalizedSummary("ACUTE_REHAB"),
          encounterStatus: "OPEN",
        })!
      )
    ).toBe("Discharge → Acute Rehab");

    expect(
      formatInpatientDischargeAwarenessBadgeEn(
        buildInpatientDischargeAwareness({
          dischargeSummaryJson: finalizedSummary("LONG_TERM_ACUTE_CARE"),
          encounterStatus: "OPEN",
        })!
      )
    ).toBe("Discharge → LTAC");
  });

  it("TRANSFER / AMA / ELOPED / DECEASED are non-ordinary", () => {
    expect(resolveInpatientDischargeAwarenessTone("TRANSFER_ACUTE_CARE")).toBe("transfer");
    expect(resolveInpatientDischargeAwarenessTone("AGAINST_MEDICAL_ADVICE")).toBe("ama");
    expect(resolveInpatientDischargeAwarenessTone("ELOPED")).toBe("eloped");
    expect(resolveInpatientDischargeAwarenessTone("DECEASED")).toBe("deceased");

    const eloped = buildInpatientDischargeAwareness({
      dischargeSummaryJson: finalizedSummary("ELOPED"),
      encounterStatus: "OPEN",
    });
    expect(formatInpatientDischargeAwarenessBadgeEn(eloped!)).toBe("Eloped");
    expect(eloped?.tone).not.toBe("ordinary");

    const deceased = buildInpatientDischargeAwareness({
      dischargeSummaryJson: finalizedSummary("DECEASED", {
        deceased: { pronouncedAt: "2026-08-28T12:00:00.000Z" },
      }),
      encounterStatus: "OPEN",
    });
    expect(formatInpatientDischargeAwarenessBadgeEn(deceased!)).toBe("Deceased");
  });

  it("census projects dischargeOrders vs readyDischarge separately", () => {
    const enc: HospitalCensusEncounterInput = {
      id: "enc-home",
      facilityId: "fac-1",
      type: "INPATIENT",
      status: "OPEN",
      billingClassification: "INPATIENT",
      roomLabel: "MS-4",
      admissionSummaryJson: {
        hospitalAssignments: {
          providerUserId: "md-1",
          providerName: "Rajnil Shah",
          nurseUserId: "rn-1",
          nurseName: "Elizabeth Posada",
        },
      },
      dischargeSummaryJson: finalizedSummary("HOME"),
      patient: {
        id: "p1",
        firstName: "Jesenia",
        lastName: "Rodriguez",
        mrn: "MRN1",
      },
    };
    const census = buildHospitalCensusV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      encounters: [enc],
      placements: [],
      bedSummary: { bedsTotal: 4, bedsAvailable: 3, bedsOccupied: 1, bedsCleaning: 0, bedsBlocked: 0 },
    });
    expect(census.inpatientPatients[0]?.dischargeAwareness?.providerFinalized).toBe(true);
    expect(census.inpatientPatients[0]?.alerts.some((a) => a.code === "DISCHARGE_ORDER")).toBe(
      true
    );
    expect(census.operationalSnapshot.dischargeOrders).toBe(1);
    // Nursing/med-rec incomplete → not READY_DISCHARGE for ordinary path alone
    expect(census.operationalSnapshot.readyDischarge).toBe(0);
  });

  it("provider finalize keeps bed DISCHARGE_PENDING (occupied), never AVAILABLE", () => {
    const resolved = resolveBedOperationalStatus({
      occupant: {
        encounterId: "enc-1",
        workflowState: "IN_TREATMENT",
        providerDischargeFinalized: true,
      },
    });
    expect(resolved.status).toBe("DISCHARGE_PENDING");
    expect(resolved.status).not.toBe("AVAILABLE");

    const beds = composeUnitBedBoard({
      unitCode: "MS",
      overlays: new Map(),
      encounters: [
        {
          id: "enc-1",
          facilityId: "fac-1",
          roomLabel: "MS-3",
          status: "OPEN",
          type: "INPATIENT",
          workflowState: "IN_TREATMENT",
          dischargeSummaryJson: finalizedSummary("HOME"),
          patientFirstName: "Jehu",
          patientLastName: "Garcia",
        },
      ],
    });
    const ms3 = beds.find((b) => b.room === "3");
    expect(ms3?.status).toBe("DISCHARGE_PENDING");
    expect(ms3?.dischargeAwareness?.providerFinalized).toBe(true);
    expect(ms3?.occupantEncounterId).toBe("enc-1");
  });

  it("CLOSED encounter drops awareness", () => {
    expect(
      buildInpatientDischargeAwareness({
        dischargeSummaryJson: finalizedSummary("HOME"),
        encounterStatus: "CLOSED",
      })
    ).toBeNull();
  });
});
