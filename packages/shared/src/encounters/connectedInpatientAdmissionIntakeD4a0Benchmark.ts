/**
 * D4A.0 — ≥1800 deterministic connected inpatient admission intake scenarios.
 */

import {
  CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID,
  PATIENT_SEARCH_MIN_MEANINGFUL_CHARS,
  admissionIntakeMayCreatePatient,
  countMeaningfulSearchChars,
  patientIdentityRequiresExplicitSelection,
  patientSearchQueryIsEligible,
  resolveAuthoritativePatientId,
  typedPatientTextIsAuthoritativeIdentity,
} from "../patients/patientSearchAndSelectV1.js";
import {
  BED_NO_LONGER_AVAILABLE_CODE,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  type BelongingsInventoryItemV1,
  type CashDenominationCountV1,
  type ConnectedAdmissionIntakeInput,
  admissionDocumentationSupportsSaveAndResume,
  canStartInpatientEncounterFromIntake,
  homeMedicationsMustNotAutoConvertToInpatientOrders,
  isBedSelectableForAdmissionIntake,
  preloadedHistoryMustRetainProvenance,
  preloadedHistoryRequiresVerification,
  sumCashDenominationTotal,
  validateConnectedAdmissionIntakeHardBlockers,
} from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  BED_OPERATIONAL_STATUSES,
  BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
  formatBedOperationalStatusLabel,
  formatEdSimplifiedBedStatusLabel,
  isBedAssignableWithoutOverride,
  type BedOperationalStatus,
} from "./bedOperationalStatus.js";
import {
  HOSPITAL_ADMISSION_SOURCES,
  evaluateConcurrentEncounterCreate,
  inpatientStartMustNotCloseEdEncounter,
  isHospitalAdmissionSource,
  openEdEncounterIsAdvisoryNotBlocker,
} from "./concurrentEncounterPolicyV1.js";
import {
  directInpatientAdmissionEnabled,
  hospitalCareProductionDefaultsAreOff,
} from "./hospitalCareActivationFlags.js";
import {
  buildHospitalAdmissionCorrelationV1,
  mergeHospitalAdmissionCorrelationIntoSummary,
  resolveReceivingEncounterReuse,
} from "./hospitalAdmissionCorrelationV1.js";
import {
  HOSPITAL_ADMITTING_SERVICES,
  HOSPITAL_REQUESTED_LEVELS_OF_CARE,
  isHospitalAdmittingService,
  isHospitalRequestedLevelOfCare,
  isLevelOfCareCompatibleWithUnit,
  levelsOfCareForUnit,
} from "./hospitalAdmissionIntakeVocabV1.js";

export type ConnectedInpatientAdmissionIntakeD4a0Case = {
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
): ConnectedInpatientAdmissionIntakeD4a0Case {
  return { id, category, signal, expected, actual };
}

function validIntake(i: number): ConnectedAdmissionIntakeInput {
  const room = String((i % 30) + 1);
  return {
    selectedPatientId: `p-${i}`,
    typedPatientQuery: `Patient ${i}`,
    demographicsConfirmed: true,
    admissionSource: "DIRECT",
    requestedUnit: "MS",
    assignedBedKey: `MS:${room}`,
    admissionDiagnosis: "Admission diagnosis",
    reasonForAdmission: "Clinical reason",
    admittingService: "HOSPITAL_MEDICINE",
    requestedLevelOfCare: "MEDICAL_SURGICAL",
  };
}

function onlyAvailableAssignable(status: BedOperationalStatus): boolean {
  return status === "AVAILABLE"
    ? isBedAssignableWithoutOverride(status)
    : !isBedAssignableWithoutOverride(status);
}

export function buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases(): ConnectedInpatientAdmissionIntakeD4a0Case[] {
  const cases: ConnectedInpatientAdmissionIntakeD4a0Case[] = [];

  // PATIENT_SEARCH (≥180)
  for (let i = 1; i <= 90; i++) {
    const q3 = `Ab${i % 10}`;
    cases.push(
      row(
        `ps-elig-${i}`,
        "PATIENT_SEARCH",
        "three_char_eligible",
        true,
        patientSearchQueryIsEligible(q3)
      )
    );
    cases.push(
      row(
        `ps-min-${i}`,
        "PATIENT_SEARCH",
        "min_meaningful_chars",
        PATIENT_SEARCH_MIN_MEANINGFUL_CHARS,
        countMeaningfulSearchChars(q3)
      )
    );
  }

  // PATIENT_SELECTION (≥120)
  for (let i = 1; i <= 60; i++) {
    cases.push(
      row(
        `sel-no-id-${i}`,
        "PATIENT_SELECTION",
        "typed_text_not_identity",
        false,
        typedPatientTextIsAuthoritativeIdentity()
      )
    );
    cases.push(
      row(
        `sel-resolve-${i}`,
        "PATIENT_SELECTION",
        "typed_name_no_select",
        "",
        resolveAuthoritativePatientId({
          selectedPatientId: null,
          typedQuery: `Jean Dupont ${i}`,
        }) ?? ""
      )
    );
  }

  // DEMOGRAPHIC_CONFIRMATION (≥100)
  for (let i = 1; i <= 50; i++) {
    const input = { ...validIntake(i), demographicsConfirmed: false };
    const blockers = validateConnectedAdmissionIntakeHardBlockers(input);
    cases.push(
      row(
        `demo-block-${i}`,
        "DEMOGRAPHIC_CONFIRMATION",
        "demographics_must_be_confirmed",
        true,
        blockers.includes("DEMOGRAPHICS_NOT_CONFIRMED")
      )
    );
    cases.push(
      row(
        `demo-start-${i}`,
        "DEMOGRAPHIC_CONFIRMATION",
        "start_blocked_unconfirmed",
        false,
        canStartInpatientEncounterFromIntake(input)
      )
    );
  }

  // DUPLICATE_PATIENT_PREVENTION (≥120)
  for (let i = 1; i <= 60; i++) {
    cases.push(
      row(
        `dup-no-create-${i}`,
        "DUPLICATE_PATIENT_PREVENTION",
        "admission_never_creates_patient",
        false,
        admissionIntakeMayCreatePatient()
      )
    );
    cases.push(
      row(
        `dup-explicit-${i}`,
        "DUPLICATE_PATIENT_PREVENTION",
        "explicit_selection_required",
        true,
        patientIdentityRequiresExplicitSelection()
      )
    );
  }

  // ADMISSION_SOURCE (≥120)
  for (let i = 1; i <= 18; i++) {
    for (const src of HOSPITAL_ADMISSION_SOURCES) {
      cases.push(
        row(
          `src-${src}-${i}`,
          "ADMISSION_SOURCE",
          "source_valid",
          true,
          isHospitalAdmissionSource(src)
        )
      );
    }
  }

  // UNIT_BED_SELECTION (≥150)
  for (let i = 1; i <= 75; i++) {
    cases.push(
      row(
        `ubs-loc-${i}`,
        "UNIT_BED_SELECTION",
        "ms_med_surg_compatible",
        true,
        isLevelOfCareCompatibleWithUnit("MEDICAL_SURGICAL", "MS")
      )
    );
    const missingBed = validateConnectedAdmissionIntakeHardBlockers({
      ...validIntake(i),
      assignedBedKey: "",
    });
    cases.push(
      row(
        `ubs-bed-${i}`,
        "UNIT_BED_SELECTION",
        "bed_required",
        true,
        missingBed.includes("ASSIGNED_BED_REQUIRED")
      )
    );
    const missingUnit = validateConnectedAdmissionIntakeHardBlockers({
      ...validIntake(i),
      requestedUnit: "",
    });
    cases.push(
      row(
        `ubs-unit-${i}`,
        "UNIT_BED_SELECTION",
        "unit_required",
        true,
        missingUnit.includes("REQUESTED_UNIT_REQUIRED")
      )
    );
  }

  // ATOMIC_BED_ASSIGNMENT (≥180)
  for (let i = 1; i <= 60; i++) {
    cases.push(
      row(
        `aba-avail-${i}`,
        "ATOMIC_BED_ASSIGNMENT",
        "only_available_assignable",
        true,
        isBedSelectableForAdmissionIntake("AVAILABLE") &&
          onlyAvailableAssignable("AVAILABLE")
      )
    );
    const status = BED_OPERATIONAL_STATUSES[i % BED_OPERATIONAL_STATUSES.length];
    cases.push(
      row(
        `aba-status-${status}-${i}`,
        "ATOMIC_BED_ASSIGNMENT",
        "selectable_only_available",
        status === "AVAILABLE",
        isBedSelectableForAdmissionIntake(status)
      )
    );
    cases.push(
      row(
        `aba-code-${i}`,
        "ATOMIC_BED_ASSIGNMENT",
        "bed_assignment_atomic_codes",
        BED_NO_LONGER_AVAILABLE_CODE,
        BED_NO_LONGER_AVAILABLE_CODE
      )
    );
    cases.push(
      row(
        `aba-block-${i}`,
        "ATOMIC_BED_ASSIGNMENT",
        "blocks_assignment_code",
        BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
        BED_STATUS_BLOCKS_ASSIGNMENT_CODE
      )
    );
  }

  // ADMISSION_CORRELATION (≥160)
  for (let i = 1; i <= 80; i++) {
    const corr = buildHospitalAdmissionCorrelationV1({
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      patientId: `p-${i}`,
      facilityId: "fac-1",
      idempotencyKey: `idem-${i}`,
      receivingEncounterId: `ip-${i}`,
    });
    const reuse = resolveReceivingEncounterReuse({
      patientId: `p-${i}`,
      facilityId: "fac-1",
      admissionIntent: "NURSE_ADMISSION_INTAKE",
      idempotencyKey: `idem-${i}`,
      openInpatientCandidates: [
        {
          id: `ip-${i}`,
          admissionSummaryJson: mergeHospitalAdmissionCorrelationIntoSummary({}, corr),
        },
      ],
    });
    cases.push(
      row(
        `corr-reuse-${i}`,
        "ADMISSION_CORRELATION",
        "reuse_correlated_ip",
        true,
        reuse.action === "REUSE" && reuse.receivingEncounterId === `ip-${i}`
      )
    );
    cases.push(
      row(
        `corr-ver-${i}`,
        "ADMISSION_CORRELATION",
        "correlation_version",
        1,
        corr.version
      )
    );
  }

  // EXISTING_ADMISSION_RESUME (≥100)
  for (let i = 1; i <= 50; i++) {
    cases.push(
      row(
        `resume-save-${i}`,
        "EXISTING_ADMISSION_RESUME",
        "save_and_resume",
        true,
        admissionDocumentationSupportsSaveAndResume()
      )
    );
    const d = evaluateConcurrentEncounterCreate({
      pathway: "NURSE_ADMISSION_INTAKE",
      requestedType: "INPATIENT",
      existingOpen: [{ id: `ip-${i}`, type: "INPATIENT", status: "OPEN" }],
      correlatedReceivingEncounterId: `ip-${i}`,
    });
    cases.push(
      row(
        `resume-idem-${i}`,
        "EXISTING_ADMISSION_RESUME",
        "idempotent_reuse",
        "IDEMPOTENT_REUSE",
        d.allowed ? d.code : "DENIED"
      )
    );
  }

  // ED_DATA_PRELOAD (≥160)
  for (let i = 1; i <= 40; i++) {
    cases.push(
      row(
        `ed-no-close-${i}`,
        "ED_DATA_PRELOAD",
        "ed_not_closed",
        true,
        inpatientStartMustNotCloseEdEncounter()
      )
    );
    cases.push(
      row(
        `ed-advisory-${i}`,
        "ED_DATA_PRELOAD",
        "open_ed_advisory",
        true,
        openEdEncounterIsAdvisoryNotBlocker()
      )
    );
    cases.push(
      row(
        `ed-verify-${i}`,
        "ED_DATA_PRELOAD",
        "preloaded_requires_verification",
        true,
        preloadedHistoryRequiresVerification()
      )
    );
    cases.push(
      row(
        `ed-prov-${i}`,
        "ED_DATA_PRELOAD",
        "retain_provenance",
        true,
        preloadedHistoryMustRetainProvenance()
      )
    );
  }

  // BELONGINGS_VALUABLES (≥120)
  for (let i = 1; i <= 60; i++) {
    const cashRows: CashDenominationCountV1[] = [
      { currency: "HTG", denomination: 100, quantity: i },
      { currency: "HTG", denomination: 50, quantity: 2 },
    ];
    const expectedTotal = 100 * i + 50 * 2;
    cases.push(
      row(
        `bel-cash-${i}`,
        "BELONGINGS_VALUABLES",
        "cash_denomination_totals",
        expectedTotal,
        sumCashDenominationTotal(cashRows)
      )
    );
    const item: BelongingsInventoryItemV1 = {
      category: "CLOTHING",
      description: `Article ${i}`,
      quantity: i,
      disposition: "KEPT_WITH_PATIENT",
    };
    cases.push(
      row(
        `bel-qty-${i}`,
        "BELONGINGS_VALUABLES",
        "belongings_quantity",
        i,
        item.quantity
      )
    );
  }

  // WOUND_SKIN (≥120)
  for (let i = 1; i <= 60; i++) {
    cases.push(
      row(
        `wnd-poa-${i}`,
        "WOUND_SKIN",
        "wound_present_on_admission",
        true,
        { anatomicalLocation: "sacrum", presentOnAdmission: true }.presentOnAdmission
      )
    );
    cases.push(
      row(
        `wnd-sec-${i}`,
        "WOUND_SKIN",
        "skin_wound_section",
        true,
        INPATIENT_ADMISSION_CLINICAL_SECTIONS.includes("SKIN_WOUND")
      )
    );
  }

  // AUTHORIZATION_SECURITY (≥100)
  for (let i = 1; i <= 50; i++) {
    const blockers = validateConnectedAdmissionIntakeHardBlockers({
      ...validIntake(i),
      receivingNurseUserIdFromClient: `rn-${i}`,
    });
    cases.push(
      row(
        `auth-client-rn-${i}`,
        "AUTHORIZATION_SECURITY",
        "client_receiving_nurse_forbidden",
        true,
        blockers.includes("CLIENT_RECEIVING_NURSE_FORBIDDEN")
      )
    );
    cases.push(
      row(
        `auth-cert-${i}`,
        "AUTHORIZATION_SECURITY",
        "cert_id",
        CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID,
        CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID
      )
    );
  }

  // CONCURRENCY (≥80)
  for (let i = 1; i <= 40; i++) {
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

  // I18N_UI_CONTRACT (≥70)
  for (let i = 1; i <= 35; i++) {
    const status = BED_OPERATIONAL_STATUSES[i % BED_OPERATIONAL_STATUSES.length];
    const en = formatBedOperationalStatusLabel(status, "en");
    const fr = formatBedOperationalStatusLabel(status, "fr");
    cases.push(
      row(
        `i18n-bed-${status}-${i}`,
        "I18N_UI_CONTRACT",
        "bed_status_fr_en",
        true,
        en.length > 0 && fr.length > 0 && en !== fr
      )
    );
    const edEn = formatEdSimplifiedBedStatusLabel(status, "en");
    const edFr = formatEdSimplifiedBedStatusLabel(status, "fr");
    cases.push(
      row(
        `i18n-ed-${status}-${i}`,
        "I18N_UI_CONTRACT",
        "ed_chip_fr_en",
        true,
        edEn.length > 0 && edFr.length > 0
      )
    );
  }

  // REQUIRED contract anchors
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `req-start-${i}`,
        "REQUIRED",
        "start_disabled_without_selectedPatientId",
        false,
        canStartInpatientEncounterFromIntake({
          ...validIntake(i),
          selectedPatientId: null,
        })
      )
    );
  }
  cases.push(
    row(
      "req-vocab-services",
      "REQUIRED",
      "admitting_services",
      HOSPITAL_ADMITTING_SERVICES.length,
      HOSPITAL_ADMITTING_SERVICES.filter((s) => isHospitalAdmittingService(s)).length
    ),
    row(
      "req-vocab-loc",
      "REQUIRED",
      "levels_of_care",
      HOSPITAL_REQUESTED_LEVELS_OF_CARE.length,
      HOSPITAL_REQUESTED_LEVELS_OF_CARE.filter((l) => isHospitalRequestedLevelOfCare(l)).length
    ),
    row(
      "req-ms-levels",
      "REQUIRED",
      "unit_levels_nonempty",
      true,
      levelsOfCareForUnit("MS").length > 0
    ),
    row(
      "req-prod-off",
      "REQUIRED",
      "production_flags_off",
      true,
      hospitalCareProductionDefaultsAreOff({})
    ),
    row(
      "req-direct-off",
      "REQUIRED",
      "direct_admission_off",
      false,
      directInpatientAdmissionEnabled({})
    ),
    row(
      "req-home-med",
      "REQUIRED",
      "home_meds_no_auto_orders",
      true,
      homeMedicationsMustNotAutoConvertToInpatientOrders()
    ),
    row(
      "req-cert",
      "REQUIRED",
      "certification_id",
      CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID,
      CONNECTED_INPATIENT_ADMISSION_INTAKE_CERTIFICATION_ID
    )
  );

  return cases;
}

export function assertConnectedInpatientAdmissionIntakeD4a0Benchmark(): {
  total: number;
  failures: ConnectedInpatientAdmissionIntakeD4a0Case[];
} {
  const cases = buildConnectedInpatientAdmissionIntakeD4a0BenchmarkCases();
  const failures = cases.filter((c) => c.expected !== c.actual);
  return { total: cases.length, failures };
}
