/**
 * EDOC.TEST.2 — build runtime coverage fixtures for all 197 AVAILABLE cards.
 * Run: pnpm --filter @medora/shared build && pnpm --filter @medora/api build && node scripts/build-clinical-documentation-runtime-coverage.mjs
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const shared = require(join(root, "packages/shared/dist/index.js"));
const { CLINICAL_DOCUMENTATION_CARDS } = require(
  join(root, "packages/shared/dist/clinicalDocumentation/clinicalDocumentationRegistry.js")
);
const { validatePayloadForCard, summarizeClinicalDocumentationPayload } = require(
  join(root, "packages/shared/dist/clinicalDocumentation/clinicalDocumentationEntry.js")
);

const ISO = "2026-05-28T12:00:00.000Z";
const ISO14 = "2026-05-28T14:00:00.000Z";

/** @type {Record<string, Record<string, unknown>>} */
const PAYLOADS = {};

function add(cardId, payload) {
  PAYLOADS[cardId] = payload;
}

// --- Gap cards (domain tests / explicit supplements) — applied last via MANUAL_OVERRIDES too ---
add("edoc_basic_structured_v1", { items: [{ key: "Note", value: "Test" }] });

add("io_intake_output", {
  summaryStartTime: ISO,
  summaryEndTime: ISO14,
  totalIntakeMl: 1200,
  totalOutputMl: 800,
  netBalanceMl: 400,
  includesEstimatedValues: false,
  reviewedByNurse: true,
  providerNotified: false,
});
add("io_fluid_intake", {
  recordedAt: ISO14,
  amount: 500,
  unit: "ML",
  route: "IV",
  fluidType: "Normal saline",
});
add("io_iv_intake", {
  recordedAt: ISO14,
  amount: 1000,
  unit: "ML",
  fluidType: "LR",
  infusionRelated: true,
});
add("io_stool_output", {
  recordedAt: ISO14,
  occurrenceCount: 1,
  consistency: "FORMED",
});
add("io_emesis_output", {
  recordedAt: ISO14,
  occurrenceCount: 2,
  appearance: "BILIOUS",
  amount: 100,
  unit: "ML",
});
add("io_ng_output", {
  recordedAt: ISO14,
  amount: 75,
  unit: "ML",
  appearance: "BILIOUS",
  suctionType: "LOW_INTERMITTENT",
});
add("io_drain_output", {
  recordedAt: ISO14,
  amount: 50,
  unit: "ML",
  drainType: "JP",
  appearance: "SEROSANGUINOUS",
});

add("obs_boarding", {
  boardingReason: "ED capacity",
  location: "Hall B",
  safetyCheckCompleted: true,
  comfortMeasuresOffered: true,
  nutritionOffered: false,
  toiletingOffered: true,
  providerUpdated: false,
});
add("obs_reassessment", {
  reassessmentTime: ISO14,
  patientCondition: "IMPROVED",
  vitalsReviewed: true,
  pendingResults: false,
  providerNotified: true,
  painScore: 3,
});
add("obs_discharge_readiness", {
  instructionsReviewed: true,
  medicationsReviewed: true,
  followUpReviewed: true,
  returnPrecautionsReviewed: true,
  transportationConfirmed: true,
  patientVerbalizedUnderstanding: true,
  barriersIdentified: false,
});

add("belongings_inventory", {
  documentedAt: ISO,
  patientAbleToParticipate: true,
  clothingItems: ["Coat"],
  personalItems: [],
  assistiveDevices: [],
  medicationsBroughtFromHome: false,
  belongingsKeptWithPatient: true,
  belongingsBagged: false,
});
add("belongings_secured_bagged", {
  securedAt: ISO,
  bagIdentifier: "BAG-001",
  sealedByUserAcknowledged: true,
  patientLabelApplied: true,
  storageLocation: "WITH_PATIENT",
  witnessRequired: false,
});
add("valuables_inventory", {
  documentedAt: ISO,
  cashPresent: false,
  jewelryPresent: false,
  electronicsPresent: false,
  walletOrPursePresent: false,
  keysPresent: false,
  identificationPresent: false,
  patientDeclinedValuablesInventory: false,
  valuablesSecured: false,
});
add("belongings_transfer_security", {
  transferredAt: ISO,
  bagIdentifier: "BAG-SEC",
  transferredByUserAcknowledged: true,
  receivedBySecurityName: "Security Desk",
  storageLocation: "SECURITY",
});
add("belongings_altered_patient", {
  documentedAt: ISO,
  patientCondition: "UNCONSCIOUS",
  belongingsInventoriedByTwoStaff: true,
  bagIdentifier: "BAG-ALT",
  valuablesPresent: false,
  securityNotified: true,
  familyNotified: false,
});
add("belongings_release_representative", {
  releasedAt: ISO,
  bagIdentifier: "BAG-REL",
  recipientName: "Family member",
  recipientRelationship: "SPOUSE",
  recipientIdChecked: true,
  patientAuthorizedRelease: true,
  releaseReason: "DISCHARGE",
});
add("belongings_return_patient", {
  returnedAt: ISO,
  bagIdentifier: "BAG-RET",
  patientReceived: true,
  patientUnableToSign: false,
  discrepancyReported: false,
});

add("elopement_risk_assessment", {
  assessmentTime: ISO14,
  riskLevel: "LOW",
  confusedOrDisoriented: false,
  attemptedToLeave: false,
  verbalizedIntentToLeave: false,
  requiresSecureArea: false,
  providerNotified: false,
  familyNotified: false,
});
add("agitation_violence_risk_assessment", {
  assessmentTime: ISO14,
  agitationLevel: "MILD",
  violenceRisk: "LOW",
  verbalThreats: false,
  physicalAggression: false,
  propertyDestruction: false,
  weaponConcern: false,
  securityNotified: false,
  providerNotified: false,
});

add("chest_pain_reassessment", {
  assessmentTime: ISO14,
  painScore: 4,
  painImproved: "YES",
  painResolved: "NO",
  radiationPresent: "NO",
  shortnessOfBreath: "NO",
  diaphoresis: "NO",
  repeatECGPerformed: "NO",
  providerNotified: "NO",
});
add("qtc_monitoring", {
  assessmentTime: ISO,
  qtcValue: 420,
  highRiskMedicationPresent: "NO",
  providerNotified: "NO",
});
add("pacemaker_monitoring", {
  assessmentTime: ISO,
  pacedRhythmObserved: "YES",
  capturePresent: "YES",
  patientStable: "YES",
  providerNotified: "NO",
});
add("rhythm_strip_documentation", {
  assessmentTime: ISO,
  rhythm: "SINUS_RHYTHM",
  rate: 78,
  stripReviewedByClinician: "YES",
  interpretation: "NORMAL",
  providerNotified: "NO",
});
add("telemetry_reassessment", {
  assessmentTime: ISO,
  currentRhythm: "SINUS_RHYTHM",
  heartRate: 80,
  bloodPressure: "120/80",
  symptomatic: "NO",
  chestPain: "NO",
  palpitations: "NO",
  shortnessOfBreath: "NO",
  changeFromPrevious: "NO",
  providerNotified: "NO",
});
add("ecg_12_lead_documentation", {
  ecgTime: ISO14,
  reason: "CHEST_PAIN",
  performed: "YES",
  transmittedToProvider: "YES",
  providerReviewed: "YES",
  criticalFindingPresent: "NO",
  providerNotified: "NO",
});

add("stroke_abcd2", {
  assessedAt: ISO14,
  age60OrOlder: true,
  bloodPressureElevated: true,
  clinicalFeature: "UNILATERAL_WEAKNESS",
  duration: "GREATER_EQUAL_60_MIN",
  diabetes: false,
  totalScore: 6,
});
add("stroke_cincinnati", {
  assessedAt: ISO14,
  facialDroop: "NORMAL",
  armDrift: "NORMAL",
  speech: "NORMAL",
  result: "NEGATIVE",
  providerNotified: false,
});
add("stroke_van_assessment", {
  assessedAt: ISO14,
  armWeaknessPresent: false,
  visualDisturbance: false,
  aphasia: false,
  neglect: false,
  result: "NEGATIVE",
  providerNotified: false,
});
add("stroke_neuro_checks", {
  assessedAt: ISO14,
  levelOfConsciousness: "Alert",
  orientation: "x4",
  pupils: "PERRLA",
  gripLeft: "Strong",
  gripRight: "Strong",
  motorLeft: "5/5",
  motorRight: "5/5",
  sensation: "Intact",
  speech: "Clear",
  changesFromPrior: "NO",
  providerNotified: false,
});
add("stroke_timeline", {
  lastKnownWellTime: ISO,
  arrivalTime: ISO14,
  ctCompletedTime: ISO14,
  thrombolyticDecisionTime: ISO14,
});

add("frequent_neuro_reassessment", {
  assessmentTime: ISO14,
  frequency: "Q1H",
  neuroStatus: "UNCHANGED",
  providerNotified: false,
});
add("pupillary_assessment", {
  assessmentTime: ISO,
  leftPupilSize: 3,
  rightPupilSize: 4,
  leftReaction: "BRISK",
  rightReaction: "SLUGGISH",
  anisocoriaPresent: true,
  providerNotified: true,
});
add("motor_strength_assessment", {
  assessmentTime: ISO,
  lue: 5,
  rue: 4,
  lle: 5,
  rle: 5,
  pronatorDrift: "NONE",
  providerNotified: false,
});

// --- Legal coverage (TEST1 + EDOC23B) ---
const legalFixtures = require(
  join(root, "apps/api/dist/encounters/clinical-documentation-legal-coverage.fixtures.js")
);
for (const f of [
  ...legalFixtures.EDOC_TEST1_ALL_HIGH_RISK_FIXTURES,
  ...legalFixtures.EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
]) {
  add(f.cardId, f.payload);
}

// --- Spec extraction (symbol keys resolved via shared exports) ---
let specPayloads = {};
try {
  specPayloads = require(join(root, "scripts/clinical-documentation-spec-runtime-payloads.mjs")).default;
} catch {
  console.warn("Run scripts/extract-clinical-documentation-spec-payloads.mjs first");
}

for (const [key, payload] of Object.entries(specPayloads)) {
  if (key.startsWith("__SYM__")) {
    const sym = key.slice("__SYM__".length);
    const cardId = shared[sym];
    if (typeof cardId === "string") add(cardId, payload);
  } else if (!key.includes("_CARD_ID")) {
    add(key, payload);
  }
}

const NIHSS_BASE = {
  assessedAt: ISO14,
  levelOfConsciousness: 0,
  locQuestions: 1,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 1,
  motorArmLeft: 2,
  motorArmRight: 0,
  motorLegLeft: 1,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
  totalScore: 5,
};

/** Explicit payloads when spec extractor misses spread/const blocks or emits invalid shapes. */
const MANUAL_OVERRIDES = {
  frequent_neuro_reassessment: {
    assessmentTime: ISO14,
    frequency: "Q1H",
    neuroStatus: "UNCHANGED",
    providerNotified: false,
  },
  telemetry_reassessment: {
    assessmentTime: ISO,
    currentRhythm: "SINUS_RHYTHM",
    heartRate: 80,
    bloodPressure: "120/80",
    symptomatic: "NO",
    chestPain: "NO",
    palpitations: "NO",
    shortnessOfBreath: "NO",
    changeFromPrevious: "NO",
    providerNotified: "NO",
  },
  rhythm_strip_documentation: {
    assessmentTime: ISO,
    rhythm: "SINUS_RHYTHM",
    rate: 78,
    stripReviewedByClinician: "YES",
    interpretation: "NORMAL",
    providerNotified: "NO",
  },
  belongings_secured_bagged: {
    securedAt: ISO,
    bagIdentifier: "BAG-001",
    sealedByUserAcknowledged: true,
    patientLabelApplied: true,
    storageLocation: "WITH_PATIENT",
    witnessRequired: false,
  },
  belongings_release_representative: {
    releasedAt: ISO,
    bagIdentifier: "BAG-REL",
    recipientName: "Family member",
    recipientRelationship: "SPOUSE",
    recipientIdChecked: true,
    patientAuthorizedRelease: true,
    releaseReason: "DISCHARGE_PLANNING",
  },
  nihss_reassessment: {
    ...NIHSS_BASE,
    previousScore: 3,
    scoreChange: 2,
    worseningDetected: true,
    providerNotified: true,
    providerNotificationTime: "2026-05-28T14:05:00.000Z",
  },
  sepsis_screening: {
    screeningTime: ISO14,
    suspectedInfection: "YES",
    temperatureAbnormal: "YES",
    heartRateAbnormal: "YES",
    respiratoryRateAbnormal: "NO",
    wbcAbnormalOrUnknown: "NO",
    alteredMentalStatus: "NO",
    hypotensionPresent: "NO",
    lactateConcern: "NO",
    screenPositive: "YES",
    providerNotified: "YES",
    providerNotificationTime: ISO14,
  },
  sirs_assessment: {
    assessmentTime: ISO14,
    temperatureCriteriaMet: "YES",
    heartRateCriteriaMet: "YES",
    respiratoryCriteriaMet: "NO",
    wbcCriteriaMet: "NO",
    criteriaCount: 2,
    sirsPositive: "YES",
    providerNotified: "YES",
  },
  qsofa_assessment: {
    assessmentTime: ISO14,
    respiratoryRateHigh: "YES",
    alteredMentation: "YES",
    systolicBpLow: "NO",
    score: 2,
    qsofaPositive: "YES",
    providerNotified: "YES",
  },
  suspected_infection_assessment: {
    assessmentTime: ISO14,
    suspectedSource: "URINARY",
    infectionSignsPresent: "YES",
    culturesConsidered: "YES",
    providerNotified: "YES",
  },
  sepsis_bundle_tracking: {
    bundleStartTime: ISO14,
    bundleType: "THREE_HOUR",
    lactateOrderedOrResulted: "YES",
    bloodCulturesBeforeAntibiotics: "YES",
    antibioticsDocumentedInMar: "YES",
    fluidsOrderedOrStarted: "YES",
    vasopressorsOrderedOrStarted: "NOT_APPLICABLE",
    providerNotified: "YES",
    bundleVariancePresent: "NO",
  },
  lactate_monitoring: {
    documentedAt: ISO14,
    lactateValue: 2.5,
    lactateUnit: "MMOL_L",
    lactateResultAvailable: "YES",
    repeatLactateNeeded: "YES",
    providerNotified: "YES",
  },
  blood_culture_documentation: {
    documentedAt: ISO14,
    culturesCollected: "YES",
    collectionTime: ISO14,
    numberOfSets: 2,
    collectedBeforeAntibiotics: "YES",
    providerNotified: "NO",
  },
  antibiotic_timing_reference: {
    documentedAt: ISO14,
    antibioticsDocumentedInMar: "YES",
    firstAntibioticTime: ISO14,
    antibioticNameReferenced: "Ceftriaxone",
    providerNotified: "NO",
    delayOrVariancePresent: "NO",
  },
  fluid_resuscitation_monitoring: {
    assessmentTime: ISO14,
    fluidBolusOrderedOrStarted: "YES",
    fluidType: "NORMAL_SALINE",
    volumeMl: 1000,
    thirtyMlPerKgTargetConsidered: "YES",
    bloodPressureResponse: "IMPROVED",
    providerNotified: "NO",
  },
  septic_shock_reassessment: {
    reassessmentTime: ISO14,
    hypotensionPersistent: "YES",
    lactateFourOrGreater: "YES",
    vasopressorsStartedOrOrdered: "YES",
    mentalStatusChanged: "NO",
    urineOutputConcern: "YES",
    providerAtBedside: "YES",
    providerNotified: "YES",
  },
  sepsis_escalation_event: {
    eventTime: ISO14,
    reason: "LACTATE_ELEVATED",
    providerNotified: "YES",
    providerNotificationTime: ISO14,
    responseReceived: "YES",
    rapidResponseActivated: "NO",
  },
  nursing_admission_assessment: {
    assessmentTime: ISO14,
    admissionSource: "ED",
    admissionReason: "Chest pain observation",
    baselineMentalStatus: "ALERT_ORIENTED",
    baselineMobility: "INDEPENDENT",
    fallRiskReviewed: "YES",
    skinAssessmentCompleted: "YES",
    painAssessmentCompleted: "YES",
    belongingsReviewed: "YES",
    homeMedicationsReviewed: "YES",
    allergiesReviewed: "YES",
    advanceDirectivesReviewed: "UNKNOWN",
    infectionScreeningCompleted: "YES",
    educationNeedsIdentified: "NO",
    interpreterNeeded: "NO",
    providerNotified: "NO",
  },
  nursing_shift_assessment: {
    assessmentTime: ISO14,
    shift: "DAY",
    mentalStatus: "ALERT_ORIENTED",
    respiratoryStatus: "STABLE",
    cardiacStatus: "STABLE",
    giStatus: "NORMAL",
    guStatus: "NORMAL",
    skinStatus: "INTACT",
    mobilityStatus: "INDEPENDENT",
    painStatus: "NO_PAIN",
    safetyStatus: "STANDARD",
    providerNotified: "NO",
  },
  head_to_toe_assessment: {
    assessmentTime: ISO14,
    neuro: "WDL",
    respiratory: "WDL",
    cardiac: "WDL",
    gastrointestinal: "WDL",
    genitourinary: "WDL",
    skin: "WDL",
    musculoskeletal: "WDL",
    psychosocial: "WDL",
    abnormalFindingsPresent: "NO",
    providerNotified: "NO",
  },
  systems_assessment: {
    assessmentTime: ISO14,
    system: "RESPIRATORY",
    status: "IMPROVED",
    providerNotified: "NO",
  },
  nursing_care_plan_initiation: {
    initiatedAt: ISO14,
    primaryNursingProblem: "FALL_RISK",
    goal: "NO_FALLS",
    interventionsPlanned: ["SAFETY_PRECAUTIONS", "EDUCATION"],
    patientParticipated: "YES",
    providerNotified: "NO",
  },
  nursing_care_plan_update: {
    updatedAt: ISO14,
    problemAddressed: "Fall risk",
    goalStatus: "IN_PROGRESS",
    interventionStatus: "CONTINUED",
    patientProgress: "IMPROVED",
    providerNotified: "NO",
  },
  nursing_patient_goals_outcomes: {
    documentedAt: ISO14,
    goalType: "MOBILITY",
    goalDescription: "Ambulate with walker",
    outcomeStatus: "IN_PROGRESS",
    barrierPresent: "NO",
  },
  nursing_problem_list: {
    documentedAt: ISO14,
    problem: "PAIN",
    status: "MONITORING",
    providerNotified: "NO",
  },
  nursing_handoff_shift_report: {
    handoffTime: ISO14,
    handoffType: "SHIFT_CHANGE",
    receivingRole: "RN",
    highRiskConcernsPresent: "NO",
    openTasksReviewed: "YES",
    medicationConcernsReviewed: "YES",
    fallRiskReviewed: "YES",
    linesTubesDrainsReviewed: "YES",
    pendingLabsImagingReviewed: "YES",
    familyCommunicationNeeds: "NO",
    providerNotified: "NO",
  },
  nursing_discharge_readiness_review: {
    reviewTime: ISO14,
    vitalSignsStable: "YES",
    painControlled: "YES",
    mobilitySafe: "YES",
    educationCompleted: "YES",
    medicationsReviewed: "YES",
    followUpReviewed: "YES",
    transportationConfirmed: "YES",
    responsibleAdultPresent: "NOT_APPLICABLE",
    barriersPresent: "NO",
    providerNotified: "NO",
  },
};

for (const [cardId, payload] of Object.entries(MANUAL_OVERRIDES)) {
  add(cardId, payload);
}

const available = CLINICAL_DOCUMENTATION_CARDS.filter(
  (c) => c.implementationStatus === "AVAILABLE"
).map((c) => c.id);

const errors = [];
for (const cardId of available) {
  const payload = PAYLOADS[cardId];
  if (!payload) {
    errors.push(`missing payload: ${cardId}`);
    continue;
  }
  const v = validatePayloadForCard(cardId, payload);
  if (!v.ok) {
    errors.push(`invalid ${cardId}: ${v.error ?? "unknown"}`);
    continue;
  }
  const summary = summarizeClinicalDocumentationPayload(cardId, payload, "en");
  if (summary.length === 0) {
    errors.push(`empty summary: ${cardId}`);
  }
}

if (errors.length) {
  console.error(`Validation errors (${errors.length}):\n` + errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${available.length} AVAILABLE card payloads.`);

const sortedIds = [...available].sort();

function formatPayload(obj, indent = 2) {
  return JSON.stringify(obj, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : " ".repeat(indent) + line))
    .join("\n");
}

const supplementalIds = sortedIds.filter((id) => {
  const inLegal = [
    ...legalFixtures.EDOC_TEST1_ALL_HIGH_RISK_FIXTURES,
    ...legalFixtures.EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
  ].some((f) => f.cardId === id);
  return !inLegal;
});

const supplementalEntries = supplementalIds
  .map((id) => {
    const card = CLINICAL_DOCUMENTATION_CARDS.find((c) => c.id === id);
    return `  {
    cardId: ${JSON.stringify(id)},
    category: ${JSON.stringify(card?.category ?? "OBSERVATION_DOCUMENTATION")},
    payload: ${formatPayload(PAYLOADS[id], 4)},
  }`;
  })
  .join(",\n");

const out = `/**
 * EDOC.TEST.2 — universal runtime coverage payloads (all AVAILABLE cards).
 * Generated by scripts/build-clinical-documentation-runtime-coverage.mjs — re-run after registry changes.
 */
import {
  CLINICAL_DOCUMENTATION_CARDS,
  getClinicalDocumentationCardById,
  summarizeClinicalDocumentationPayload,
  validatePayloadForCard,
} from "@medora/shared";
import {
  EDOC_TEST1_ALL_HIGH_RISK_FIXTURES,
  EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
} from "./clinical-documentation-legal-coverage.fixtures";

export const EDOC_RUNTIME_COVERAGE_ISO = "2026-05-28T12:00:00.000Z";

export type EdocRuntimeCoverageFixture = {
  cardId: string;
  category: string;
  payload: Record<string, unknown>;
};

/** Cards not covered by EDOC.TEST.1 (36) or EDOC.23B (16) legal fixtures. */
export const RUNTIME_COVERAGE_SUPPLEMENTAL_PAYLOADS: EdocRuntimeCoverageFixture[] = [
${supplementalEntries}
];

export function getClinicalDocumentationRuntimeCoverageFixtures(): EdocRuntimeCoverageFixture[] {
  const map = new Map<string, EdocRuntimeCoverageFixture>();
  for (const f of [
    ...EDOC_TEST1_ALL_HIGH_RISK_FIXTURES,
    ...EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
    ...RUNTIME_COVERAGE_SUPPLEMENTAL_PAYLOADS,
  ]) {
    map.set(f.cardId, f);
  }

  const available = CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.implementationStatus === "AVAILABLE");
  const fixtures: EdocRuntimeCoverageFixture[] = [];

  for (const card of available) {
    const fixture = map.get(card.id);
    if (!fixture) {
      throw new Error(\`Missing runtime coverage fixture for AVAILABLE card "\${card.id}"\`);
    }
    const validation = validatePayloadForCard(card.id, fixture.payload);
    if (!validation.ok) {
      throw new Error(
        \`Invalid runtime coverage payload for "\${card.id}": \${validation.ok ? "" : validation.message}\`
      );
    }
    const summary = summarizeClinicalDocumentationPayload(card.id, fixture.payload, "en");
    if (summary.length === 0) {
      throw new Error(\`Empty EN summary for runtime coverage payload "\${card.id}"\`);
    }
    if (!getClinicalDocumentationCardById(card.id)) {
      throw new Error(\`Registry missing card "\${card.id}"\`);
    }
    fixtures.push(fixture);
  }

  return fixtures.sort((a, b) => a.cardId.localeCompare(b.cardId));
}

/** Throws if fixture map is incomplete or any payload fails validation. */
export function assertRuntimeCoverageFixtureIntegrity(): void {
  getClinicalDocumentationRuntimeCoverageFixtures();
}
`;

writeFileSync(
  join(root, "apps/api/src/encounters/clinical-documentation-runtime-coverage.fixtures.ts"),
  out
);
console.log(
  "Wrote apps/api/src/encounters/clinical-documentation-runtime-coverage.fixtures.ts",
  `(${available.length} cards, ${supplementalIds.length} supplemental)`
);
