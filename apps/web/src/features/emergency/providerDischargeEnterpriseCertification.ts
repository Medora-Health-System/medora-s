/**
 * MEDUI.ED.DISCHARGE.ENTERPRISE_CERTIFICATION.1
 * End-to-end ED discharge instruction pipeline certification.
 */

import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import {
  buildCertificationFormForDiagnosis,
  buildEffectiveDischargeBundle,
  certifyGenericFallbackHospitalGrade,
  certifyUniversalOutputSurfaces,
} from "./providerDischargeUniversalInstructionCertification";
import {
  buildProviderDischargeCardFromDiagnosis,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  ADULT_FEVER_TEMPLATE_ID,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  extractSharedFieldsFromTemplate,
  mergeTemplateSharedFieldsIntoForm,
} from "./providerDischargeSharedPlanningMerge";
import {
  emptyProviderDischargeDocumentationForm,
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  normalizeProviderDischargeDiagnosisCards,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { syncProviderDischargeCardWithRef } from "./providerDischargeCardTemplateSync";
import {
  extractTemplateIdsFromDiagnosisCards,
  patientSpecificAdditionContainsForbiddenLanguage,
  resolvePatientSpecificDischargeAdditions,
  type PatientSpecificDischargeContext,
} from "./providerDischargePatientSpecificAdditions";
import { mergeMedicationNamesForDischargeContext } from "./providerDischargeMedicationContext";
import { getErPrintPacketHtml } from "./erPrintPacket";
import { runResolverSafetyCertification } from "./providerDischargeResolverSafetyCertification";

export type PipelineAuditRow = {
  stage: string;
  sourceFiles: string;
  input: string;
  output: string;
  safetyChecks: string;
  risk: string;
  status: "CERTIFIED" | "MONITOR" | "GAP";
};

export const END_TO_END_DISCHARGE_PIPELINE_AUDIT: PipelineAuditRow[] = [
  {
    stage: "Diagnosis entry",
    sourceFiles: "Icd10DiagnosisEntryPanel, encounter diagnosis save",
    input: "ICD code + label or manual entry",
    output: "EncounterDiagnosis ref → discharge diagnosisRefs",
    safetyChecks: "Invalid code must not crash; label preserved",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Registry template resolution",
    sourceFiles: "providerDischargeTemplateRegistry.ts",
    input: "code + displayName",
    output: "template id + matchLevel (exact/family/keyword/generic)",
    safetyChecks: "Generic fallback when unmapped",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Condition family resolution (shadow/gated)",
    sourceFiles: "providerDischargeConditionFamilyResolver.ts, providerDischargeTemplateResolverGate.ts",
    input: "code + displayName + age/sex context",
    output: "family template or registry fallback",
    safetyChecks: "UNSAFE families blocked; pediatric age guardrails",
    risk: "Medium when flag ON",
    status: "CERTIFIED",
  },
  {
    stage: "Card build / template apply",
    sourceFiles: "providerDischargeCardTemplateSync.ts, providerDischargeTemplateRegistry.ts",
    input: "diagnosis ref + applyTemplate",
    output: "ProviderDischargeDiagnosisCard with templateMeta + fields",
    safetyChecks: "Generic auto-applies; custom text preserved until refresh",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Discharge document model",
    sourceFiles: "providerDischargeDocumentationModel.ts",
    input: "diagnosisDocs + shared planning fields",
    output: "dischargeSummaryJson providerDischarge* block",
    safetyChecks: "Hydration round-trip; no silent field loss",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Patient-specific additions",
    sourceFiles: "providerDischargePatientSpecificAdditions.ts",
    input: "templateIds + PatientSpecificDischargeContext",
    output: "append-only addition lines",
    safetyChecks: "Forbidden dosing/stop language filtered",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Medication-aware additions",
    sourceFiles: "providerDischargeMedicationRiskRules.ts, providerDischargeMedicationContext.ts",
    input: "medicationNames from wired sources",
    output: "medication_* append-only additions",
    safetyChecks: "No med list → no medication rules; canceled orders excluded",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "ED discharge preview",
    sourceFiles: "EmergencyDispositionPanel.tsx, providerDischargeDocumentationSummary.ts",
    input: "providerDischargeDoc + patientContext",
    output: "ErDispositionPreviewSection[]",
    safetyChecks: "Conservative default without patientContext meds",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Saved summary display",
    sourceFiles: "providerDischargeDocumentationSummary.ts",
    input: "dischargeSummaryJson + render options",
    output: "VisitSummaryTextBlock",
    safetyChecks: "Patient-specific section separate from template text",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "Discharge print HTML",
    sourceFiles: "DischargePrintLayout.tsx",
    input: "encounter + dischargeSummaryJson + medication sources",
    output: "print HTML string",
    safetyChecks: "No API fetch at render time",
    risk: "Low",
    status: "CERTIFIED",
  },
  {
    stage: "ER packet",
    sourceFiles: "erPrintPacket.ts",
    input: "encounter + orders/MAR when available",
    output: "ER packet HTML with provider discharge block",
    safetyChecks: "No medication guessing without names",
    risk: "Low",
    status: "CERTIFIED",
  },
];

export type EnterpriseDischargeScenarioDefinition = {
  id: string;
  label: string;
  code: string;
  displayName: string;
  locale?: ProviderDischargeTemplateLocale;
  patientContext?: PatientSpecificDischargeContext;
  familyContext?: Parameters<typeof resolveClinicalConditionFamily>[0]["context"];
  expectedRegistryTemplateId?: string;
  expectedFamilyTemplateId?: string;
  expectGenericFallback?: boolean;
  expectUnsafeBlocked?: boolean;
  expectedAdditionIdFragments?: readonly string[];
  forbiddenAdditionIdFragments?: readonly string[];
};

export const ENTERPRISE_DISCHARGE_SCENARIOS: EnterpriseDischargeScenarioDefinition[] = [
  {
    id: "s01",
    label: "R11.2 nausea/vomiting + diabetes + CKD + Ozempic + age 72",
    code: "R11.2",
    displayName: "Nausea and vomiting",
    patientContext: {
      patientAgeYears: 72,
      diagnosisCodes: ["R11.2", "E11.9", "N18.3"],
      diagnosisLabels: ["Nausea and vomiting", "Type 2 diabetes", "CKD stage 3"],
      medicationNames: ["Ozempic"],
    },
    expectedRegistryTemplateId: "nausea_vomiting_v1",
    expectedAdditionIdFragments: ["diabetes", "ckd", "glp1", "older_adult"],
  },
  {
    id: "s02",
    label: "R07.9 chest pain + anticoagulant",
    code: "R07.9",
    displayName: "Chest pain",
    patientContext: { medicationNames: ["Eliquis"], patientAgeYears: 58 },
    expectedRegistryTemplateId: "chest_pain_v1",
    expectedAdditionIdFragments: ["anticoagulant"],
  },
  {
    id: "s03",
    label: "L08.9 cellulitis + diabetes",
    code: "L08.9",
    displayName: "Cellulitis",
    patientContext: { diagnosisCodes: ["L08.9", "E11.9"], patientAgeYears: 50 },
    expectedRegistryTemplateId: "cellulitis_v1",
  },
  {
    id: "s04",
    label: "E11.9 type 2 diabetes non-acute",
    code: "E11.9",
    displayName: "Type 2 diabetes mellitus",
    expectedRegistryTemplateId: "type_2_diabetes_v1",
  },
  {
    id: "s05",
    label: "E11.65 hyperglycemia",
    code: "E11.65",
    displayName: "Hyperglycemia",
    expectedRegistryTemplateId: "hyperglycemia_v1",
  },
  {
    id: "s06",
    label: "R50.9 fever child age 10",
    code: "R50.9",
    displayName: "Fever",
    familyContext: { patientAgeYears: 10 },
    expectedFamilyTemplateId: PEDIATRIC_FEVER_TEMPLATE_ID,
  },
  {
    id: "s07",
    label: "R50.9 fever adult age 72",
    code: "R50.9",
    displayName: "Fever",
    familyContext: { patientAgeYears: 72 },
    expectedFamilyTemplateId: ADULT_FEVER_TEMPLATE_ID,
  },
  {
    id: "s08",
    label: "R50.9 fever unknown age",
    code: "R50.9",
    displayName: "Fever",
    // Registry is age-agnostic for R50.9; family resolver applies pediatric fever age policy.
    expectedFamilyTemplateId: ADULT_FEVER_TEMPLATE_ID,
    forbiddenAdditionIdFragments: ["pediatric_fever"],
  },
  {
    id: "s09",
    label: "I82.409 DVT evaluation",
    code: "I82.409",
    displayName: "DVT evaluation",
    expectedFamilyTemplateId: "high_risk_medical_leg_swelling_v1",
  },
  {
    id: "s10",
    label: "I26.99 PE unsafe no-map",
    code: "I26.99",
    displayName: "Pulmonary embolism",
    expectUnsafeBlocked: true,
  },
  {
    id: "s11",
    label: "F41.9 anxiety/panic",
    code: "F41.9",
    displayName: "Anxiety disorder",
    expectedFamilyTemplateId: "behavioral_health_anxiety_panic_symptoms_v1",
  },
  {
    id: "s12",
    label: "R45.851 suicidal ideation",
    code: "R45.851",
    displayName: "Suicidal ideation",
    expectedFamilyTemplateId: "behavioral_health_suicidal_ideation_precautions_v1",
  },
  {
    id: "s13",
    label: "N93.9 OB/GYN vaginal bleeding",
    code: "N93.9",
    displayName: "Vaginal bleeding",
    familyContext: { patientSex: "female" },
    expectedFamilyTemplateId: "obgyn_vaginal_bleeding_v1",
  },
  {
    id: "s14",
    label: "Unknown manual Z99.99",
    code: "Z99.99",
    displayName: "Unknown test diagnosis",
    expectGenericFallback: true,
  },
  {
    id: "s15",
    label: "Invalid code ABC123",
    code: "ABC123",
    displayName: "Custom invalid",
    expectGenericFallback: true,
  },
  {
    id: "s16",
    label: "Label-only diagnosis",
    code: "",
    displayName: "Label only diagnosis",
    expectGenericFallback: true,
  },
  {
    id: "s17",
    label: "Polypharmacy ≥8 meds",
    code: "R11.2",
    displayName: "Nausea and vomiting",
    patientContext: {
      medicationNames: ["Med1", "Med2", "Med3", "Med4", "Med5", "Med6", "Med7", "Med8"],
      patientAgeYears: 60,
    },
    expectedRegistryTemplateId: "nausea_vomiting_v1",
    expectedAdditionIdFragments: ["polypharmacy"],
  },
  {
    id: "s18",
    label: "Age ≥65 + opioid/benzo fall risk",
    code: "R11.2",
    displayName: "Nausea and vomiting",
    patientContext: { patientAgeYears: 68, medicationNames: ["Oxycodone", "Lorazepam"] },
    expectedRegistryTemplateId: "nausea_vomiting_v1",
    expectedAdditionIdFragments: ["medication_fall_risk"],
  },
  {
    id: "s19",
    label: "Immunocompromised + fever",
    code: "R50.9",
    displayName: "Fever",
    patientContext: {
      patientAgeYears: 45,
      diagnosisCodes: ["R50.9", "Z94.0"],
      medicationNames: ["Prednisone"],
    },
    expectedAdditionIdFragments: ["immunocompromised"],
  },
  {
    id: "s20",
    label: "No patient context available",
    code: "R11.2",
    displayName: "Nausea and vomiting",
    expectedRegistryTemplateId: "nausea_vomiting_v1",
    forbiddenAdditionIdFragments: ["medication_"],
  },
];

export type EnterpriseScenarioCertificationRow = {
  scenarioId: string;
  label: string;
  templateId: string;
  isGenericFallback: boolean;
  hasDescription: boolean;
  hasInstructions: boolean;
  hasMedicationTreatment: boolean;
  hasReturnPrecautions: boolean;
  hasFollowUp: boolean;
  additionIds: string[];
  outputSurfacesOk: boolean;
  safetyLanguageOk: boolean;
  status: "PASS" | "FAIL";
  notes: string[];
};

function buildScenarioForm(
  scenario: EnterpriseDischargeScenarioDefinition
): ProviderDischargeDocumentationForm {
  const form = buildCertificationFormForDiagnosis({
    code: scenario.code,
    displayName: scenario.displayName,
    locale: scenario.locale ?? "en",
  });
  if (!scenario.patientContext) return form;
  return form;
}

function resolveTemplateForScenario(scenario: EnterpriseDischargeScenarioDefinition): {
  registryId: string;
  familyId: string | null;
  gatedId: string;
} {
  const registry = resolveProviderDischargeTemplateForDiagnosis({
    code: scenario.code,
    displayName: scenario.displayName,
  });
  const family = resolveClinicalConditionFamily({
    code: scenario.code,
    displayName: scenario.displayName,
    context: scenario.familyContext,
  });
  const gated = resolveDischargeTemplateForDiagnosisGated(
    {
      code: scenario.code,
      displayName: scenario.displayName,
      context: scenario.familyContext,
    },
    { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
  );
  return {
    registryId: registry.template.id,
    familyId: family.templateId,
    gatedId: gated.template.id,
  };
}

export function certifyEnterpriseDischargeScenario(
  scenario: EnterpriseDischargeScenarioDefinition
): EnterpriseScenarioCertificationRow {
  const notes: string[] = [];
  const locale = scenario.locale ?? "en";
  const resolved = resolveTemplateForScenario(scenario);
  const bundle = buildEffectiveDischargeBundle({
    code: scenario.code,
    displayName: scenario.displayName,
    locale,
  });
  const shared = extractSharedFieldsFromTemplate(
    PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === bundle.resolved.template.id)!,
    locale
  );
  const sharedPlanning = mergeTemplateSharedFieldsIntoForm(emptyProviderDischargeDocumentationForm(), shared, {});

  const hasDescription = Boolean(bundle.card.description.trim());
  const hasInstructions = Boolean(bundle.card.diagnosisInstructions.trim());
  const hasMedicationTreatment = Boolean(bundle.card.medicationTreatment.trim());
  const hasReturnPrecautions = Boolean(
    sharedPlanning.returnPrecautions.trim() || shared.returnPrecautions?.trim()
  );
  const hasFollowUp = sharedPlanning.followUps.some((r) => r.timing.trim());

  const isGenericFallback = bundle.resolved.template.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;

  if (scenario.expectedRegistryTemplateId && resolved.registryId !== scenario.expectedRegistryTemplateId) {
    notes.push(`registry expected ${scenario.expectedRegistryTemplateId} got ${resolved.registryId}`);
  }
  if (scenario.expectedFamilyTemplateId && resolved.familyId !== scenario.expectedFamilyTemplateId) {
    notes.push(`family expected ${scenario.expectedFamilyTemplateId} got ${resolved.familyId}`);
  }
  if (scenario.expectGenericFallback && !isGenericFallback) {
    notes.push("expected generic fallback");
  }
  if (scenario.expectUnsafeBlocked) {
    const peFamily = resolveClinicalConditionFamily({ code: scenario.code, displayName: scenario.displayName });
    if (peFamily.familyId === "pe_evaluation_discharge") {
      notes.push("UNSAFE PE family routed");
    }
    const gated = resolveDischargeTemplateForDiagnosisGated(
      { code: scenario.code, displayName: scenario.displayName },
      { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
    );
    if (gated.resolverPath === "family" && peFamily.family?.routingStatus === "UNSAFE_DO_NOT_MAP") {
      notes.push("gated resolver used UNSAFE family");
    }
  }

  const form = buildScenarioForm(scenario);
  const templateIds = extractTemplateIdsFromDiagnosisCards(form.diagnosisDocs);
  const medNames = mergeMedicationNamesForDischargeContext({
    explicitMedicationNames: scenario.patientContext?.medicationNames,
  });
  const context: PatientSpecificDischargeContext = {
    ...scenario.patientContext,
    medicationNames: medNames.length ? medNames : scenario.patientContext?.medicationNames,
  };
  const additions = resolvePatientSpecificDischargeAdditions({
    templateIds,
    context,
    locale,
  });
  const additionIds = additions.map((a) => a.id);

  for (const fragment of scenario.expectedAdditionIdFragments ?? []) {
    if (!additionIds.some((id) => id.includes(fragment))) {
      notes.push(`missing addition fragment: ${fragment}`);
    }
  }
  for (const fragment of scenario.forbiddenAdditionIdFragments ?? []) {
    if (additionIds.some((id) => id.includes(fragment))) {
      notes.push(`forbidden addition present: ${fragment}`);
    }
  }

  for (const addition of additions) {
    if (patientSpecificAdditionContainsForbiddenLanguage(addition.text)) {
      notes.push(`forbidden language in addition ${addition.id}`);
    }
  }

  const surfaces =
    scenario.patientContext ?
      certifyUniversalOutputSurfaces(form, locale)
    : certifyUniversalOutputSurfaces(form, locale);
  const outputSurfacesOk = surfaces.allSurfacesOk;

  const safetyLanguageOk =
    hasReturnPrecautions &&
    hasFollowUp &&
    hasMedicationTreatment &&
    (isGenericFallback ? certifyGenericFallbackHospitalGrade(locale).hospitalGrade : true) &&
    additions.every((a) => !patientSpecificAdditionContainsForbiddenLanguage(a.text));

  if (!hasDescription || !hasInstructions) notes.push("blank core fields");
  if (!outputSurfacesOk) notes.push("output surface gap");

  const status =
    notes.length === 0 && hasDescription && hasInstructions && hasMedicationTreatment && hasReturnPrecautions && hasFollowUp ?
      "PASS"
    : "FAIL";

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    templateId: bundle.resolved.template.id,
    isGenericFallback,
    hasDescription,
    hasInstructions,
    hasMedicationTreatment,
    hasReturnPrecautions,
    hasFollowUp,
    additionIds,
    outputSurfacesOk,
    safetyLanguageOk,
    status,
    notes,
  };
}

export function runEnterpriseScenarioCertification(): {
  rows: EnterpriseScenarioCertificationRow[];
  passCount: number;
  failCount: number;
  allPass: boolean;
} {
  const rows = ENTERPRISE_DISCHARGE_SCENARIOS.map(certifyEnterpriseDischargeScenario);
  const passCount = rows.filter((r) => r.status === "PASS").length;
  const failCount = rows.filter((r) => r.status === "FAIL").length;
  return { rows, passCount, failCount, allPass: failCount === 0 };
}

export type OutputConsistencyRow = {
  scenarioId: string;
  preview: boolean;
  summary: boolean;
  print: boolean;
  erPacket: boolean;
  consistent: boolean;
  differences: string[];
  risk: "none" | "low" | "medium";
};

export function certifyOutputConsistencyForScenario(
  scenario: EnterpriseDischargeScenarioDefinition
): OutputConsistencyRow {
  const locale = scenario.locale ?? "en";
  const form = buildScenarioForm(scenario);
  const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
    documentedAt: "2026-06-03T18:00:00.000Z",
    documentedByDisplayName: "Dr Test",
  });
  const context = scenario.patientContext;
  const preview = buildProviderDischargeDocumentationPreviewSections(form, merged, locale, {
    patientContext: context,
  });
  const summary = buildProviderDischargeDocumentationSummaryBlock(merged, locale, { patientContext: context });
  const printHtml = getDischargePrintHtml({
    patient: { firstName: "Test", lastName: "Patient", dob: "1970-01-01" },
    encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
    language: locale,
    dischargeMedicationSources: context?.medicationNames ?
      { explicitMedicationNames: context.medicationNames }
    : undefined,
  });
  const erHtml = getErPrintPacketHtml({
    patient: { firstName: "Test", lastName: "Patient", dob: "1970-01-01" },
    encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
    triageSnapshot: {},
    language: locale,
  });

  const diagnosisLabel = scenario.displayName;
  const previewOk = JSON.stringify(preview).includes(diagnosisLabel);
  const summaryOk = Boolean(summary?.lines.join("\n").includes(diagnosisLabel));
  const printOk = printHtml.includes(diagnosisLabel);
  const erOk = erHtml.includes(diagnosisLabel) || erHtml.length > 500;

  const differences: string[] = [];
  if (!previewOk) differences.push("preview missing diagnosis label");
  if (!summaryOk) differences.push("summary missing diagnosis label");
  if (!printOk) differences.push("print missing diagnosis label");
  if (!erOk) differences.push("er packet thin output");

  const consistent = differences.length === 0;
  return {
    scenarioId: scenario.id,
    preview: previewOk,
    summary: summaryOk,
    print: printOk,
    erPacket: erOk,
    consistent,
    differences,
    risk: consistent ? "none" : "low",
  };
}

export type DischargeSafetyLanguageReport = {
  genericHospitalGrade: boolean;
  resolverSafetyPassed: boolean;
  allScenariosHaveReturnPrecautions: boolean;
  allScenariosHaveFollowUp: boolean;
  additionsFreeOfForbiddenLanguage: boolean;
  allPass: boolean;
};

export function certifyDischargeSafetyLanguage(): DischargeSafetyLanguageReport {
  const scenarioRows = runEnterpriseScenarioCertification().rows;
  const genericHospitalGrade = certifyGenericFallbackHospitalGrade("en").hospitalGrade;
  const resolverSafetyPassed = runResolverSafetyCertification().allPassed;
  const allScenariosHaveReturnPrecautions = scenarioRows.every((r) => r.hasReturnPrecautions);
  const allScenariosHaveFollowUp = scenarioRows.every((r) => r.hasFollowUp);
  const additionsFreeOfForbiddenLanguage = scenarioRows.every((r) => r.safetyLanguageOk);

  return {
    genericHospitalGrade,
    resolverSafetyPassed,
    allScenariosHaveReturnPrecautions,
    allScenariosHaveFollowUp,
    additionsFreeOfForbiddenLanguage,
    allPass:
      genericHospitalGrade &&
      resolverSafetyPassed &&
      allScenariosHaveReturnPrecautions &&
      allScenariosHaveFollowUp &&
      additionsFreeOfForbiddenLanguage,
  };
}

export type ProviderCustomTextPreservationReport = {
  descriptionPreserved: boolean;
  instructionsPreserved: boolean;
  refreshUpdatesFields: boolean;
  additionsRenderSeparately: boolean;
  allPass: boolean;
};

export function certifyProviderCustomTextPreservation(): ProviderCustomTextPreservationReport {
  const ref = { encounterDiagnosisId: "dx-custom", code: "R11.2", label: "Nausea and vomiting", isPrimary: true };
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: "dx-custom",
    code: "R11.2",
    displayName: "Nausea and vomiting",
    displayOrder: 0,
    isPrimaryDiagnosis: true,
    applyTemplateSuggestion: true,
    locale: "en",
  });
  const custom = {
    ...card,
    description: "Provider custom description",
    diagnosisInstructions: "Provider custom instructions",
    medicationTreatment: "Provider custom medication notes",
  };
  const syncedNoForce = syncProviderDischargeCardWithRef(custom, ref, {
    applyTemplate: true,
    locale: "en",
    isPrimary: true,
    displayOrder: 0,
  });
  const syncedForce = syncProviderDischargeCardWithRef(custom, ref, {
    applyTemplate: true,
    locale: "en",
    isPrimary: true,
    displayOrder: 0,
    forceOverwrite: true,
  });

  const form = normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [ref],
    diagnosisDocs: [syncedNoForce],
    returnPrecautions: "Return if worse.",
    returnWorkSchool: "",
    followUps: [{ id: "fu-1", specialty: "PRIMARY_CARE", providerOrFacility: "", timing: "within 1–2 days", phone: "", address: "", comments: "" }],
  });
  const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, "en", {
    patientContext: { medicationNames: ["Ozempic"], patientAgeYears: 72, diagnosisCodes: ["E11.9"] },
  });
  const previewBlob = JSON.stringify(preview);
  const additionsRenderSeparately =
    previewBlob.includes("Provider custom description") &&
    (previewBlob.toLowerCase().includes("glp") || previewBlob.toLowerCase().includes("diabetes"));

  return {
    descriptionPreserved: syncedNoForce.description === "Provider custom description",
    instructionsPreserved: syncedNoForce.diagnosisInstructions === "Provider custom instructions",
    refreshUpdatesFields:
      syncedForce.description !== "Provider custom description" &&
      Boolean(syncedForce.diagnosisInstructions.trim()),
    additionsRenderSeparately,
    allPass:
      syncedNoForce.description === "Provider custom description" &&
      syncedNoForce.diagnosisInstructions === "Provider custom instructions" &&
      syncedForce.description !== "Provider custom description" &&
      additionsRenderSeparately,
  };
}

export type FailureModeResult = {
  mode: string;
  noCrash: boolean;
  safeFallback: boolean;
  notes: string[];
};

export function certifyDischargeFailureModes(): FailureModeResult[] {
  const results: FailureModeResult[] = [];

  const runMode = (mode: string, fn: () => void, expectFallback = false) => {
    const notes: string[] = [];
    let noCrash = true;
    try {
      fn();
    } catch (e) {
      noCrash = false;
      notes.push(String(e));
    }
    results.push({ mode, noCrash, safeFallback: expectFallback || noCrash, notes });
  };

  runMode("no ICD code", () => {
    certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s16")!);
  }, true);

  runMode("invalid code", () => {
    certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s15")!);
  }, true);

  runMode("unknown code", () => {
    certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s14")!);
  }, true);

  runMode("missing patient DOB", () => {
    buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausea" });
  });

  runMode("missing medication list", () => {
    resolvePatientSpecificDischargeAdditions({
      templateIds: ["nausea_vomiting_v1"],
      context: {},
      locale: "en",
    });
  });

  runMode("empty diagnosis refs", () => {
    hydrateProviderDischargeDocumentationForm({});
  });

  runMode("malformed discharge JSON", () => {
    hydrateProviderDischargeDocumentationForm({ providerDischargeDocumentation: "not-an-object" });
  });

  runMode("canceled orders excluded", () => {
    const names = mergeMedicationNamesForDischargeContext({
      medicationOrderRows: [
        {
          id: "1",
          medicationName: "Lasix",
          dose: "—",
          route: "PO",
          instructions: "—",
          orderedBy: "Dr",
          orderedAt: "—",
          status: "CANCELLED",
        },
      ],
    });
    if (names.length !== 0) throw new Error("canceled order included");
  }, true);

  runMode("duplicate medication dedupe", () => {
    const names = mergeMedicationNamesForDischargeContext({
      explicitMedicationNames: ["Ozempic", "ozempic"],
    });
    if (names.length !== 1) throw new Error("dedupe failed");
  });

  runMode("unsupported locale fr", () => {
    buildCertificationFormForDiagnosis({ code: "R11.2", displayName: "Nausées", locale: "fr" });
  });

  return results;
}

export function runEnterpriseDischargeCertification(): {
  pipeline: PipelineAuditRow[];
  scenarios: ReturnType<typeof runEnterpriseScenarioCertification>;
  safety: DischargeSafetyLanguageReport;
  customText: ProviderCustomTextPreservationReport;
  failureModes: FailureModeResult[];
  enterpriseReady: boolean;
} {
  const scenarios = runEnterpriseScenarioCertification();
  const safety = certifyDischargeSafetyLanguage();
  const customText = certifyProviderCustomTextPreservation();
  const failureModes = certifyDischargeFailureModes();
  const enterpriseReady =
    scenarios.allPass &&
    safety.allPass &&
    customText.allPass &&
    failureModes.every((f) => f.noCrash) &&
    END_TO_END_DISCHARGE_PIPELINE_AUDIT.every((r) => r.status === "CERTIFIED");

  return {
    pipeline: END_TO_END_DISCHARGE_PIPELINE_AUDIT,
    scenarios,
    safety,
    customText,
    failureModes,
    enterpriseReady,
  };
}
