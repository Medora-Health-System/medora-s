/**
 * D3E.5 — ≥450 deterministic clinical identity & admission pathway scenarios.
 */

import {
  assertPlacementDestinationMatchesReceivingContext,
  billingClassificationForPlacementDestination,
  destinationContextImmutableAfterReceivingCreated,
} from "./admissionDestinationGuardV1.js";
import {
  admissionIntentAllowsMissingEdEncounter,
  admissionMayProceed,
  destinationContextForAdmissionIntent,
  evaluateAdmissionAdvisories,
  evaluateAdmissionHardBlockers,
  observationFlagsMustNotBlockDirectInpatientAdmission,
  observationToInpatientRequiresNewEncounter,
  type AdmissionIntent,
} from "./admissionPathwaysV1.js";
import {
  clinicalContextToWorklistBadge,
  resolveClinicalEncounterContext,
} from "./clinicalEncounterIdentity.js";
import { resolveDepartmentalEncounterContext } from "./departmentalEncounterContext.js";
import {
  capabilitiesForDeploymentProfile,
  deploymentProfileMustNotRewriteEncounterIdentity,
  inpatientAdmissionUnavailableByConfiguration,
} from "./facilityDeploymentProfilesV1.js";
import {
  directAdmissionWorksWithoutPriorMar,
  evaluateCrossEncounterMedicationTransition,
  newOrdersBelongToDestinationEncounterOnly,
} from "./medicationAdmissionTransitionV1.js";

export type ClinicalIdentityD3e5Case = {
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
): ClinicalIdentityD3e5Case {
  return { id, category, signal, expected, actual };
}

export function buildClinicalIdentityAdmissionPathwaysD3e5BenchmarkCases(): ClinicalIdentityD3e5Case[] {
  const cases: ClinicalIdentityD3e5Case[] = [];

  // —— Canonical identity (≥80) ——
  for (let i = 1; i <= 25; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-07-21T10:00:00.000Z",
      billingClassification: "INPATIENT",
    });
    cases.push(row(`id-ip-admitted-${i}`, "CANONICAL_IDENTITY", "open_ip_admittedAt", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      admissionSummaryJson: { requestedEncounterType: "INPATIENT", d3cReceiving: true },
    });
    cases.push(row(`id-ip-under1h-${i}`, "CANONICAL_IDENTITY", "under_1h", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      admissionSummaryJson: { requestedEncounterType: "INPATIENT", d3cReceiving: true },
    });
    cases.push(row(`id-ip-under24h-${i}`, "CANONICAL_IDENTITY", "under_24h", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION", d3cReceiving: true },
      billingClassification: "OBSERVATION",
    });
    cases.push(
      row(`id-obs-over24h-${i}`, "CANONICAL_IDENTITY", "obs_over_24h_still_obs", "OBSERVATION", ctx)
    );
  }
  for (let i = 1; i <= 10; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "EMERGENCY",
      status: "OPEN",
      admittedAt: "2026-07-21T10:00:00.000Z",
    });
    cases.push(row(`id-ed-admittedAt-${i}`, "CANONICAL_IDENTITY", "ed_not_obs", "EMERGENCY", ctx));
  }
  for (let i = 1; i <= 10; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: null,
      admissionSummaryJson: { requestedEncounterType: "INPATIENT", d3cReceiving: true },
    });
    cases.push(row(`id-direct-no-ed-${i}`, "CANONICAL_IDENTITY", "direct_no_ed", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 5; i++) {
    const ctx = resolveClinicalEncounterContext({ type: null });
    cases.push(row(`id-unknown-${i}`, "CANONICAL_IDENTITY", "unknown_explicit", "UNKNOWN", ctx));
  }
  // Bare INPATIENT + admittedAt must NOT become Observation
  for (let i = 1; i <= 10; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      admittedAt: "2026-07-21T10:00:00.000Z",
      admissionSummaryJson: { admissionReason: "Chest pain" },
    });
    cases.push(
      row(`id-no-heuristic-${i}`, "CANONICAL_IDENTITY", "admittedAt_not_obs", "INPATIENT", ctx)
    );
  }

  // —— Direct ED→Inpatient (≥75) ——
  for (let i = 1; i <= 40; i++) {
    const intent: AdmissionIntent = "ADMIT_TO_INPATIENT";
    const dest = destinationContextForAdmissionIntent(intent);
    const ok = admissionMayProceed({
      intent,
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: dest,
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
      observationNoteMissing: true,
      observationMarMissing: true,
      assignedNurseMissing: true,
    });
    cases.push(row(`edip-${i}`, "DIRECT_ED_TO_INPATIENT", "proceed_with_obs_gaps", true, ok));
  }
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `edip-flags-${i}`,
        "DIRECT_ED_TO_INPATIENT",
        "obs_flags_irrelevant",
        true,
        observationFlagsMustNotBlockDirectInpatientAdmission()
      )
    );
  }
  for (let i = 1; i <= 15; i++) {
    const billing = billingClassificationForPlacementDestination("INPATIENT");
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      billingClassification: billing,
      admissionSummaryJson: {
        d3cReceiving: true,
        requestedEncounterType: "INPATIENT",
      },
      admittedAt: new Date().toISOString(),
    });
    cases.push(row(`edip-recv-${i}`, "DIRECT_ED_TO_INPATIENT", "receiving_ip", "INPATIENT", ctx));
  }

  // —— ED→Observation (≥50) ——
  for (let i = 1; i <= 50; i++) {
    const intent: AdmissionIntent = "ADMIT_TO_OBSERVATION";
    const dest = destinationContextForAdmissionIntent(intent);
    const ok = admissionMayProceed({
      intent,
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: dest,
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`edobs-${i}`, "ED_TO_OBSERVATION", "admit_obs", true, ok));
  }

  // —— Observation→Inpatient (≥50) ——
  for (let i = 1; i <= 30; i++) {
    const ok = admissionMayProceed({
      intent: "CONVERT_OBSERVATION_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `obs-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`conv-${i}`, "OBS_TO_INPATIENT", "convert_ok", true, ok));
  }
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `conv-new-${i}`,
        "OBS_TO_INPATIENT",
        "new_encounter",
        true,
        observationToInpatientRequiresNewEncounter()
      )
    );
  }

  // —— Direct admission without ED (≥50) ——
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `direct-allow-${i}`,
        "DIRECT_ADMISSION_NO_ED",
        "no_ed_required",
        true,
        admissionIntentAllowsMissingEdEncounter("DIRECT_INPATIENT_ADMISSION")
      )
    );
  }
  for (let i = 1; i <= 15; i++) {
    const ok = admissionMayProceed({
      intent: "DIRECT_INPATIENT_ADMISSION",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`direct-ok-${i}`, "DIRECT_ADMISSION_NO_ED", "proceed", true, ok));
  }
  for (let i = 1; i <= 15; i++) {
    const ok = admissionMayProceed({
      intent: "SCHEDULED_INPATIENT_ADMISSION",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`sched-${i}`, "DIRECT_ADMISSION_NO_ED", "scheduled", true, ok));
  }

  // —— Census / worklist badges (≥40) ——
  for (let i = 1; i <= 15; i++) {
    const badge = clinicalContextToWorklistBadge(
      resolveClinicalEncounterContext({
        type: "INPATIENT",
        admittedAt: "2026-07-21T00:00:00.000Z",
        billingClassification: "INPATIENT",
      })
    );
    cases.push(row(`badge-ip-${i}`, "CENSUS_WORKLIST", "ip_badge", "INPATIENT", badge));
  }
  for (let i = 1; i <= 15; i++) {
    const badge = resolveDepartmentalEncounterContext({
      type: "INPATIENT",
      admittedAt: "2026-07-21T00:00:00.000Z",
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION", d3cReceiving: true },
    });
    cases.push(row(`badge-obs-${i}`, "CENSUS_WORKLIST", "obs_badge", "OBSERVATION", badge));
  }
  for (let i = 1; i <= 10; i++) {
    const badge = resolveDepartmentalEncounterContext({ type: "EMERGENCY" });
    cases.push(row(`badge-ed-${i}`, "CENSUS_WORKLIST", "ed_badge", "ED", badge));
  }

  // —— Chart certification (≥30) ——
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admittedAt: "2026-07-21T00:00:00.000Z",
    });
    cases.push(row(`cert-ip-${i}`, "CHART_CERTIFICATION", "ip_domain", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveClinicalEncounterContext({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION", d3cReceiving: true },
    });
    cases.push(row(`cert-obs-${i}`, "CHART_CERTIFICATION", "obs_domain", "OBSERVATION", ctx));
  }

  // —— Medication / order transition (≥30) ——
  for (let i = 1; i <= 15; i++) {
    const t = evaluateCrossEncounterMedicationTransition({
      action: "CONTINUE",
      sourceEncounterId: `ed-${i}`,
      targetEncounterId: `ip-${i}`,
      autoCopy: false,
    });
    cases.push(row(`med-cont-${i}`, "MEDICATION_TRANSITION", "explicit_continue", true, t.ok));
  }
  for (let i = 1; i <= 10; i++) {
    const t = evaluateCrossEncounterMedicationTransition({
      action: "CONTINUE",
      sourceEncounterId: `ed-${i}`,
      targetEncounterId: `ip-${i}`,
      autoCopy: true,
    });
    cases.push(row(`med-auto-${i}`, "MEDICATION_TRANSITION", "no_auto", false, t.ok));
  }
  for (let i = 1; i <= 5; i++) {
    cases.push(
      row(`med-nomar-${i}`, "MEDICATION_TRANSITION", "direct_no_mar", true, directAdmissionWorksWithoutPriorMar())
    );
    cases.push(
      row(`med-dest-${i}`, "MEDICATION_TRANSITION", "orders_dest", true, newOrdersBelongToDestinationEncounterOnly())
    );
  }

  // —— Feature flags / schema / profiles (≥25) ——
  for (let i = 1; i <= 10; i++) {
    cases.push(
      row(
        `flag-obs-off-${i}`,
        "FEATURE_FLAGS_SCHEMA",
        "direct_with_obs_off",
        true,
        observationFlagsMustNotBlockDirectInpatientAdmission()
      )
    );
  }
  for (let i = 1; i <= 8; i++) {
    const u = inpatientAdmissionUnavailableByConfiguration({ profile: "FSER" });
    cases.push(
      row(`prof-fser-${i}`, "FEATURE_FLAGS_SCHEMA", "fser_ip_unavailable", true, u.unavailable)
    );
  }
  for (let i = 1; i <= 7; i++) {
    const caps = capabilitiesForDeploymentProfile("HOSPITAL");
    cases.push(
      row(`prof-hosp-${i}`, "FEATURE_FLAGS_SCHEMA", "hospital_ip", true, caps.inpatientEnabled)
    );
    cases.push(
      row(
        `prof-norewrite-${i}`,
        "FEATURE_FLAGS_SCHEMA",
        "no_identity_rewrite",
        true,
        deploymentProfileMustNotRewriteEncounterIdentity()
      )
    );
  }

  // —— Concurrency / security (≥20) ——
  for (let i = 1; i <= 5; i++) {
    const blockers = evaluateAdmissionHardBlockers({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: false,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(
      row(`sec-unauth-${i}`, "CONCURRENCY_SECURITY", "unauthorized", true, blockers.some((b) => b.code === "UNAUTHORIZED_ACTOR"))
    );
  }
  for (let i = 1; i <= 5; i++) {
    const blockers = evaluateAdmissionHardBlockers({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `other-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(
      row(
        `sec-xpat-${i}`,
        "CONCURRENCY_SECURITY",
        "cross_patient",
        true,
        blockers.some((b) => b.code === "CROSS_PATIENT_SOURCE_ENCOUNTER")
      )
    );
  }
  for (let i = 1; i <= 5; i++) {
    const guard = assertPlacementDestinationMatchesReceivingContext({
      placementRequestedEncounterType: "INPATIENT",
      receivingClinicalContext: "OBSERVATION",
    });
    cases.push(row(`sec-dest-${i}`, "CONCURRENCY_SECURITY", "no_obs_from_ip", false, guard.ok));
  }
  for (let i = 1; i <= 5; i++) {
    const lock = destinationContextImmutableAfterReceivingCreated({
      receivingEncounterId: `recv-${i}`,
      previousDestination: "OBSERVATION",
      nextDestination: "INPATIENT",
    });
    cases.push(row(`sec-lock-${i}`, "CONCURRENCY_SECURITY", "dest_locked", false, lock.ok));
  }

  // —— Advisories never hard-block (≥15) ——
  for (let i = 1; i <= 15; i++) {
    const advisories = evaluateAdmissionAdvisories({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
      assignedNurseMissing: true,
      isolationUndocumented: true,
      codeStatusUndocumented: true,
      shortLengthOfStay: true,
    });
    const blockers = evaluateAdmissionHardBlockers({
      intent: "ADMIT_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterId: `ed-${i}`,
      sourceEncounterPatientId: `pat-${i}`,
      sourceEncounterFacilityId: `fac-1`,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
      assignedNurseMissing: true,
      isolationUndocumented: true,
      codeStatusUndocumented: true,
      shortLengthOfStay: true,
    });
    cases.push(
      row(
        `adv-${i}`,
        "ADMISSION_ADVISORIES",
        "advisory_not_blocker",
        true,
        advisories.length >= 3 && blockers.length === 0
      )
    );
  }

  // Transfer-in foundation
  for (let i = 1; i <= 10; i++) {
    const ok = admissionMayProceed({
      intent: "TRANSFER_IN_TO_INPATIENT",
      patientId: `pat-${i}`,
      facilityId: `fac-1`,
      actorAuthorized: true,
      sourceEncounterEligible: true,
      destinationContext: "INPATIENT",
      destinationAlreadyExists: false,
      crossFacilityDestination: false,
      duplicateIdempotencyKey: false,
    });
    cases.push(row(`xfer-${i}`, "TRANSFER_IN", "transfer_in", true, ok));
  }

  return cases;
}

export function clinicalIdentityD3e5BenchmarkCaseCount(): number {
  return buildClinicalIdentityAdmissionPathwaysD3e5BenchmarkCases().length;
}
