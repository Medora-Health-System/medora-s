/**
 * INP.DIS.1E — Final discharge readiness + clinical ELOPED identity tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildInpatientFinalDischargeRecord,
  isClinicallyEloped,
  mapDetailedDispositionToCoarseDischargeStatus,
  mergeInpatientFinalDischargeIntoDischargeSummary,
  projectInpatientFinalDischargeReadiness,
  resolveDetailedClinicalDisposition,
} from "./inpatientFinalDischargeInpDis1e.js";
import { emptyInpatientProviderDischarge } from "./inpatientProviderDischargeInpDis1b.js";
import { emptyInpatientNursingDischarge } from "./inpatientNursingDischargeInpDis1d.js";
import { mapInpatientDispositionToLifecycleStatus } from "./inpatientProviderDischargeInpDis1c.js";

function homeSummary(overrides?: {
  medRecon?: boolean;
  nursingComplete?: boolean;
  providerFinalized?: boolean;
  disposition?: string;
}) {
  const disposition = overrides?.disposition ?? "HOME";
  const provider = {
    ...emptyInpatientProviderDischarge(),
    schemaVersion: "INP.DIS.1C" as const,
    revision: 3,
    dischargeDiagnoses: [{ id: "1", description: "PNA", isPrimary: true, sortOrder: 0 }],
    hospitalCourse: "Improved",
    conditionAtDischarge: { status: "IMPROVED" as const },
    finalDisposition: { code: disposition as never, labelSnapshot: disposition },
    providerDocumentationFinalizedAt:
      overrides?.providerFinalized === false ? null : "2026-08-28T10:00:00.000Z",
    documentedByUserId: "prov-1",
    patientInstructions: { returnPrecautions: "Fever", diagnosisInstructions: "Abx" },
  };
  const nursing = {
    ...emptyInpatientNursingDischarge(),
    revision: 2,
    executionStatus: (overrides?.nursingComplete === false ? "IN_PROGRESS" : "COMPLETED") as const,
    completedAt: overrides?.nursingComplete === false ? null : "2026-08-28T14:00:00.000Z",
    completedByUserId: "rn-1",
    providerDispositionSnapshot: {
      code: disposition,
      providerFinalizedAt: provider.providerDocumentationFinalizedAt,
      providerRevision: 3,
    },
    education: {
      instructionsReviewed: true,
      medicationInstructionsReviewed: true,
      followUpReviewed: true,
      returnPrecautionsReviewed: true,
    },
    devices: { ivRemoved: true },
    belongings: { returned: true },
    departure: { departedAt: "2026-08-28T14:10:00.000Z", mode: "PRIVATE_VEHICLE" },
    transport: { mode: "PRIVATE_VEHICLE" },
  };
  return {
    inpatientProviderDischarge: provider,
    inpatientNursingDischarge: nursing,
    inpatientMedRecon:
      overrides?.medRecon === false
        ? { lines: [{ id: "1" }] }
        : { finalizedAt: "2026-08-28T09:00:00.000Z", lines: [{ id: "1" }] },
  };
}

describe("INP.DIS.1E final discharge readiness", () => {
  it("HOME ready when provider, med recon, nursing, departure complete", () => {
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: homeSummary(),
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.projectedLifecycleStatus).toBe("DISCHARGED");
    expect(readiness.detailedDispositionCode).toBe("HOME");
  });

  it("blocks HOME when med recon incomplete", () => {
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: homeSummary({ medRecon: false }),
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((b) => b.code)).toContain(
      "MEDICATION_RECONCILIATION_INCOMPLETE"
    );
  });

  it("blocks HOME when nursing incomplete", () => {
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: homeSummary({ nursingComplete: false }),
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((b) => b.code)).toContain("NURSING_DISCHARGE_INCOMPLETE");
  });

  it("blocks when provider not finalized", () => {
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: homeSummary({ providerFinalized: false }),
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map((b) => b.code)).toContain("PROVIDER_DISCHARGE_NOT_FINALIZED");
  });

  it("SNF / transfer map to TRANSFERRED; ASSISTED_LIVING and HOSPICE too", () => {
    expect(mapInpatientDispositionToLifecycleStatus("SKILLED_NURSING_FACILITY")).toBe(
      "TRANSFERRED"
    );
    expect(mapInpatientDispositionToLifecycleStatus("TRANSFER_ACUTE_CARE")).toBe("TRANSFERRED");
    expect(mapInpatientDispositionToLifecycleStatus("BEHAVIORAL_HEALTH_FACILITY")).toBe(
      "TRANSFERRED"
    );
    expect(mapInpatientDispositionToLifecycleStatus("ASSISTED_LIVING")).toBe("TRANSFERRED");
    expect(mapInpatientDispositionToLifecycleStatus("HOSPICE")).toBe("TRANSFERRED");
  });

  it("ELOPED coarse maps to AMA but clinical identity remains ELOPED", () => {
    expect(mapDetailedDispositionToCoarseDischargeStatus("ELOPED")).toBe("AMA");
    expect(resolveDetailedClinicalDisposition("ELOPED")).toBe("ELOPED");
    expect(isClinicallyEloped("ELOPED")).toBe(true);
    expect(isClinicallyEloped("AGAINST_MEDICAL_ADVICE")).toBe(false);

    const nursing = {
      ...emptyInpatientNursingDischarge(),
      revision: 1,
      executionStatus: "COMPLETED" as const,
      completedAt: "2026-08-28T12:00:00.000Z",
      providerDispositionSnapshot: { code: "ELOPED", providerRevision: 1 },
      eloped: {
        discoveredAt: "2026-08-28T11:00:00.000Z",
        providerNotified: true,
        securityNotified: true,
      },
    };
    const provider = {
      ...emptyInpatientProviderDischarge(),
      schemaVersion: "INP.DIS.1C" as const,
      revision: 1,
      finalDisposition: { code: "ELOPED" as const, labelSnapshot: "Eloped" },
      providerDocumentationFinalizedAt: "2026-08-28T10:30:00.000Z",
    };
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: {
        inpatientProviderDischarge: provider,
        inpatientNursingDischarge: nursing,
      },
      encounterStatus: "OPEN",
    });
    expect(readiness.medicationReconciliation).toBe("not_applicable");
    expect(readiness.detailedDispositionCode).toBe("ELOPED");
    expect(readiness.projectedLifecycleStatus).toBe("AMA");
    expect(readiness.blockers.map((b) => b.code)).not.toContain(
      "MEDICATION_RECONCILIATION_INCOMPLETE"
    );

    const record = buildInpatientFinalDischargeRecord({
      readiness,
      actorUserId: "rn-1",
      displayNameSnapshot: "RN A",
    });
    expect(record.clinicalDispositionCode).toBe("ELOPED");
    expect(record.lifecycleStatus).toBe("AMA");
    const merged = mergeInpatientFinalDischargeIntoDischargeSummary({}, record);
    expect(merged.clinicalDispositionCode).toBe("ELOPED");
    expect(merged.dischargeStatusMapped).toBe("AMA");
    expect(isClinicallyEloped(String(merged.clinicalDispositionCode))).toBe(true);
  });

  it("DECEASED does not require med recon", () => {
    const provider = {
      ...emptyInpatientProviderDischarge(),
      schemaVersion: "INP.DIS.1C" as const,
      revision: 1,
      finalDisposition: {
        code: "DECEASED" as const,
        deceased: { pronouncedAt: "2026-08-28T09:00:00.000Z" },
      },
      providerDocumentationFinalizedAt: "2026-08-28T09:05:00.000Z",
    };
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      revision: 1,
      executionStatus: "COMPLETED" as const,
      completedAt: "2026-08-28T10:00:00.000Z",
      providerDispositionSnapshot: { code: "DECEASED", providerRevision: 1 },
      deceased: { bodyDestination: "MORGUE" as const, identificationCompleted: true },
    };
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: {
        inpatientProviderDischarge: provider,
        inpatientNursingDischarge: nursing,
      },
      encounterStatus: "OPEN",
    });
    expect(readiness.medicationReconciliation).toBe("not_applicable");
    expect(readiness.projectedLifecycleStatus).toBe("DECEASED");
    expect(readiness.blockers.map((b) => b.code)).not.toContain(
      "MEDICATION_RECONCILIATION_INCOMPLETE"
    );
  });
});
