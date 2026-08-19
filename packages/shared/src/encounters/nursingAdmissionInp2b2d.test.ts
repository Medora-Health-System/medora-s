import { describe, expect, it } from "vitest";
import { emptyMedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { INPATIENT_ADMISSION_CLINICAL_SECTIONS } from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  inpatientMarMountsMedicationReconciliation,
  nursingAdmissionEngineDependsOnFacilityId,
  nursingAdmissionHomeMedSearchMinChars,
  nursingAdmissionHomeMedUpdateCreatesOrderOrMar,
  nursingAdmissionPreloadActionIsSelected,
  reviewCompletePatchForDomain,
} from "./nursingAdmissionPreloadVerificationInp2b2d.js";
import {
  applyStage6ProjectionAnswers,
  nursingAdmissionMayCompleteAndSign,
  nursingAdmissionPriorNineteenResolved,
  projectNursingAdmissionStage6,
} from "./nursingAdmissionStage6ProjectionInp2b2d.js";
import { applyNurseAdmissionSignature, computeAdmissionCompletionSummary } from "./medSurgNursingAdmissionD4a1.js";
import { emptyInpatientClinicalOpsV1 } from "./inpatientClinicalOpsV1.js";

const FACILITY_A = "facility-a-en-locale";
const FACILITY_B = "facility-b-fr-locale";
const PRODUCTION_UAT_FACILITY = "90395a66-20d0-4165-aa76-e37ba3d520ed";

function completeNineteen(facilityId: string) {
  const doc = emptyMedSurgNursingAdmissionDocV1({
    patientId: "patient-shared",
    facilityId,
    encounterId: "encounter-shared",
  });
  for (const id of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
    if (id === "PROVIDER_ADMISSION") continue;
    doc.sections[id] = {
      ...doc.sections[id]!,
      completionState: "COMPLETE",
      answers: id === "HOME_MEDICATIONS" ? { reconComplete: "YES" } : { reviewed: "YES" },
    };
  }
  doc.sections.NURSING_ADMISSION_ASSESSMENT = {
    ...doc.sections.NURSING_ADMISSION_ASSESSMENT!,
    completionState: "COMPLETE",
    answers: { providerNotified: "YES" },
  };
  return doc;
}

describe("MEDUI.INP.2B.2D preload + Stage 6 convergence", () => {
  it("selects sticky actions only after persisted verifiedAt (reload durable)", () => {
    expect(
      nursingAdmissionPreloadActionIsSelected({
        verificationStatus: "UNKNOWN",
        verifiedAt: null,
        action: "UNKNOWN",
      })
    ).toBe(false);
    expect(
      nursingAdmissionPreloadActionIsSelected({
        verificationStatus: "CONFIRMED",
        verifiedAt: "2026-08-19T12:00:00.000Z",
        action: "CONFIRMED",
      })
    ).toBe(true);
    expect(
      nursingAdmissionPreloadActionIsSelected({
        verificationStatus: "UNKNOWN",
        verifiedAt: "2026-08-19T12:00:00.000Z",
        action: "UNKNOWN",
      })
    ).toBe(true);
  });

  it("maps Confirm / Unknown / Unable for social domains without a second social store", () => {
    expect(reviewCompletePatchForDomain("SMOKING", "CONFIRMED")).toMatchObject({
      smokingVerificationAction: "CONFIRMED",
      socialReviewComplete: "YES",
    });
    expect(reviewCompletePatchForDomain("ALCOHOL", "UNKNOWN")).toMatchObject({
      alcoholVerificationAction: "UNKNOWN",
    });
    expect(reviewCompletePatchForDomain("RECREATIONAL_DRUGS", "UNABLE_TO_VERIFY")).toMatchObject({
      recreationalVerificationAction: "UNABLE_TO_VERIFY",
    });
  });

  it("does not depend on a production facility ID", () => {
    expect(nursingAdmissionEngineDependsOnFacilityId()).toBe(false);
    expect(inpatientMarMountsMedicationReconciliation()).toBe(false);
    expect(nursingAdmissionHomeMedSearchMinChars()).toBe(3);
    expect(nursingAdmissionHomeMedUpdateCreatesOrderOrMar()).toBe(false);
    const a = projectNursingAdmissionStage6({
      doc: completeNineteen(FACILITY_A),
      ops: emptyInpatientClinicalOpsV1(),
      orders: [],
    });
    const b = projectNursingAdmissionStage6({
      doc: completeNineteen(FACILITY_B),
      ops: emptyInpatientClinicalOpsV1(),
      orders: [],
    });
    expect(a.answers).toEqual(b.answers);
    expect(a.providerHpRequired).toBe(false);
    expect(JSON.stringify(a)).not.toContain(PRODUCTION_UAT_FACILITY);
  });

  it("projects Stage 6 from existing engines and unblocks 19→20 without provider H&P", () => {
    const doc = completeNineteen(FACILITY_A);
    expect(nursingAdmissionPriorNineteenResolved(doc)).toBe(true);
    expect(computeAdmissionCompletionSummary(doc).resolved).toBe(19);
    const orders = [
      {
        id: "order-1",
        encounterId: doc.encounterId,
        type: "MEDICATION",
        status: "ACTIVE",
        items: [{ id: "item-1", status: "ACTIVE", catalogItemType: "MEDICATION" }],
      },
    ];
    const ops = emptyInpatientClinicalOpsV1();
    ops.codeStatus = {
      status: "FULL_CODE",
      effectiveAt: "2026-08-19T12:00:00.000Z",
      documentedByUserId: "rn-1",
    };
    const projection = projectNursingAdmissionStage6({ doc, ops, orders });
    expect(projection.answers.admissionOrdersPresent).toBe("YES");
    expect(projection.answers.codeStatusConfirmed).toBe("YES");
    expect(projection.answers.medReconStatus).toBe("COMPLETE");
    expect(projection.answers.handoffStatus).toBe("PROVIDER_NOTIFIED");
    expect(projection.answers.handoffStatus).not.toBe("HP_COMPLETE");
    expect(projection.answers.handoffStatus).not.toBe("ORDERS_PENDING");
    expect(projection.nursingResponsibilitiesSatisfied).toBe(true);
    expect(projection.providerHpRequired).toBe(false);
    const ready = applyStage6ProjectionAnswers(doc, projection);
    expect(computeAdmissionCompletionSummary(ready).resolved).toBe(20);
    expect(nursingAdmissionMayCompleteAndSign({ doc, ops, orders })).toBe(true);
    const signed = applyNurseAdmissionSignature({
      doc: ready,
      actorUserId: "rn-1",
      credentials: "RN",
      displayName: "Nurse",
      clientExpectedVersion: ready.expectedVersion,
    });
    expect(signed.ok).toBe(true);
  });

  it("does not complete Stage 6 from ORDERS_PENDING fallback or recon rows alone", () => {
    const doc = completeNineteen(FACILITY_A);
    doc.sections.NURSING_ADMISSION_ASSESSMENT = {
      ...doc.sections.NURSING_ADMISSION_ASSESSMENT!,
      completionState: "COMPLETE",
      answers: {},
    };
    doc.sections.HOME_MEDICATIONS = {
      ...doc.sections.HOME_MEDICATIONS!,
      completionState: "COMPLETE",
      answers: { reconComplete: "NO" },
    };
    const ops = emptyInpatientClinicalOpsV1();
    ops.medicationReconciliation = [
      {
        lineId: "line-1",
        sourceLabel: "lisinopril",
        decision: "CONTINUE",
        actorUserId: "rn-1",
        decidedAt: "2026-08-19T12:00:00.000Z",
      },
    ];
    const orders = [
      {
        id: "order-1",
        encounterId: doc.encounterId,
        type: "MEDICATION",
        status: "ACTIVE",
        items: [{ id: "item-1", status: "ACTIVE", catalogItemType: "MEDICATION" }],
      },
    ];
    const projection = projectNursingAdmissionStage6({ doc, ops, orders });
    expect(projection.answers.providerNotifiedOfArrival).toBe("UNKNOWN");
    expect(projection.answers.admissionOrdersPresent).toBe("YES");
    expect(projection.answers.handoffStatus).toBe("ORDERS_PENDING");
    expect(projection.handoffIsPendingProjection).toBe(true);
    expect(projection.answers.medReconStatus).toBe("IN_PROGRESS");
    expect(projection.nursingResponsibilitiesSatisfied).toBe(false);
    expect(nursingAdmissionMayCompleteAndSign({ doc, ops, orders })).toBe(false);
  });

  it("home-med update contract never creates orders or MAR doses", () => {
    expect(nursingAdmissionHomeMedUpdateCreatesOrderOrMar()).toBe(false);
  });
});
