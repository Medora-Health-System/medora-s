/**
 * INP.DIS.1J — Discharge board operational completion (planning READY, effective med rec).
 */

import { describe, expect, it } from "vitest";
import {
  allRequiredMedReconDecisionsComplete,
  buildInpatientDischargeMedReconPreload,
  demoteInpatientDischargePlanningWorkflowAfterEdit,
  emptyInpatientClinicalOpsV1,
  emptyInpatientNursingDischarge,
  emptyInpatientProviderDischarge,
  isInpatientDischargePlanningOperationallyReady,
  isInpatientMedReconEffectivelyComplete,
  isMedReconCompleteInSummary,
  mergeInpatientClinicalOpsIntoAdmissionSummary,
  mergeSavedMedReconWithCurrentProviderPlan,
  nursingRequiresMedRecon,
  projectInpatientDischargePlanningSummary,
  projectInpatientFinalDischargeReadiness,
  readInpatientClinicalOpsFromAdmissionSummary,
  summarizeMedReconWorkspace,
  validateInpatientDischargePlanningReady,
  validateInpatientNursingDischarge,
  type InpatientDischargeMedReconLineV1,
  type InpatientProviderDischargeV1C,
} from "../index.js";

function continuedHomeLine(
  overrides?: Partial<InpatientDischargeMedReconLineV1>
): InpatientDischargeMedReconLineV1 {
  return {
    id: "saved-los",
    sourceLabel: "Losartan 50 mg",
    medicationName: "Losartan",
    source: "HOME_MEDICATION",
    rowKind: "PROVIDER_CONTINUE",
    homeRegimen: "50 mg PO daily",
    dischargeRegimen: "50 mg PO daily",
    providerPlanRelationship: "CONTINUE",
    providerPlanSummary: "50 mg PO daily",
    decision: "CONTINUE",
    reason: null,
    ...overrides,
  };
}

describe("INP.DIS.1J discharge planning persistence and READY", () => {
  it("save planning persists canonical fields and reload restores them", () => {
    const ops = emptyInpatientClinicalOpsV1();
    ops.dischargePlanning = {
      destination: "HOME",
      transportation: "PRIVATE_VEHICLE",
      homeHealth: "None",
      specialNeedsEquipment: "None",
      careTeamNotified: false,
      barriers: null,
      anticipatedDischargeDate: "2026-09-01",
      workflowState: "PLANNING",
      updatedAt: "2026-08-30T12:00:00.000Z",
    };
    const admission = mergeInpatientClinicalOpsIntoAdmissionSummary({}, ops);
    expect(admission.inpatientClinicalOpsV1).toBeDefined();

    const reloaded = readInpatientClinicalOpsFromAdmissionSummary(admission);
    expect(reloaded.dischargePlanning?.destination).toBe("HOME");
    expect(reloaded.dischargePlanning?.transportation).toBe("PRIVATE_VEHICLE");
    expect(reloaded.dischargePlanning?.homeHealth).toBe("None");
    expect(reloaded.dischargePlanning?.specialNeedsEquipment).toBe("None");
    expect(reloaded.dischargePlanning?.careTeamNotified).toBe(false);
    expect(reloaded.dischargePlanning?.workflowState).toBe("PLANNING");
  });

  it("does not infer READY from non-empty planning text", () => {
    const summary = projectInpatientDischargePlanningSummary({
      ops: {
        version: 1,
        dischargePlanning: {
          destination: "HOME",
          transportation: "PRIVATE_VEHICLE",
          homeHealth: "None",
          specialNeedsEquipment: "None",
          careTeamNotified: false,
          workflowState: "PLANNING",
          updatedAt: "2026-08-30T12:00:00.000Z",
        },
      },
    });
    expect(summary.workflowState).toBe("PLANNING");
    expect(
      isInpatientDischargePlanningOperationallyReady({
        workflowState: summary.workflowState,
        dirty: false,
      })
    ).toBe(false);
    expect(
      validateInpatientDischargePlanningReady({
        destination: "HOME",
        transportation: "PRIVATE_VEHICLE",
        homeHealth: "None",
      }).ok
    ).toBe(true);
  });

  it("READY persists on reload and is not a second lifecycle path", () => {
    const ops = emptyInpatientClinicalOpsV1();
    ops.dischargePlanning = {
      destination: "HOME",
      transportation: "PRIVATE_VEHICLE",
      homeHealth: "None",
      specialNeedsEquipment: "None",
      careTeamNotified: false,
      workflowState: "READY",
      updatedAt: "2026-08-30T12:00:00.000Z",
    };
    const reloaded = readInpatientClinicalOpsFromAdmissionSummary(
      mergeInpatientClinicalOpsIntoAdmissionSummary({}, ops)
    );
    expect(reloaded.dischargePlanning?.workflowState).toBe("READY");
    expect(
      isInpatientDischargePlanningOperationallyReady({
        workflowState: reloaded.dischargePlanning?.workflowState,
        dirty: false,
      })
    ).toBe(true);
  });

  it("editing READY planning demotes to PLANNING until re-confirmed", () => {
    expect(demoteInpatientDischargePlanningWorkflowAfterEdit("READY")).toBe("PLANNING");
    expect(demoteInpatientDischargePlanningWorkflowAfterEdit("COMPLETED")).toBe("PLANNING");
    expect(demoteInpatientDischargePlanningWorkflowAfterEdit("PLANNING")).toBe("PLANNING");
    expect(
      isInpatientDischargePlanningOperationallyReady({
        workflowState: "READY",
        dirty: true,
      })
    ).toBe(false);
  });

  it("requires destination and applicable transport/home health; never auto-notifies care team", () => {
    expect(
      validateInpatientDischargePlanningReady({
        destination: "",
        transportation: "PRIVATE_VEHICLE",
        careTeamNotified: false,
      }).ok
    ).toBe(false);
    expect(
      validateInpatientDischargePlanningReady({
        destination: "HOME",
        transportation: "",
        careTeamNotified: false,
      })
    ).toEqual({ ok: false, errors: ["PLANNING_TRANSPORT_REQUIRED"] });
    expect(
      validateInpatientDischargePlanningReady({
        destination: "HOME_WITH_HOME_HEALTH",
        transportation: "PRIVATE_VEHICLE",
        homeHealth: "",
        careTeamNotified: false,
      })
    ).toEqual({ ok: false, errors: ["PLANNING_HOME_HEALTH_REQUIRED"] });
    expect(
      validateInpatientDischargePlanningReady({
        destination: "ELOPED",
        transportation: "",
        careTeamNotified: false,
      }).ok
    ).toBe(true);
    const ready = validateInpatientDischargePlanningReady({
      destination: "HOME",
      transportation: "PRIVATE_VEHICLE",
      careTeamNotified: false,
    });
    expect(ready.ok).toBe(true);
  });

  it("planning READY is separate from provider final disposition", () => {
    const summary = projectInpatientDischargePlanningSummary({
      ops: {
        version: 1,
        dischargePlanning: {
          destination: "HOME",
          workflowState: "READY",
          transportation: "PRIVATE_VEHICLE",
          updatedAt: "2026-08-30T12:00:00.000Z",
        },
      },
      providerDispositionCode: "SKILLED_NURSING_FACILITY",
    });
    expect(summary.workflowState).toBe("READY");
    expect(summary.differsFromProviderDisposition).toBe(true);
  });
});

describe("INP.DIS.1J effective medication reconciliation", () => {
  it("finalized + all lines complete remains effectively complete", () => {
    const lines = [continuedHomeLine()];
    expect(allRequiredMedReconDecisionsComplete(lines)).toBe(true);
    expect(
      isInpatientMedReconEffectivelyComplete({ storedComplete: true, lines })
    ).toBe(true);
    expect(
      isMedReconCompleteInSummary({
        inpatientMedRecon: {
          finalizedAt: "2026-08-30T10:00:00.000Z",
          lines,
        },
      })
    ).toBe(true);
  });

  it("stale COMPLETE + unresolved current line is not effectively complete", () => {
    const lines = [continuedHomeLine({ decision: "UNABLE_TO_VERIFY" })];
    expect(
      isInpatientMedReconEffectivelyComplete({ storedComplete: true, lines })
    ).toBe(false);
    expect(summarizeMedReconWorkspace(lines).needsReview).toBe(1);
    expect(
      isMedReconCompleteInSummary({
        inpatientMedRecon: {
          finalizedAt: "2026-08-30T10:00:00.000Z",
          lines,
        },
      })
    ).toBe(false);
  });

  it("provider NEW medication after prior finalize reopens review", () => {
    const merged = mergeSavedMedReconWithCurrentProviderPlan({
      savedLines: [continuedHomeLine()],
      providerDischargeMedications: [
        {
          id: "p-los",
          displayName: "Losartan",
          dose: "50",
          unit: "mg",
          route: "PO",
          frequency: "daily",
          relationship: "CONTINUE",
        },
        {
          id: "p-new",
          displayName: "Amlodipine",
          dose: "5",
          unit: "mg",
          relationship: "NEW",
        },
      ],
    });
    const byName = Object.fromEntries(merged.map((l) => [l.medicationName, l]));
    expect(byName.Losartan?.decision).toBe("CONTINUE");
    expect(byName.Amlodipine?.rowKind).toBe("PROVIDER_NEW");
    expect(byName.Amlodipine?.decision).toBe("UNABLE_TO_VERIFY");
    expect(isInpatientMedReconEffectivelyComplete({ storedComplete: true, lines: merged })).toBe(
      false
    );
  });

  it("provider CHANGED medication after prior finalize reopens review", () => {
    const merged = mergeSavedMedReconWithCurrentProviderPlan({
      savedLines: [continuedHomeLine()],
      providerDischargeMedications: [
        {
          id: "p-los",
          displayName: "Losartan",
          dose: "100",
          unit: "mg",
          route: "PO",
          frequency: "daily",
          relationship: "CHANGE",
        },
      ],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0]!.rowKind).toBe("PROVIDER_CHANGED");
    expect(merged[0]!.decision).toBe("UNABLE_TO_VERIFY");
  });

  it("provider STOP after prior finalize reopens review", () => {
    const merged = mergeSavedMedReconWithCurrentProviderPlan({
      savedLines: [continuedHomeLine()],
      providerDischargeMedications: [
        {
          id: "p-los",
          displayName: "Losartan",
          relationship: "STOP",
        },
      ],
    });
    expect(merged[0]!.rowKind).toBe("PROVIDER_STOP");
    expect(merged[0]!.decision).toBe("UNABLE_TO_VERIFY");
  });

  it("preload merge + Continue/Stop/Edit decisions can re-finalize", () => {
    const preload = buildInpatientDischargeMedReconPreload({
      existingDischargeReconLines: [continuedHomeLine()],
      providerDischargeMedications: [
        {
          id: "p-los",
          displayName: "Losartan",
          relationship: "STOP",
        },
        {
          id: "p-new",
          displayName: "Amlodipine",
          relationship: "NEW",
        },
      ],
    });
    expect(preload.usedExistingDischargeRecon).toBe(true);
    expect(allRequiredMedReconDecisionsComplete(preload.lines)).toBe(false);
    const decided = preload.lines.map((l) => {
      if (l.rowKind === "PROVIDER_STOP") return { ...l, decision: "DISCONTINUE" as const };
      if (l.rowKind === "PROVIDER_NEW") return { ...l, decision: "CONTINUE" as const };
      if (l.rowKind === "PROVIDER_CHANGED") return { ...l, decision: "MODIFY" as const };
      return { ...l, decision: "CONTINUE" as const };
    });
    expect(summarizeMedReconWorkspace(decided).needsReview).toBe(0);
    expect(allRequiredMedReconDecisionsComplete(decided)).toBe(true);
    expect(
      isInpatientMedReconEffectivelyComplete({ storedComplete: true, lines: decided })
    ).toBe(true);
  });

  it("unresolved required meds block HOME nursing complete; ELOPED/DECEASED stay exempt", () => {
    const providerHome = {
      ...emptyInpatientProviderDischarge(),
      schemaVersion: "INP.DIS.1C",
      finalDisposition: { code: "HOME", labelSnapshot: "Home" },
      providerDocumentationFinalizedAt: "2026-08-30T10:00:00.000Z",
    } as InpatientProviderDischargeV1C;
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      education: {
        instructionsReviewed: true,
        medicationInstructionsReviewed: true,
        followUpReviewed: true,
        returnPrecautionsReviewed: true,
      },
      devices: { ivRemoved: true },
      belongings: { returned: true },
      departure: { departedAt: "2026-08-30T16:00:00.000Z" },
    };
    const blocked = validateInpatientNursingDischarge({
      nursing,
      mode: "complete",
      provider: providerHome,
      medReconComplete: isMedReconCompleteInSummary({
        inpatientProviderDischarge: providerHome,
        inpatientMedRecon: {
          finalizedAt: "2026-08-30T09:00:00.000Z",
          lines: [continuedHomeLine({ decision: "UNABLE_TO_VERIFY" })],
        },
      }),
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.errors).toContain("MEDICATION_RECONCILIATION_INCOMPLETE");
    }

    expect(nursingRequiresMedRecon("ELOPED")).toBe(false);
    expect(nursingRequiresMedRecon("DECEASED")).toBe(false);
    expect(nursingRequiresMedRecon("HOME")).toBe(true);

    const elopedReadiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: {
        inpatientProviderDischarge: {
          ...emptyInpatientProviderDischarge(),
          schemaVersion: "INP.DIS.1C",
          revision: 1,
          finalDisposition: { code: "ELOPED", labelSnapshot: "Eloped" },
          providerDocumentationFinalizedAt: "2026-08-30T10:00:00.000Z",
        },
        inpatientNursingDischarge: {
          ...emptyInpatientNursingDischarge(),
          revision: 1,
          executionStatus: "COMPLETED",
          completedAt: "2026-08-30T12:00:00.000Z",
          providerDispositionSnapshot: { code: "ELOPED", providerRevision: 1 },
          eloped: {
            discoveredAt: "2026-08-30T11:00:00.000Z",
            providerNotified: true,
            securityNotified: true,
          },
        },
        inpatientMedRecon: {
          finalizedAt: "2026-08-30T09:00:00.000Z",
          lines: [continuedHomeLine({ decision: "UNABLE_TO_VERIFY" })],
        },
      },
      encounterStatus: "OPEN",
    });
    expect(elopedReadiness.medicationReconciliation).toBe("not_applicable");
    expect(elopedReadiness.blockers.map((b) => b.code)).not.toContain(
      "MEDICATION_RECONCILIATION_INCOMPLETE"
    );
  });
});

describe("INP.DIS.1J planning does not own 1E close", () => {
  it("HOME final discharge still ready when planning remains PLANNING", () => {
    const provider = {
      ...emptyInpatientProviderDischarge(),
      schemaVersion: "INP.DIS.1C" as const,
      revision: 3,
      dischargeDiagnoses: [{ id: "1", description: "PNA", isPrimary: true, sortOrder: 0 }],
      hospitalCourse: "Improved",
      conditionAtDischarge: { status: "IMPROVED" as const },
      finalDisposition: { code: "HOME" as const, labelSnapshot: "HOME" },
      providerDocumentationFinalizedAt: "2026-08-28T10:00:00.000Z",
      documentedByUserId: "prov-1",
      patientInstructions: { returnPrecautions: "Fever", diagnosisInstructions: "Abx" },
    };
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      revision: 2,
      executionStatus: "COMPLETED" as const,
      completedAt: "2026-08-28T14:00:00.000Z",
      completedByUserId: "rn-1",
      providerDispositionSnapshot: {
        code: "HOME",
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
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: {
        inpatientProviderDischarge: provider,
        inpatientNursingDischarge: nursing,
        inpatientMedRecon: {
          finalizedAt: "2026-08-28T09:00:00.000Z",
          lines: [continuedHomeLine()],
        },
      },
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.projectedLifecycleStatus).toBe("DISCHARGED");
  });
});
