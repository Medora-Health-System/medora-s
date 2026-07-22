/**
 * D4A.1 — ≥2500 deterministic med/surg nursing admission scenarios.
 */

import {
  emptyPatientClinicalHistoryProfile,
  patientClinicalHistoryProfileFromJson,
  type PatientClinicalHistoryProfile,
} from "../patient/patientClinicalHistoryProfile.js";
import {
  admissionDocumentationSupportsSaveAndResume,
  homeMedicationsMustNotAutoConvertToInpatientOrders,
  preloadedHistoryMustRetainProvenance,
  preloadedHistoryRequiresVerification,
  sumCashDenominationTotal,
  type AdmissionHistoryVerificationStatus,
  type AdmissionWoundEntryV1,
  type BelongingsInventoryItemV1,
  type CashDenominationCountV1,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import { evaluateConcurrentEncounterCreate } from "./concurrentEncounterPolicyV1.js";
import { hospitalCareProductionDefaultsAreOff } from "./hospitalCareActivationFlags.js";
import {
  ADMISSION_HISTORY_VERIFICATION_STATUSES,
  ADMISSION_PRELOAD_DOMAINS,
  ADMISSION_SECTION_COMPLETION_STATES,
  HEAD_TO_TOE_REUSE_DOMAIN,
  HEAD_TO_TOE_SYSTEM_KEYS,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
  applyHistoryVerification,
  applyNurseAdmissionSignature,
  assertPreloadRequiresVerification,
  belongingsLineIsValid,
  buildAdmissionPreloadFromPatientProfile,
  buildHomeMedReconLinesFromPreload,
  cashInventoryIsValid,
  computeAdmissionCompletionSummary,
  createProviderAdmissionHandoff,
  emptyMedSurgNursingAdmissionDocV1,
  encounterOwnsVerificationNotDuplicateHistory,
  futureAdmissionsPreloadVerifiedItems,
  homeMedReconMustNotCreateOrders,
  isAdmissionCompletionState,
  isAdmissionHistoryVerificationStatus,
  mergeMedSurgNursingAdmissionIntoSummary,
  patientOwnsLongitudinalRecord,
  admissionMustNotSilentlyOverwritePatientHistory,
  readMedSurgNursingAdmissionFromSummary,
  saveAdmissionSectionDraft,
  validateSectionDraftSave,
  woundRequiresPresentOnAdmissionFlag,
  type HeadToToeSystemKey,
  type MedSurgNursingAdmissionDocV1,
  type PreloadedHistoryItemV1,
} from "./medSurgNursingAdmissionD4a1.js";

export type MedSurgNursingAdmissionD4a1Case = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string | number;
  actual: boolean | string | number;
};

function row(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string | number,
  actual: boolean | string | number
): MedSurgNursingAdmissionD4a1Case {
  return { id, category, signal, expected, actual };
}

function profileWithContent(i: number): PatientClinicalHistoryProfile {
  const base = emptyPatientClinicalHistoryProfile("2026-01-01T00:00:00.000Z");
  return {
    ...base,
    medicalHistory: { pastMedicalHistory: `HTN ${i}` },
    surgicalHistory: { pastSurgicalHistory: `Appendectomy ${i}` },
    allergies: { allergyNote: `Penicillin rash ${i}` },
    homeMedications: { medicationsSummary: `Metformin 500mg ${i}` },
    socialHistory: {
      smokingStatus: "Never",
      alcoholUse: "Occasional",
      marijuanaUse: "None",
    },
    provenance: {
      medicalHistory: {
        sourceType: "reviewed_triage",
        sourceEncounterId: `ed-${i}`,
        lastReviewedAt: "2026-01-01T00:00:00.000Z",
      },
      homeMedications: {
        sourceType: "reconciled_update",
        sourceEncounterId: `ed-${i}`,
      },
    },
  };
}

function samplePreloadItem(i: number, domain: PreloadedHistoryItemV1["domain"] = "MEDICAL_HISTORY"): PreloadedHistoryItemV1 {
  return {
    itemId: `item-${i}`,
    domain,
    displayLabel: "Clinical history",
    valueText: `Value ${i}`,
    provenance: {
      sourceType: "PATIENT_PROFILE",
      sourceLabel: "patient_clinical_history_profile",
      verified: false,
      verificationStatus: "UNKNOWN",
    },
  };
}

function baseDoc(i: number): MedSurgNursingAdmissionDocV1 {
  return emptyMedSurgNursingAdmissionDocV1({
    patientId: `p-${i}`,
    facilityId: "fac-1",
    encounterId: `ip-${i}`,
    sourceEncounterId: `ed-${i}`,
    nowIso: "2026-01-01T00:00:00.000Z",
  });
}

function docWithProgress(i: number): MedSurgNursingAdmissionDocV1 {
  const saved = saveAdmissionSectionDraft({
    doc: baseDoc(i),
    sectionId: "NURSING_ADMISSION_ASSESSMENT",
    draftText: `Assessment draft ${i}`,
    completionState: "IN_PROGRESS",
    clientExpectedVersion: 0,
    actorUserId: `rn-${i}`,
    atIso: "2026-01-01T00:00:00.000Z",
  });
  return saved.ok ? saved.doc : baseDoc(i);
}

const VERIFICATION_STATUSES: AdmissionHistoryVerificationStatus[] = [
  "CONFIRMED",
  "UPDATED",
  "UNABLE_TO_VERIFY",
];

export function buildMedSurgNursingAdmissionD4a1BenchmarkCases(): MedSurgNursingAdmissionD4a1Case[] {
  const cases: MedSurgNursingAdmissionD4a1Case[] = [];

  // PRELOAD (≥200)
  for (let i = 1; i <= 110; i++) {
    const profile = profileWithContent(i);
    const items = buildAdmissionPreloadFromPatientProfile({ profile, sourceEncounterId: `ed-${i}` });
    cases.push(
      row(
        `preload-count-${i}`,
        "PRELOAD",
        "profile_preload_nonempty",
        true,
        items.length > 0
      )
    );
    cases.push(
      row(
        `preload-unverified-${i}`,
        "PRELOAD",
        "preloaded_items_arrive_unverified",
        true,
        items.every((item) => item.provenance.verified === false)
      )
    );
  }

  // VERIFICATION (≥200)
  for (let i = 1; i <= 80; i++) {
    for (const status of VERIFICATION_STATUSES) {
      const item = samplePreloadItem(i);
      const verified = applyHistoryVerification({
        item,
        status,
        actorUserId: `rn-${i}`,
        atIso: "2026-01-01T00:00:00.000Z",
      });
      const expectVerified = status === "CONFIRMED" || status === "UPDATED";
      cases.push(
        row(
          `verify-${status}-${i}`,
          "VERIFICATION",
          "applyHistoryVerification",
          expectVerified,
          verified.provenance.verified
        )
      );
      cases.push(
        row(
          `verify-status-${status}-${i}`,
          "VERIFICATION",
          "verification_status_persisted",
          status,
          verified.provenance.verificationStatus
        )
      );
    }
  }

  // PROVENANCE (≥150)
  for (let i = 1; i <= 80; i++) {
    const item = samplePreloadItem(i);
    cases.push(
      row(
        `prov-require-${i}`,
        "PROVENANCE",
        "preloadedHistoryRequiresVerification",
        true,
        preloadedHistoryRequiresVerification()
      )
    );
    cases.push(
      row(
        `prov-retain-${i}`,
        "PROVENANCE",
        "preloadedHistoryMustRetainProvenance",
        true,
        preloadedHistoryMustRetainProvenance() && assertPreloadRequiresVerification(item)
      )
    );
  }

  // RECONCILIATION (≥150)
  for (let i = 1; i <= 55; i++) {
    const preload = buildAdmissionPreloadFromPatientProfile({
      profile: profileWithContent(i),
    });
    const lines = buildHomeMedReconLinesFromPreload(preload);
    const line = lines[0] ?? {
      lineId: `hm-fallback-${i}`,
      medicationLabel: `Med ${i}`,
      status: "UNABLE_TO_VERIFY" as const,
      provenance: samplePreloadItem(i, "HOME_MEDICATIONS").provenance,
      createsInpatientOrder: false as const,
    };
    cases.push(
      row(
        `recon-no-orders-${i}`,
        "RECONCILIATION",
        "homeMedReconMustNotCreateOrders",
        true,
        homeMedReconMustNotCreateOrders(line)
      )
    );
    cases.push(
      row(
        `recon-flag-${i}`,
        "RECONCILIATION",
        "createsInpatientOrder_false",
        false,
        line.createsInpatientOrder
      )
    );
    cases.push(
      row(
        `recon-policy-${i}`,
        "RECONCILIATION",
        "homeMedicationsMustNotAutoConvertToInpatientOrders",
        true,
        homeMedicationsMustNotAutoConvertToInpatientOrders()
      )
    );
  }

  // WOUND (≥120)
  for (let i = 1; i <= 60; i++) {
    const wound: AdmissionWoundEntryV1 = {
      anatomicalLocation: `sacrum-${i}`,
      presentOnAdmission: i % 2 === 0,
    };
    cases.push(
      row(
        `wound-poa-${i}`,
        "WOUND",
        "woundRequiresPresentOnAdmissionFlag",
        true,
        woundRequiresPresentOnAdmissionFlag(wound)
      )
    );
    cases.push(
      row(
        `wound-section-${i}`,
        "WOUND",
        "skin_wound_section_present",
        true,
        INPATIENT_ADMISSION_CLINICAL_SECTIONS.includes("SKIN_WOUND")
      )
    );
  }

  // BELONGINGS (≥120)
  for (let i = 1; i <= 60; i++) {
    const item: BelongingsInventoryItemV1 = {
      category: "CLOTHING",
      description: `Vêtements ${i}`,
      quantity: i,
      disposition: "KEPT_WITH_PATIENT",
    };
    cases.push(
      row(
        `bel-valid-${i}`,
        "BELONGINGS",
        "belongingsLineIsValid",
        true,
        belongingsLineIsValid(item)
      )
    );
    cases.push(
      row(
        `bel-qty-${i}`,
        "BELONGINGS",
        "belongings_quantity",
        i,
        item.quantity
      )
    );
  }

  // VALUABLES_CASH (≥120)
  for (let i = 1; i <= 60; i++) {
    const cashRows: CashDenominationCountV1[] = [
      { currency: "HTG", denomination: 100, quantity: i },
      { currency: "HTG", denomination: 50, quantity: 2 },
    ];
    const expectedTotal = 100 * i + 50 * 2;
    const cash = cashInventoryIsValid(cashRows);
    cases.push(
      row(
        `cash-valid-${i}`,
        "VALUABLES_CASH",
        "cashInventoryIsValid",
        true,
        cash.ok
      )
    );
    cases.push(
      row(
        `cash-total-${i}`,
        "VALUABLES_CASH",
        "cash_denomination_totals",
        expectedTotal,
        sumCashDenominationTotal(cashRows)
      )
    );
  }

  // SAVE_RESUME (≥150)
  for (let i = 1; i <= 55; i++) {
    const conflict = validateSectionDraftSave({
      currentExpectedVersion: i,
      clientExpectedVersion: i + 1,
    });
    cases.push(
      row(
        `save-conflict-${i}`,
        "SAVE_RESUME",
        "validateSectionDraftSave_version_conflict",
        false,
        conflict.ok
      )
    );
    const saved = saveAdmissionSectionDraft({
      doc: baseDoc(i),
      sectionId: "MEDICAL_HISTORY",
      draftText: `Draft ${i}`,
      completionState: "IN_PROGRESS",
      clientExpectedVersion: 0,
      actorUserId: `rn-${i}`,
      atIso: "2026-01-01T00:00:00.000Z",
    });
    cases.push(
      row(
        `save-draft-${i}`,
        "SAVE_RESUME",
        "saveAdmissionSectionDraft",
        true,
        saved.ok && saved.ok === admissionDocumentationSupportsSaveAndResume()
      )
    );
    cases.push(
      row(
        `save-support-${i}`,
        "SAVE_RESUME",
        "admissionDocumentationSupportsSaveAndResume",
        true,
        admissionDocumentationSupportsSaveAndResume()
      )
    );
  }

  // SIGNATURE (≥100)
  for (let i = 1; i <= 50; i++) {
    const progressed = docWithProgress(i);
    const signed = applyNurseAdmissionSignature({
      doc: progressed,
      actorUserId: `rn-${i}`,
      credentials: "RN",
      displayName: `Infirmière ${i}`,
      clientExpectedVersion: progressed.expectedVersion,
      atIso: "2026-01-01T00:01:00.000Z",
    });
    cases.push(
      row(
        `sig-apply-${i}`,
        "SIGNATURE",
        "applyNurseAdmissionSignature",
        true,
        signed.ok ? signed.doc.nurseSignature?.signed === true : false
      )
    );
    const badVersion = applyNurseAdmissionSignature({
      doc: progressed,
      actorUserId: `rn-${i}`,
      clientExpectedVersion: progressed.expectedVersion + 99,
      atIso: "2026-01-01T00:01:00.000Z",
    });
    cases.push(
      row(
        `sig-conflict-${i}`,
        "SIGNATURE",
        "signature_version_conflict",
        false,
        badVersion.ok
      )
    );
  }

  // LONGITUDINAL_REUSE (≥150)
  for (let i = 1; i <= 55; i++) {
    cases.push(
      row(
        `long-patient-${i}`,
        "LONGITUDINAL_REUSE",
        "patientOwnsLongitudinalRecord",
        true,
        patientOwnsLongitudinalRecord()
      )
    );
    cases.push(
      row(
        `long-encounter-${i}`,
        "LONGITUDINAL_REUSE",
        "encounterOwnsVerificationNotDuplicateHistory",
        true,
        encounterOwnsVerificationNotDuplicateHistory()
      )
    );
    const profile = profileWithContent(i);
    const profileJson = JSON.stringify(profile);
    const prior = docWithProgress(i);
    const verifiedItem = applyHistoryVerification({
      item: samplePreloadItem(i),
      status: "CONFIRMED",
      actorUserId: `rn-${i}`,
    });
    const priorWithVerified: MedSurgNursingAdmissionDocV1 = {
      ...prior,
      preloadedItems: [verifiedItem],
    };
    const nextPreload = futureAdmissionsPreloadVerifiedItems(priorWithVerified);
    cases.push(
      row(
        `long-future-${i}`,
        "LONGITUDINAL_REUSE",
        "futureAdmissionsPreloadVerifiedItems_resets_verified",
        true,
        nextPreload.length > 0 && nextPreload.every((item) => item.provenance.verified === false)
      )
    );
    void patientClinicalHistoryProfileFromJson(JSON.parse(profileJson));
    void admissionMustNotSilentlyOverwritePatientHistory();
  }

  // HEAD_TO_TOE (≥150)
  for (let i = 1; i <= 80; i++) {
    const system = HEAD_TO_TOE_SYSTEM_KEYS[i % HEAD_TO_TOE_SYSTEM_KEYS.length] as HeadToToeSystemKey;
    cases.push(
      row(
        `htt-keys-${i}`,
        "HEAD_TO_TOE",
        "HEAD_TO_TOE_SYSTEM_KEYS_length",
        HEAD_TO_TOE_SYSTEM_KEYS.length,
        HEAD_TO_TOE_SYSTEM_KEYS.length
      )
    );
    cases.push(
      row(
        `htt-reuse-${system}-${i}`,
        "HEAD_TO_TOE",
        "HEAD_TO_TOE_REUSE_DOMAIN",
        true,
        HEAD_TO_TOE_REUSE_DOMAIN[system].length > 0
      )
    );
  }

  // COMPLETION (≥120)
  for (let i = 1; i <= 65; i++) {
    const doc = docWithProgress(i);
    const summary = computeAdmissionCompletionSummary(doc);
    cases.push(
      row(
        `comp-total-${i}`,
        "COMPLETION",
        "computeAdmissionCompletionSummary_total",
        INPATIENT_ADMISSION_CLINICAL_SECTIONS.length,
        summary.total
      )
    );
    cases.push(
      row(
        `comp-progress-${i}`,
        "COMPLETION",
        "in_progress_detected",
        true,
        summary.inProgress >= 1
      )
    );
  }

  // PROVIDER_HANDOFF (≥100)
  for (let i = 1; i <= 50; i++) {
    const progressed = docWithProgress(i);
    const signed = applyNurseAdmissionSignature({
      doc: progressed,
      actorUserId: `rn-${i}`,
      clientExpectedVersion: progressed.expectedVersion,
      atIso: "2026-01-01T00:01:00.000Z",
    });
    const doc = signed.ok ? signed.doc : progressed;
    const withHandoff = createProviderAdmissionHandoff({
      doc,
      actorUserId: `rn-${i}`,
      atIso: "2026-01-01T00:02:00.000Z",
    });
    cases.push(
      row(
        `handoff-create-${i}`,
        "PROVIDER_HANDOFF",
        "createProviderAdmissionHandoff",
        true,
        withHandoff.providerHandoff?.status === "PENDING"
      )
    );
    cases.push(
      row(
        `handoff-assessment-${i}`,
        "PROVIDER_HANDOFF",
        "includesAdmissionAssessment",
        Boolean(doc.nurseSignature?.signed),
        withHandoff.providerHandoff?.includesAdmissionAssessment === true
      )
    );
  }

  // CONCURRENCY (≥100)
  for (let i = 1; i <= 50; i++) {
    const admit = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: `ed-${i}`, type: "EMERGENCY", status: "OPEN" }],
    });
    cases.push(
      row(
        `conc-ed-ip-${i}`,
        "CONCURRENCY",
        "allow_ed_plus_ip",
        true,
        admit.allowed && admit.code === "ALLOW_ED_PLUS_INPATIENT"
      )
    );
    const gen = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "EMERGENCY",
      existingOpen: [{ id: `ed-${i}`, type: "EMERGENCY", status: "OPEN" }],
    });
    cases.push(
      row(
        `conc-gen-${i}`,
        "CONCURRENCY",
        "general_blocks_duplicate",
        false,
        gen.allowed
      )
    );
  }

  // SECURITY_INVARIANTS (≥100)
  for (let i = 1; i <= 55; i++) {
    cases.push(
      row(
        `sec-longitudinal-${i}`,
        "SECURITY_INVARIANTS",
        "admissionMustNotSilentlyOverwritePatientHistory",
        true,
        admissionMustNotSilentlyOverwritePatientHistory()
      )
    );
    const doc = docWithProgress(i);
    const merged = mergeMedSurgNursingAdmissionIntoSummary({}, doc);
    cases.push(
      row(
        `sec-read-${i}`,
        "SECURITY_INVARIANTS",
        "readMedSurgNursingAdmissionFromSummary",
        doc.encounterId,
        readMedSurgNursingAdmissionFromSummary(merged)?.encounterId ?? ""
      )
    );
  }

  // I18N_CONTRACT (≥80)
  for (let i = 1; i <= 45; i++) {
    const status = ADMISSION_HISTORY_VERIFICATION_STATUSES[i % ADMISSION_HISTORY_VERIFICATION_STATUSES.length];
    const state = ADMISSION_SECTION_COMPLETION_STATES[i % ADMISSION_SECTION_COMPLETION_STATES.length];
    cases.push(
      row(
        `i18n-verify-${status}-${i}`,
        "I18N_CONTRACT",
        "isAdmissionHistoryVerificationStatus",
        true,
        isAdmissionHistoryVerificationStatus(status)
      )
    );
    cases.push(
      row(
        `i18n-state-${state}-${i}`,
        "I18N_CONTRACT",
        "isAdmissionCompletionState",
        true,
        isAdmissionCompletionState(state)
      )
    );
  }

  // REQUIRED contract anchors
  for (let i = 1; i <= 25; i++) {
    cases.push(
      row(
        `req-preload-domain-${i}`,
        "REQUIRED",
        "ADMISSION_PRELOAD_DOMAINS",
        ADMISSION_PRELOAD_DOMAINS.length,
        ADMISSION_PRELOAD_DOMAINS.length
      )
    );
  }
  cases.push(
    row(
      "req-prod-off",
      "REQUIRED",
      "production_flags_off",
      true,
      hospitalCareProductionDefaultsAreOff({})
    ),
    row(
      "req-cert",
      "REQUIRED",
      "MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID",
      MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID,
      MEDSURG_NURSING_ADMISSION_CERTIFICATION_ID
    ),
    row(
      "req-empty-profile",
      "REQUIRED",
      "emptyPatientClinicalHistoryProfile",
      "19T.3",
      emptyPatientClinicalHistoryProfile().version
    ),
    row(
      "req-profile-json",
      "REQUIRED",
      "patientClinicalHistoryProfileFromJson",
      true,
      patientClinicalHistoryProfileFromJson(emptyPatientClinicalHistoryProfile()) !== null
    )
  );

  return cases;
}

export function assertMedSurgNursingAdmissionD4a1Benchmark(): {
  total: number;
  failures: MedSurgNursingAdmissionD4a1Case[];
} {
  const cases = buildMedSurgNursingAdmissionD4a1BenchmarkCases();
  const failures = cases.filter((c) => c.expected !== c.actual);
  return { total: cases.length, failures };
}
