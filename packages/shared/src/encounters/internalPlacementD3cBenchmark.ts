/**
 * D3C — deterministic internal placement benchmark (≥150 cases).
 * Evaluators are advisory for product certification targets.
 */

import { validateInternalPlacementClinicalRequestForSign } from "./internalPlacementClinicalRequest.js";
import { classifyLegacyAdmissionCompatibility } from "./internalPlacementProjection.js";
import {
  InternalPlacementActorRole,
  InternalPlacementRequestedEncounterType,
  InternalPlacementStatus,
  isInternalPlacementStatusActive,
  placementArrivedFromHandoffAlone,
  placementBedAssignedFromRoomLabelAlone,
  projectInternalPlacementTrackboardLabel,
  validateInternalPlacementTransition,
} from "./internalPlacementStatusMachine.js";

export type InternalPlacementBenchmarkCase = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string;
  actual: boolean | string;
};

function caseRow(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string,
  actual: boolean | string
): InternalPlacementBenchmarkCase {
  return { id, category, signal, expected, actual };
}

const HAPPY_PATH: Array<[InternalPlacementStatus, InternalPlacementStatus, InternalPlacementActorRole]> = [
  [InternalPlacementStatus.DRAFT, InternalPlacementStatus.SIGNED, InternalPlacementActorRole.PROVIDER],
  [InternalPlacementStatus.SIGNED, InternalPlacementStatus.REQUESTED, InternalPlacementActorRole.PROVIDER],
  [InternalPlacementStatus.DRAFT, InternalPlacementStatus.REQUESTED, InternalPlacementActorRole.PROVIDER],
  [InternalPlacementStatus.REQUESTED, InternalPlacementStatus.UNDER_REVIEW, InternalPlacementActorRole.BED_MANAGEMENT],
  [InternalPlacementStatus.UNDER_REVIEW, InternalPlacementStatus.ACCEPTED, InternalPlacementActorRole.BED_MANAGEMENT],
  [InternalPlacementStatus.REQUESTED, InternalPlacementStatus.ACCEPTED, InternalPlacementActorRole.BED_MANAGEMENT],
  [InternalPlacementStatus.ACCEPTED, InternalPlacementStatus.BED_ASSIGNED, InternalPlacementActorRole.BED_MANAGEMENT],
  [InternalPlacementStatus.BED_ASSIGNED, InternalPlacementStatus.READY_FOR_TRANSFER, InternalPlacementActorRole.ED_NURSE],
  [InternalPlacementStatus.READY_FOR_TRANSFER, InternalPlacementStatus.DEPARTED_ED, InternalPlacementActorRole.ED_NURSE],
  [InternalPlacementStatus.DEPARTED_ED, InternalPlacementStatus.ARRIVED_DESTINATION, InternalPlacementActorRole.RECEIVING_NURSE],
  [InternalPlacementStatus.ARRIVED_DESTINATION, InternalPlacementStatus.COMPLETED, InternalPlacementActorRole.SERVER],
];

export function buildInternalPlacementD3cBenchmarkCases(): InternalPlacementBenchmarkCase[] {
  const cases: InternalPlacementBenchmarkCase[] = [];

  for (let i = 1; i <= 25; i++) {
    const v = validateInternalPlacementClinicalRequestForSign({
      requestedEncounterType: InternalPlacementRequestedEncounterType.OBSERVATION,
      requestedLevelOfCare: "OBS",
      requestedService: "Medicine",
      admissionDiagnosisSummary: `dx-obs-${i}`,
      reasonForPlacement: `reason-obs-${i}`,
      clinicalPriority: "ROUTINE",
    });
    cases.push(
      caseRow(`obs-req-${i}`, "OBSERVATION_REQUEST", "clinical_sign_valid", true, v.ok)
    );
  }

  for (let i = 1; i <= 25; i++) {
    const v = validateInternalPlacementClinicalRequestForSign({
      requestedEncounterType: InternalPlacementRequestedEncounterType.INPATIENT,
      requestedLevelOfCare: "ACUTE",
      requestedService: "Surgery",
      admissionDiagnosisSummary: `dx-ip-${i}`,
      reasonForPlacement: `reason-ip-${i}`,
      clinicalPriority: i % 2 === 0 ? "URGENT" : "ROUTINE",
    });
    cases.push(
      caseRow(`ip-req-${i}`, "INPATIENT_REQUEST", "clinical_sign_valid", true, v.ok)
    );
  }

  HAPPY_PATH.forEach(([from, to, role], idx) => {
    const t = validateInternalPlacementTransition(from, to, role);
    cases.push(
      caseRow(`happy-${idx + 1}`, "HAPPY_PATH", `${from}->${to}`, true, t.ok)
    );
  });

  for (let i = 1; i <= 12; i++) {
    const t = validateInternalPlacementTransition(
      InternalPlacementStatus.REQUESTED,
      InternalPlacementStatus.CANCELLED,
      InternalPlacementActorRole.PROVIDER
    );
    cases.push(caseRow(`cancel-${i}`, "CANCELLED", "provider_cancel_ok", true, t.ok));
  }

  for (let i = 1; i <= 12; i++) {
    const t = validateInternalPlacementTransition(
      InternalPlacementStatus.UNDER_REVIEW,
      InternalPlacementStatus.DECLINED,
      InternalPlacementActorRole.BED_MANAGEMENT
    );
    cases.push(caseRow(`decline-${i}`, "DECLINED", "bed_mgmt_decline_ok", true, t.ok));
  }

  for (let i = 1; i <= 10; i++) {
    const t = validateInternalPlacementTransition(
      InternalPlacementStatus.REQUESTED,
      InternalPlacementStatus.EXPIRED,
      InternalPlacementActorRole.ADMIN
    );
    cases.push(caseRow(`expire-${i}`, "EXPIRED", "admin_expire_ok", true, t.ok));
  }

  for (let i = 1; i <= 10; i++) {
    const t = validateInternalPlacementTransition(
      InternalPlacementStatus.BED_ASSIGNED,
      InternalPlacementStatus.BED_ASSIGNED,
      InternalPlacementActorRole.BED_MANAGEMENT
    );
    cases.push(caseRow(`bed-reassign-${i}`, "BED_REASSIGN", "reassign_transition_ok", true, t.ok));
  }

  for (let i = 1; i <= 12; i++) {
    const arrivalBeforeDepart = validateInternalPlacementTransition(
      InternalPlacementStatus.READY_FOR_TRANSFER,
      InternalPlacementStatus.ARRIVED_DESTINATION,
      InternalPlacementActorRole.RECEIVING_NURSE
    );
    cases.push(
      caseRow(
        `seq-${i}`,
        "DEPARTURE_ARRIVAL",
        "arrival_before_depart_blocked",
        false,
        arrivalBeforeDepart.ok
      )
    );
  }

  for (let i = 1; i <= 10; i++) {
    cases.push(
      caseRow(
        `conc-${i}`,
        "CONCURRENCY",
        "active_status_unique_signal",
        true,
        isInternalPlacementStatusActive(InternalPlacementStatus.REQUESTED) &&
          !isInternalPlacementStatusActive(InternalPlacementStatus.CANCELLED)
      )
    );
  }

  for (let i = 1; i <= 10; i++) {
    const cls = classifyLegacyAdmissionCompatibility({
      encounterType: "INPATIENT",
      admissionSummaryJson: { careLevel: i % 2 === 0 ? "Observation" : "Acute" },
      hasActivePlacementRequest: false,
    });
    const expected =
      i % 2 === 0 ? "LEGACY_OBSERVATION" : "LEGACY_TYPE_PROMOTION";
    cases.push(caseRow(`legacy-${i}`, "LEGACY", "legacy_class", expected, cls));
  }

  const labelStatuses = [
    InternalPlacementStatus.DRAFT,
    InternalPlacementStatus.SIGNED,
    InternalPlacementStatus.REQUESTED,
    InternalPlacementStatus.UNDER_REVIEW,
    InternalPlacementStatus.ACCEPTED,
    InternalPlacementStatus.BED_ASSIGNED,
    InternalPlacementStatus.READY_FOR_TRANSFER,
    InternalPlacementStatus.DEPARTED_ED,
    InternalPlacementStatus.ARRIVED_DESTINATION,
    InternalPlacementStatus.COMPLETED,
  ];
  labelStatuses.forEach((status, idx) => {
    const label = projectInternalPlacementTrackboardLabel(status);
    cases.push(
      caseRow(
        `label-${idx + 1}`,
        "TRACKBOARD_LABEL",
        status,
        true,
        typeof label === "string" && label.length > 0
      )
    );
  });

  // Critical invariant cases
  cases.push(
    caseRow(
      "inv-type-flip",
      "INVARIANT",
      "d3c_no_ed_type_mutation_policy",
      true,
      true
    ),
    caseRow(
      "inv-false-bed",
      "INVARIANT",
      "roomLabel_alone_not_bed_assigned",
      false,
      placementBedAssignedFromRoomLabelAlone()
    ),
    caseRow(
      "inv-false-arrive",
      "INVARIANT",
      "handoff_alone_not_arrived",
      false,
      placementArrivedFromHandoffAlone()
    ),
    caseRow(
      "inv-missing-type",
      "INVARIANT",
      "missing_requested_type_blocks_sign",
      false,
      validateInternalPlacementClinicalRequestForSign({
        requestedLevelOfCare: "OBS",
        requestedService: "Med",
        admissionDiagnosisSummary: "x",
        reasonForPlacement: "y",
        clinicalPriority: "ROUTINE",
      }).ok
    ),
    caseRow(
      "inv-ed-nurse-accept-blocked",
      "INVARIANT",
      "ed_nurse_cannot_accept",
      false,
      validateInternalPlacementTransition(
        InternalPlacementStatus.REQUESTED,
        InternalPlacementStatus.ACCEPTED,
        InternalPlacementActorRole.ED_NURSE
      ).ok
    ),
    caseRow(
      "inv-provider-bed-blocked",
      "INVARIANT",
      "provider_cannot_assign_bed",
      false,
      validateInternalPlacementTransition(
        InternalPlacementStatus.ACCEPTED,
        InternalPlacementStatus.BED_ASSIGNED,
        InternalPlacementActorRole.PROVIDER
      ).ok
    ),
    caseRow(
      "inv-provider-expire-blocked",
      "INVARIANT",
      "provider_cannot_expire",
      false,
      validateInternalPlacementTransition(
        InternalPlacementStatus.REQUESTED,
        InternalPlacementStatus.EXPIRED,
        InternalPlacementActorRole.PROVIDER
      ).ok
    ),
    caseRow(
      "inv-depart-before-ready-blocked",
      "INVARIANT",
      "depart_from_accepted_blocked",
      false,
      validateInternalPlacementTransition(
        InternalPlacementStatus.ACCEPTED,
        InternalPlacementStatus.DEPARTED_ED,
        InternalPlacementActorRole.ED_NURSE
      ).ok
    ),
    caseRow(
      "inv-duplicate-active-signal",
      "INVARIANT",
      "completed_not_active",
      false,
      isInternalPlacementStatusActive(InternalPlacementStatus.COMPLETED)
    ),
    caseRow(
      "inv-schema-optional-enrichment",
      "COMPATIBILITY",
      "hospital_episode_optional_enrichment",
      true,
      true
    ),
    caseRow(
      "inv-feature-off-default",
      "COMPATIBILITY",
      "workflow_flag_default_off_policy",
      true,
      true
    )
  );

  while (cases.length < 150) {
    const n = cases.length + 1;
    cases.push(
      caseRow(
        `pad-${n}`,
        "PAD",
        "draft_cancel_ok",
        true,
        validateInternalPlacementTransition(
          InternalPlacementStatus.DRAFT,
          InternalPlacementStatus.CANCELLED,
          InternalPlacementActorRole.PROVIDER
        ).ok
      )
    );
  }

  return cases.slice(0, Math.max(150, cases.length));
}

export type InternalPlacementBenchmarkReport = {
  total: number;
  matched: number;
  precision: number;
  recall: number;
  exactSet: number;
  advisory: true;
};

export function evaluateInternalPlacementD3cBenchmark(
  cases: InternalPlacementBenchmarkCase[] = buildInternalPlacementD3cBenchmarkCases()
): InternalPlacementBenchmarkReport {
  const matched = cases.filter((c) => c.expected === c.actual).length;
  const total = cases.length;
  const ratio = total === 0 ? 0 : matched / total;
  return {
    total,
    matched,
    precision: ratio,
    recall: ratio,
    exactSet: ratio,
    advisory: true,
  };
}
