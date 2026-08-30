/**
 * INP.DIS.1G.1 — Med-recon preload, fast pairing, print, longitudinal projection, HH gate.
 */

import { describe, expect, it } from "vitest";
import {
  allRequiredMedReconDecisionsComplete,
  buildInpatientDischargeMedReconPreload,
  buildPairedInpatientDischargeMedReconLines,
  canBulkContinueMedReconLine,
  collectInpatientDischargeMedicationPrintFacts,
  emptyInpatientNursingDischarge,
  emptyInpatientProviderDischarge,
  formatInpatientDischargeMedicationPrintLine,
  hydrateInpatientProviderDischarge1C,
  mergeInpatientProviderDischargeIntoDischargeSummary1C,
  projectInpatientFinalDischargeReadiness,
  projectPostDischargeHomeMedicationsFromRecon,
  summarizeMedReconWorkspace,
  validateInpatientNursingDischarge,
  validateInpatientProviderDischarge1C,
  type InpatientDischargeMedicationLine1C,
  type InpatientDischargeMedReconLineV1,
  type InpatientProviderDischargeV1C,
} from "../index.js";

describe("INP.DIS.1G.1 discharge med-recon preload", () => {
  it("prefers saved discharge recon decisions and merges new provider medications", () => {
    const result = buildInpatientDischargeMedReconPreload({
      existingDischargeReconLines: [
        {
          id: "saved-1",
          medicationName: "Metformin",
          sourceLabel: "Metformin 500 mg",
          source: "HOME_MEDICATION",
          decision: "CONTINUE",
          reason: "Continue home dose",
          providerPlanRelationship: "CONTINUE",
          dischargeRegimen: "500 mg",
        },
      ],
      admissionHomeMedicationLines: [
        {
          lineId: "h1",
          medicationLabel: "Lisinopril",
          status: "UNABLE_TO_VERIFY",
          createsInpatientOrder: false,
          provenance: {
            sourceType: "PATIENT_PROFILE",
            verified: false,
            verificationStatus: "UNKNOWN",
          },
        },
      ],
      providerDischargeMedications: [
        {
          id: "p-met",
          displayName: "Metformin",
          dose: "500",
          unit: "mg",
          relationship: "CONTINUE",
        },
        {
          id: "p1",
          displayName: "Aspirin",
          relationship: "NEW",
        },
      ],
    });
    expect(result.usedExistingDischargeRecon).toBe(true);
    expect(result.lines).toHaveLength(2);
    const byName = Object.fromEntries(result.lines.map((l) => [l.medicationName, l]));
    expect(byName.Metformin?.decision).toBe("CONTINUE");
    expect(byName.Aspirin?.rowKind).toBe("PROVIDER_NEW");
    expect(byName.Aspirin?.decision).toBe("UNABLE_TO_VERIFY");
  });

  it("differentiates no documented meds vs history unavailable", () => {
    const none = buildInpatientDischargeMedReconPreload({});
    expect(none.historyState).toBe("NO_DOCUMENTED_MEDICATIONS");
    expect(none.lines).toHaveLength(0);

    const failed = buildInpatientDischargeMedReconPreload({ historyLoadFailed: true });
    expect(failed.historyState).toBe("MEDICATION_HISTORY_UNAVAILABLE");
  });
});

describe("INP.DIS.1G.1 fast nursing med-recon acceptance (Losartan scenario)", () => {
  const homeSelections = [
    "Losartan 50 mg PO daily",
    "Metformin 500 mg PO BID",
    "Atorvastatin 20 mg PO nightly",
  ];
  const providerMeds: InpatientDischargeMedicationLine1C[] = [
    {
      id: "p-los",
      displayName: "Losartan",
      dose: "100",
      unit: "mg",
      route: "PO",
      frequency: "daily",
      relationship: "CHANGE",
    },
    {
      id: "p-met",
      displayName: "Metformin",
      dose: "500",
      unit: "mg",
      route: "PO",
      frequency: "BID",
      relationship: "CONTINUE",
    },
    {
      id: "p-ator",
      displayName: "Atorvastatin",
      dose: "20",
      unit: "mg",
      route: "PO",
      frequency: "nightly",
      relationship: "STOP",
    },
    {
      id: "p-aml",
      displayName: "Amlodipine",
      dose: "5",
      unit: "mg",
      route: "PO",
      frequency: "daily",
      relationship: "NEW",
    },
  ];

  it("pairs home vs provider into changed / continue / stop / new rows", () => {
    const lines = buildPairedInpatientDischargeMedReconLines({
      patientHomeMedications: {
        medicationsSummary: homeSelections.join("\n"),
        medicationSummarySelections: homeSelections,
      },
      providerDischargeMedications: providerMeds,
    });
    expect(lines).toHaveLength(4);
    const byName = Object.fromEntries(lines.map((l) => [l.medicationName, l]));
    expect(byName.Losartan?.rowKind).toBe("PROVIDER_CHANGED");
    expect(byName.Losartan?.homeRegimen).toMatch(/50/);
    expect(byName.Losartan?.dischargeRegimen).toMatch(/100/);
    expect(byName.Metformin?.rowKind).toBe("PROVIDER_CONTINUE");
    expect(canBulkContinueMedReconLine(byName.Metformin!)).toBe(true);
    expect(canBulkContinueMedReconLine(byName.Losartan!)).toBe(false);
    expect(byName.Atorvastatin?.rowKind).toBe("PROVIDER_STOP");
    expect(byName.Amlodipine?.rowKind).toBe("PROVIDER_NEW");
    expect(summarizeMedReconWorkspace(lines).needsReview).toBe(4);
    expect(allRequiredMedReconDecisionsComplete(lines)).toBe(false);
  });

  it("after nurse one-click decisions, finalize payload + longitudinal projection are complete", () => {
    const seeded = buildPairedInpatientDischargeMedReconLines({
      patientHomeMedications: {
        medicationSummarySelections: homeSelections,
      },
      providerDischargeMedications: providerMeds,
    });
    const decided: InpatientDischargeMedReconLineV1[] = seeded.map((l) => {
      if (l.rowKind === "PROVIDER_CHANGED") return { ...l, decision: "MODIFY" };
      if (l.rowKind === "PROVIDER_STOP") return { ...l, decision: "DISCONTINUE" };
      if (l.rowKind === "PROVIDER_NEW") return { ...l, decision: "CONTINUE" };
      return { ...l, decision: "CONTINUE" };
    });
    expect(allRequiredMedReconDecisionsComplete(decided)).toBe(true);
    expect(summarizeMedReconWorkspace(decided)).toEqual({
      total: 4,
      reconciled: 4,
      needsReview: 0,
    });

    const longitudinal = projectPostDischargeHomeMedicationsFromRecon(decided);
    expect(longitudinal.medicationSummarySelections?.some((s) => /Losartan/i.test(s))).toBe(
      true
    );
    expect(longitudinal.medicationSummarySelections?.some((s) => /Metformin/i.test(s))).toBe(
      true
    );
    expect(longitudinal.medicationSummarySelections?.some((s) => /Amlodipine/i.test(s))).toBe(
      true
    );
    expect(longitudinal.medicationSummarySelections?.some((s) => /Atorvastatin/i.test(s))).toBe(
      false
    );

    const printFacts = collectInpatientDischargeMedicationPrintFacts(providerMeds);
    expect(printFacts).toHaveLength(4);
    expect(formatInpatientDischargeMedicationPrintLine(printFacts[0]!)).toContain("Losartan");
  });
});

describe("INP.DIS.1G.1 discharge medications persistence", () => {
  it("round-trips dischargeMedications through hydrate/merge", () => {
    const meds: InpatientDischargeMedicationLine1C[] = [
      {
        id: "m1",
        catalogMedicationId: "cat-aspirin",
        displayName: "Aspirin",
        dose: "81",
        unit: "mg",
        route: "PO",
        frequency: "daily",
        relationship: "NEW",
      },
    ];
    const doc = {
      ...emptyInpatientProviderDischarge(),
      dischargeMedications: meds,
      hospitalCourse: "Stable course",
      finalDisposition: { code: "HOME" },
      dischargeDiagnoses: [
        { id: "dx1", code: "R07.9", description: "Chest pain", isPrimary: true, sortOrder: 0 },
      ],
      conditionAtDischarge: { status: "STABLE" },
    } as InpatientProviderDischargeV1C;

    const merged = mergeInpatientProviderDischargeIntoDischargeSummary1C({}, doc);
    const hydrated = hydrateInpatientProviderDischarge1C(merged.inpatientProviderDischarge);
    expect(hydrated?.dischargeMedications?.[0]?.catalogMedicationId).toBe("cat-aspirin");
  });
});

describe("INP.DIS.1G.1 HOME_WITH_HOME_HEALTH end-to-end readiness", () => {
  it("blocks nursing completion before provider finalize; unlocks after finalize + med recon + nursing", () => {
    const providerDraft = {
      ...emptyInpatientProviderDischarge(),
      hospitalCourse: "Chest pain ruled out; dyspnea improved",
      dischargeDiagnoses: [
        {
          id: "dx1",
          code: "R07.9",
          description: "Chest pain, unspecified",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      conditionAtDischarge: { status: "STABLE" },
      finalDisposition: {
        code: "HOME_WITH_HOME_HEALTH",
        homeHealth: { agencyName: "Home Health Haiti" },
      },
      dischargeMedications: [
        { id: "m1", displayName: "Aspirin", dose: "81", unit: "mg", relationship: "NEW" },
      ],
    } as InpatientProviderDischargeV1C;

    expect(validateInpatientProviderDischarge1C(providerDraft, "complete").ok).toBe(true);
    const blocked = validateInpatientNursingDischarge({
      nursing: emptyInpatientNursingDischarge(),
      mode: "complete",
      provider: providerDraft,
      medReconComplete: false,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.errors).toContain("PROVIDER_DISCHARGE_NOT_FINALIZED");

    const providerFinalized: InpatientProviderDischargeV1C = {
      ...providerDraft,
      providerDocumentationFinalizedAt: "2026-08-28T18:00:00.000Z",
    };
    const nursingComplete = {
      ...emptyInpatientNursingDischarge(),
      executionStatus: "COMPLETED" as const,
      education: {
        instructionsReviewed: true,
        returnPrecautionsReviewed: true,
      },
      devices: { ivRemoved: true },
      belongings: { returned: true },
      departure: { departedAt: "2026-08-28T19:00:00.000Z" },
      homeHealth: {
        agencyConfirmed: true,
        familyKnowsAgency: true,
        contactProvided: true,
        documentsSent: true,
      },
      completedAt: "2026-08-28T19:05:00.000Z",
    };
    expect(
      validateInpatientNursingDischarge({
        nursing: nursingComplete,
        mode: "complete",
        provider: providerFinalized,
        medReconComplete: true,
      }).ok
    ).toBe(true);

    const summary = mergeInpatientProviderDischargeIntoDischargeSummary1C(
      {
        inpatientMedRecon: {
          schemaVersion: "INP.DIS.1A",
          finalizedAt: "2026-08-28T18:30:00.000Z",
          finalizedByUserId: "rn-1",
          lines: [{ id: "r1", sourceLabel: "Aspirin", decision: "CONTINUE" }],
        },
        inpatientNursingDischarge: nursingComplete,
      },
      providerFinalized
    );
    const readiness = projectInpatientFinalDischargeReadiness({
      dischargeSummaryJson: summary,
      encounterStatus: "OPEN",
    });
    expect(readiness.ready).toBe(true);
    expect(readiness.dispositionCode).toBe("HOME_WITH_HOME_HEALTH");
  });
});
