/**
 * INP.DIS.1D — Nursing discharge execution contract tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildProviderDispositionSnapshot,
  detectProviderDispositionMismatch,
  emptyInpatientNursingDischarge,
  hydrateInpatientNursingDischarge,
  mergeInpatientNursingDischargeIntoDischargeSummary,
  projectInpatientNursingDischargeReadiness,
  validateInpatientNursingDischarge,
} from "./inpatientNursingDischargeInpDis1d.js";
import {
  emptyInpatientProviderDischarge,
  mergeInpatientProviderDischargePayload,
} from "./inpatientProviderDischargeInpDis1b.js";
import type { InpatientProviderDischargeV1C } from "./inpatientProviderDischargeInpDis1c.js";

function finalizedHomeProvider(): InpatientProviderDischargeV1C {
  return {
    ...emptyInpatientProviderDischarge(),
    schemaVersion: "INP.DIS.1C",
    dischargeDiagnoses: [
      { id: "1", description: "Pneumonia", isPrimary: true, sortOrder: 0 },
    ],
    hospitalCourse: "Improved",
    conditionAtDischarge: { status: "IMPROVED" },
    finalDisposition: { code: "HOME", labelSnapshot: "Home" },
    providerDocumentationFinalizedAt: "2026-08-28T10:00:00.000Z",
    documentedByUserId: "prov-1",
    revision: 2,
    patientInstructions: { returnPrecautions: "Fever", diagnosisInstructions: "Finish abx" },
  } as InpatientProviderDischargeV1C;
}

describe("INP.DIS.1D nursing discharge", () => {
  it("hydrates legacy 1A nursing shell safely", () => {
    const hydrated = hydrateInpatientNursingDischarge({
      destinationConfirmed: "HOME",
      departureAt: "2026-08-28T15:00:00.000Z",
      documentedByUserId: "rn-1",
      displayNameSnapshot: "RN A",
    });
    expect(hydrated?.departure?.departedAt).toBe("2026-08-28T15:00:00.000Z");
    expect(hydrated?.completedByUserId).toBe("rn-1");
    expect(hydrated?.destinationConfirmation?.destinationLabel).toBe("HOME");
  });

  it("HOME complete requires education, IV, belongings, departure", () => {
    const provider = finalizedHomeProvider();
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      providerDispositionSnapshot: buildProviderDispositionSnapshot(provider),
      education: {
        instructionsReviewed: true,
        medicationInstructionsReviewed: true,
        followUpReviewed: true,
        returnPrecautionsReviewed: true,
      },
      devices: { ivRemoved: true },
      belongings: { returned: true },
      departure: { departedAt: "2026-08-28T16:00:00.000Z", mode: "PRIVATE_VEHICLE" },
      transport: { mode: "PRIVATE_VEHICLE" },
    };
    expect(
      validateInpatientNursingDischarge({
        nursing,
        mode: "complete",
        provider,
        medReconComplete: true,
      }).ok
    ).toBe(true);
  });

  it("HOME cannot complete without provider finalize", () => {
    const provider = {
      ...finalizedHomeProvider(),
      providerDocumentationFinalizedAt: null,
    };
    const result = validateInpatientNursingDischarge({
      nursing: emptyInpatientNursingDischarge(),
      mode: "complete",
      provider,
      medReconComplete: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("PROVIDER_DISCHARGE_NOT_FINALIZED");
  });

  it("ELOPED skips ordinary education and requires elopement fields", () => {
    const provider = {
      ...finalizedHomeProvider(),
      finalDisposition: { code: "ELOPED", labelSnapshot: "Eloped" },
    };
    const incomplete = {
      ...emptyInpatientNursingDischarge(),
      providerDispositionSnapshot: buildProviderDispositionSnapshot(provider),
    };
    expect(
      validateInpatientNursingDischarge({
        nursing: incomplete,
        mode: "complete",
        provider,
        medReconComplete: null,
      }).ok
    ).toBe(false);

    const complete = {
      ...incomplete,
      eloped: {
        discoveredAt: "2026-08-28T12:00:00.000Z",
        lastKnownAt: "2026-08-28T11:50:00.000Z",
        providerNotified: true,
        securityNotified: true,
      },
    };
    expect(
      validateInpatientNursingDischarge({
        nursing: complete,
        mode: "complete",
        provider,
        medReconComplete: null,
      }).ok
    ).toBe(true);
  });

  it("DECEASED requires body destination not home education", () => {
    const provider = {
      ...finalizedHomeProvider(),
      finalDisposition: { code: "DECEASED", labelSnapshot: "Deceased" },
    };
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      providerDispositionSnapshot: buildProviderDispositionSnapshot(provider),
      deceased: {
        bodyDestination: "MORGUE" as const,
        identificationCompleted: true,
        transferredAt: "2026-08-28T18:00:00.000Z",
      },
    };
    expect(
      validateInpatientNursingDischarge({
        nursing,
        mode: "complete",
        provider,
        medReconComplete: null,
      }).ok
    ).toBe(true);
  });

  it("material provider disposition change is detected", () => {
    const provider = finalizedHomeProvider();
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      providerDispositionSnapshot: {
        code: "HOME",
        providerFinalizedAt: "2026-08-28T10:00:00.000Z",
        providerRevision: 2,
      },
    };
    const changed = {
      ...provider,
      finalDisposition: { code: "SKILLED_NURSING_FACILITY", labelSnapshot: "SNF" },
    };
    expect(
      detectProviderDispositionMismatch({ nursing, provider: changed })?.detected
    ).toBe(true);
    const result = validateInpatientNursingDischarge({
      nursing,
      mode: "complete",
      provider: changed,
      medReconComplete: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("PROVIDER_DISPOSITION_MISMATCH");
  });

  it("merge preserves unrelated namespaces and does not close encounter fields", () => {
    const provider = finalizedHomeProvider();
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      executionStatus: "COMPLETED" as const,
      education: {
        instructionsReviewed: true,
        medicationInstructionsReviewed: true,
        followUpReviewed: true,
        returnPrecautionsReviewed: true,
      },
      departure: { departedAt: "2026-08-28T16:00:00.000Z" },
      completedAt: "2026-08-28T16:05:00.000Z",
      completedByDisplayNameSnapshot: "RN Test",
    };
    const merged = mergeInpatientNursingDischargeIntoDischargeSummary(
      {
        inpatientProviderDischarge: provider,
        inpatientMedRecon: { finalizedAt: "2026-08-28T09:00:00.000Z" },
        customKey: "kept",
      },
      nursing,
      provider
    );
    expect(merged.customKey).toBe("kept");
    expect(merged.inpatientMedRecon).toEqual({ finalizedAt: "2026-08-28T09:00:00.000Z" });
    expect(merged.patientInstructionsGiven).toBe(true);
    expect(merged.nursingDepartureAt).toBe("2026-08-28T16:00:00.000Z");
    expect(merged).not.toHaveProperty("encounterStatus");
  });

  it("readiness marks provider disposition blocked when not finalized", () => {
    const provider = mergeInpatientProviderDischargePayload(null, {
      finalDisposition: { code: "HOME" },
    }) as InpatientProviderDischargeV1C;
    const chips = projectInpatientNursingDischargeReadiness({
      nursing: emptyInpatientNursingDischarge(),
      provider,
      medReconComplete: true,
      instructionsAvailable: true,
    });
    expect(chips.find((c) => c.id === "providerDisposition")?.status).toBe("blocked");
  });

  it("TRANSFER requires handoff report and departure", () => {
    const provider = {
      ...finalizedHomeProvider(),
      finalDisposition: {
        code: "TRANSFER_ACUTE_CARE",
        labelSnapshot: "Transfer",
        transfer: { receivingHospital: "Baylor" },
      },
    };
    const nursing = {
      ...emptyInpatientNursingDischarge(),
      providerDispositionSnapshot: buildProviderDispositionSnapshot(provider),
      handoff: { reportCalled: true, reportGivenTo: "RN Receiving" },
      departure: { departedAt: "2026-08-28T17:00:00.000Z" },
      transport: { mode: "ALS" },
    };
    expect(
      validateInpatientNursingDischarge({
        nursing,
        mode: "complete",
        provider,
        medReconComplete: true,
      }).ok
    ).toBe(true);
  });
});
