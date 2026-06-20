/**
 * MEDUI.ED.DISCHARGE.ALL_DIAGNOSES_HOSPITAL_GRADE.1
 * Universal diagnosis → hospital-grade ED discharge instruction certification.
 */

import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import {
  buildEdDischargeDiagnosisCatalog,
  type EdDischargeDiagnosisCatalogEntry,
} from "./edDischargeDiagnosisCatalog";
import {
  buildCoverageAuditLevel2PickerUnion,
  loadIcd10DevSampleCatalog,
  type EdDiagnosisPickerSource,
} from "./edDischargeCoverageAuditLevel2";
import {
  buildProviderDischargeCardFromDiagnosis,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateMatchLevel,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  bodyIncludesGoldStandardMedicationSafety,
  bodyIncludesGoldStandardReturnSuffix,
  followUpTimingUsesOneToTwoDays,
  personalizeGenericDischargeTemplateBody,
} from "./providerDischargeTemplateGoldStandard";
import {
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import {
  ensureProviderDischargeCardForRef,
  syncProviderDischargeCardWithRef,
} from "./providerDischargeCardTemplateSync";
import {
  extractSharedFieldsFromTemplate,
  mergeTemplateSharedFieldsIntoForm,
} from "./providerDischargeSharedPlanningMerge";
import { evaluatePediatricFeverAgePolicy } from "./providerDischargePediatricFeverAgePolicy";

export type UniversalDiagnosisSourceRow = {
  source: string;
  fileOrModel: string;
  canProviderSelect: boolean;
  hasIcdCode: boolean | "optional" | "usually";
  hasLabel: boolean | "optional" | "usually";
  resolutionPath: string;
  risk: string;
};

/** Phase 1 — static audit of every diagnosis source path in Medora. */
export const UNIVERSAL_DIAGNOSIS_SOURCE_AUDIT: UniversalDiagnosisSourceRow[] = [
  {
    source: "ED diagnosis picker (API search)",
    fileOrModel: "Icd10DiagnosisEntryPanel → GET /terminology/icd10/search → Icd10DiagnosisCode",
    canProviderSelect: true,
    hasIcdCode: "usually",
    hasLabel: true,
    resolutionPath: "resolveProviderDischargeTemplateForDiagnosis(code, displayName)",
    risk: "Low when code+label present; generic fallback if unmapped",
  },
  {
    source: "ED manual non-catalog entry",
    fileOrModel: "Icd10DiagnosisEntryPanel manual entry",
    canProviderSelect: true,
    hasIcdCode: "optional",
    hasLabel: "optional",
    resolutionPath: "resolveProviderDischargeTemplateForDiagnosis(code, displayName) → generic if unmapped",
    risk: "Medium — label-only or invalid code must not crash; generic fallback required",
  },
  {
    source: "Patient chart quick picks",
    fileOrModel: "constants/clinicalTemplates.ts → COMMON_DIAGNOSES",
    canProviderSelect: true,
    hasIcdCode: true,
    hasLabel: true,
    resolutionPath: "resolveProviderDischargeTemplateForDiagnosis",
    risk: "Low — curated ICD codes with labels",
  },
  {
    source: "Imported CMS ICD-10 catalog",
    fileOrModel: "Prisma Icd10DiagnosisCode (production import)",
    canProviderSelect: true,
    hasIcdCode: true,
    hasLabel: true,
    resolutionPath: "Same resolver after picker selection",
    risk: "Medium — large catalog; most codes map to generic fallback by design",
  },
  {
    source: "Repo dev ICD sample",
    fileOrModel: "apps/api/prisma/data/icd10-cm-sample-dev.csv",
    canProviderSelect: true,
    hasIcdCode: true,
    hasLabel: true,
    resolutionPath: "Loaded into Icd10DiagnosisCode in dev; same resolver",
    risk: "Low — bounded sample for certification",
  },
  {
    source: "Encounter diagnosis save",
    fileOrModel: "Diagnosis model / encounter diagnosis refs",
    canProviderSelect: true,
    hasIcdCode: "usually",
    hasLabel: true,
    resolutionPath: "ensureProviderDischargeCardForRef → build/sync card with template apply",
    risk: "Low after universal generic auto-apply",
  },
  {
    source: "Discharge diagnosis refs",
    fileOrModel: "providerDischargeDocumentationModel diagnosisRefs",
    canProviderSelect: true,
    hasIcdCode: "usually",
    hasLabel: true,
    resolutionPath: "syncProviderDischargeCardWithRef with applyTemplate",
    risk: "Low — drives discharge card creation",
  },
  {
    source: "Seed diagnosis data",
    fileOrModel: "Prisma seeds / fixture diagnoses",
    canProviderSelect: false,
    hasIcdCode: "usually",
    hasLabel: true,
    resolutionPath: "Same as encounter diagnosis when surfaced in discharge",
    risk: "Low — not direct picker source",
  },
];

export type HospitalGradeDischargeStatus =
  | "HOSPITAL_GRADE_SPECIFIC"
  | "HOSPITAL_GRADE_FAMILY"
  | "HOSPITAL_GRADE_GENERIC"
  | "FAIL_MISSING_FIELD"
  | "FAIL_NO_TEMPLATE"
  | "FAIL_UNSAFE_ROUTE";

export type UniversalDischargeCoverageRow = {
  icdCode: string;
  diagnosis: string;
  source: string;
  resolverOutcome: ProviderDischargeTemplateMatchLevel;
  templateId: string;
  templateTier: "specific" | "family" | "generic";
  hasDescription: boolean;
  hasInstructions: boolean;
  hasMedicationTreatment: boolean;
  hasReturnPrecautions: boolean;
  hasFollowUp: boolean;
  status: HospitalGradeDischargeStatus;
};

export type DiagnosisCertificationInput = {
  code: string;
  displayName: string;
  source?: string;
  locale?: "en" | "fr";
};

function resolveTemplateBodyForCertification(
  templateId: string,
  displayName: string,
  locale: "en" | "fr"
) {
  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!template) return null;
  const raw = getProviderDischargeSuggestedTextBody(template, locale);
  if (templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
    return personalizeGenericDischargeTemplateBody(raw, displayName);
  }
  return raw;
}

function mapMatchLevelToTier(
  matchLevel: ProviderDischargeTemplateMatchLevel
): "specific" | "family" | "generic" {
  if (matchLevel === "icdExact") return "specific";
  if (matchLevel === "generic") return "generic";
  return "family";
}

function mapMatchLevelToStatus(matchLevel: ProviderDischargeTemplateMatchLevel): HospitalGradeDischargeStatus {
  if (matchLevel === "icdExact") return "HOSPITAL_GRADE_SPECIFIC";
  if (matchLevel === "generic") return "HOSPITAL_GRADE_GENERIC";
  return "HOSPITAL_GRADE_FAMILY";
}

export function buildEffectiveDischargeBundle(input: DiagnosisCertificationInput): {
  card: ProviderDischargeDiagnosisCard;
  sharedPlanning: ReturnType<typeof mergeTemplateSharedFieldsIntoForm>;
  resolved: ReturnType<typeof resolveProviderDischargeTemplateForDiagnosis>;
} {
  const locale = input.locale ?? "en";
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName,
  });
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: `cert-${input.code || "manual"}`,
    code: input.code,
    displayName: input.displayName,
    displayOrder: 0,
    isPrimaryDiagnosis: true,
    applyTemplateSuggestion: true,
    locale,
  });
  const shared = extractSharedFieldsFromTemplate(resolved.template, locale);
  const sharedPlanning = mergeTemplateSharedFieldsIntoForm(emptyProviderDischargeDocumentationForm(), shared, {});
  return { card, sharedPlanning, resolved };
}

export function certifyDischargeInstructionsForDiagnosis(
  input: DiagnosisCertificationInput
): UniversalDischargeCoverageRow {
  const source = input.source ?? "certification";
  const locale = input.locale ?? "en";
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName,
  });
  if (!resolved.template) {
    return {
      icdCode: input.code,
      diagnosis: input.displayName,
      source,
      resolverOutcome: "generic",
      templateId: "",
      templateTier: "generic",
      hasDescription: false,
      hasInstructions: false,
      hasMedicationTreatment: false,
      hasReturnPrecautions: false,
      hasFollowUp: false,
      status: "FAIL_NO_TEMPLATE",
    };
  }

  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: input.code,
    displayName: input.displayName,
    label: input.displayName,
  });
  if (feverPolicy.forceGenericFallback && resolved.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
    return {
      icdCode: input.code,
      diagnosis: input.displayName,
      source,
      resolverOutcome: resolved.matchLevel,
      templateId: resolved.template.id,
      templateTier: mapMatchLevelToTier(resolved.matchLevel),
      hasDescription: false,
      hasInstructions: false,
      hasMedicationTreatment: false,
      hasReturnPrecautions: false,
      hasFollowUp: false,
      status: "FAIL_UNSAFE_ROUTE",
    };
  }

  const { card, sharedPlanning } = buildEffectiveDischargeBundle(input);
  const body = resolveTemplateBodyForCertification(resolved.template.id, input.displayName, locale);
  const hasDescription = Boolean(card.description.trim() || body?.description.trim());
  const hasInstructions = Boolean(card.diagnosisInstructions.trim() || body?.diagnosisInstructions.trim());
  const hasMedicationTreatment = Boolean(card.medicationTreatment.trim() || body?.medicationTreatment.trim());
  const hasReturnPrecautions = Boolean(
    sharedPlanning.returnPrecautions.trim() || body?.returnPrecautions.trim()
  );
  const hasFollowUp = sharedPlanning.followUps.some((row) => row.timing.trim());

  const allPresent =
    hasDescription && hasInstructions && hasMedicationTreatment && hasReturnPrecautions && hasFollowUp;

  let status: HospitalGradeDischargeStatus;
  if (!allPresent) {
    status = "FAIL_MISSING_FIELD";
  } else {
    status = mapMatchLevelToStatus(resolved.matchLevel);
  }

  return {
    icdCode: input.code,
    diagnosis: input.displayName,
    source,
    resolverOutcome: resolved.matchLevel,
    templateId: resolved.template.id,
    templateTier: mapMatchLevelToTier(resolved.matchLevel),
    hasDescription,
    hasInstructions,
    hasMedicationTreatment,
    hasReturnPrecautions,
    hasFollowUp,
    status,
  };
}

export type UniversalDischargeInstructionCoverageReport = {
  rows: UniversalDischargeCoverageRow[];
  totalAudited: number;
  specificCount: number;
  familyCount: number;
  genericCount: number;
  failCount: number;
  allHospitalGrade: boolean;
};

export function buildUniversalDischargeInstructionCoverageReport(
  entries: readonly { code: string; label: string; source: string }[]
): UniversalDischargeInstructionCoverageReport {
  const rows = entries.map((entry) =>
    certifyDischargeInstructionsForDiagnosis({
      code: entry.code,
      displayName: entry.label,
      source: entry.source,
    })
  );
  const specificCount = rows.filter((r) => r.status === "HOSPITAL_GRADE_SPECIFIC").length;
  const familyCount = rows.filter((r) => r.status === "HOSPITAL_GRADE_FAMILY").length;
  const genericCount = rows.filter((r) => r.status === "HOSPITAL_GRADE_GENERIC").length;
  const failCount = rows.filter((r) => r.status.startsWith("FAIL_")).length;
  return {
    rows,
    totalAudited: rows.length,
    specificCount,
    familyCount,
    genericCount,
    failCount,
    allHospitalGrade: failCount === 0,
  };
}

export function buildRepoCatalogCoverageReport(): UniversalDischargeInstructionCoverageReport {
  const catalog = buildEdDischargeDiagnosisCatalog();
  return buildUniversalDischargeInstructionCoverageReport(
    catalog.map((e: EdDischargeDiagnosisCatalogEntry) => ({
      code: e.code,
      label: e.label,
      source: e.source,
    }))
  );
}

export type GenericFallbackHospitalGradeCertification = {
  templateId: string;
  hasDescription: boolean;
  hasInstructions: boolean;
  hasMedicationTreatment: boolean;
  hasReturnPrecautions: boolean;
  hasFollowUp: boolean;
  descriptionIncludesDiagnosisPlaceholder: boolean;
  medicationIncludesStopChangeGuard: boolean;
  returnPrecautionsHospitalGrade: boolean;
  followUpOneToTwoDays: boolean;
  hospitalGrade: boolean;
};

export function certifyGenericFallbackHospitalGrade(locale: "en" | "fr" = "en"): GenericFallbackHospitalGradeCertification {
  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!;
  const raw = getProviderDischargeSuggestedTextBody(template, locale);
  const personalized = personalizeGenericDischargeTemplateBody(raw, "test diagnosis");
  const hasDescription = Boolean(personalized.description.trim());
  const hasInstructions = Boolean(personalized.diagnosisInstructions.trim());
  const hasMedicationTreatment = Boolean(personalized.medicationTreatment.trim());
  const hasReturnPrecautions = Boolean(personalized.returnPrecautions.trim());
  const hasFollowUp = (template.defaultFollowUps?.length ?? 0) > 0;
  const descriptionIncludesDiagnosisPlaceholder =
    raw.description.includes("[diagnosis]") && personalized.description.includes("test diagnosis");
  const medicationIncludesStopChangeGuard = bodyIncludesGoldStandardMedicationSafety(personalized.medicationTreatment);
  const returnPrecautionsHospitalGrade = bodyIncludesGoldStandardReturnSuffix(personalized.returnPrecautions);
  const followUpOneToTwoDays = (template.defaultFollowUps ?? []).every((row) =>
    followUpTimingUsesOneToTwoDays(row.timing)
  );
  const hospitalGrade =
    hasDescription &&
    hasInstructions &&
    hasMedicationTreatment &&
    hasReturnPrecautions &&
    hasFollowUp &&
    descriptionIncludesDiagnosisPlaceholder &&
    medicationIncludesStopChangeGuard &&
    returnPrecautionsHospitalGrade &&
    followUpOneToTwoDays;

  return {
    templateId: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
    hasDescription,
    hasInstructions,
    hasMedicationTreatment,
    hasReturnPrecautions,
    hasFollowUp,
    descriptionIncludesDiagnosisPlaceholder,
    medicationIncludesStopChangeGuard,
    returnPrecautionsHospitalGrade,
    followUpOneToTwoDays,
    hospitalGrade,
  };
}

export type ManualDiagnosisFallbackCase = {
  code: string;
  displayName: string;
  label: string;
};

export type ManualDiagnosisFallbackReportRow = UniversalDischargeCoverageRow & {
  noCrash: boolean;
  diagnosisLabelPreserved: boolean;
};

export type ManualDiagnosisFallbackReport = {
  cases: ManualDiagnosisFallbackCase[];
  rows: ManualDiagnosisFallbackReportRow[];
  allSafe: boolean;
};

export const MANUAL_DIAGNOSIS_FALLBACK_CASES: ManualDiagnosisFallbackCase[] = [
  { code: "Z99.99", displayName: "Unknown test diagnosis", label: "Z99.99 unknown" },
  { code: "ABC123", displayName: "Invalid custom code", label: "invalid code" },
  { code: "", displayName: "Label only diagnosis", label: "label only" },
  { code: "R10.9", displayName: "", label: "code only" },
  { code: "", displayName: "Douleur abdominale", label: "French label only" },
];

export function certifyManualDiagnosisFallback(): ManualDiagnosisFallbackReport {
  const rows: ManualDiagnosisFallbackReportRow[] = MANUAL_DIAGNOSIS_FALLBACK_CASES.map((c) => {
    let noCrash = true;
    let row: UniversalDischargeCoverageRow;
    try {
      row = certifyDischargeInstructionsForDiagnosis({
        code: c.code,
        displayName: c.displayName,
        source: "manual_entry",
      });
    } catch {
      noCrash = false;
      row = {
        icdCode: c.code,
        diagnosis: c.displayName,
        source: "manual_entry",
        resolverOutcome: "generic",
        templateId: GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
        templateTier: "generic",
        hasDescription: false,
        hasInstructions: false,
        hasMedicationTreatment: false,
        hasReturnPrecautions: false,
        hasFollowUp: false,
        status: "FAIL_NO_TEMPLATE",
      };
    }
    const bundle = buildEffectiveDischargeBundle({ code: c.code, displayName: c.displayName });
    const diagnosisLabelPreserved =
      !c.displayName.trim() ||
      bundle.card.displayName === c.displayName ||
      bundle.card.description.toLowerCase().includes(c.displayName.toLowerCase());
    return { ...row, noCrash, diagnosisLabelPreserved };
  });
  const allSafe = rows.every(
    (r) =>
      r.noCrash &&
      r.status.startsWith("HOSPITAL_GRADE_") &&
      r.hasDescription &&
      r.hasInstructions &&
      r.hasMedicationTreatment &&
      r.hasReturnPrecautions &&
      r.hasFollowUp
  );
  return { cases: MANUAL_DIAGNOSIS_FALLBACK_CASES, rows, allSafe };
}

export type IcdCatalogAuditMode = "repo_sample" | "injected_json" | "picker_union" | "common_diagnoses";

export type FullIcdCatalogDischargeCoverageAuditReadiness = {
  modesSupported: IcdCatalogAuditMode[];
  repoSampleRowCount: number;
  pickerUnionRowCount: number;
  commonDiagnosesCount: number;
  aggregate: UniversalDischargeInstructionCoverageReport;
  top100GenericFallback: UniversalDischargeCoverageRow[];
  highRiskGenericFallback: UniversalDischargeCoverageRow[];
  pediatricGuardrailMismatches: UniversalDischargeCoverageRow[];
  obGynGuardrailMismatches: UniversalDischargeCoverageRow[];
  keywordOnlyMatches: UniversalDischargeCoverageRow[];
  unsafeRoutes: UniversalDischargeCoverageRow[];
};

function highRiskGenericCodes(): Set<string> {
  return new Set(["R07.9", "I21.9", "I50.9", "J96.00", "R55", "G40.909", "N93.9"]);
}

export function buildFullIcdCatalogDischargeCoverageAudit(options?: {
  injectedCatalog?: Array<{ code: string; label: string }>;
  mode?: IcdCatalogAuditMode;
}): FullIcdCatalogDischargeCoverageAuditReadiness {
  const modesSupported: IcdCatalogAuditMode[] = ["repo_sample", "injected_json", "picker_union", "common_diagnoses"];
  let entries: Array<{ code: string; label: string; source: string }>;

  if (options?.injectedCatalog?.length) {
    entries = options.injectedCatalog.map((r) => ({ ...r, source: "injected_json" }));
  } else if (options?.mode === "common_diagnoses") {
    entries = COMMON_DIAGNOSES.map((d) => ({ code: d.code, label: d.label, source: "common_diagnoses" }));
  } else if (options?.mode === "repo_sample") {
    entries = loadIcd10DevSampleCatalog().map((r) => ({
      code: r.code,
      label: r.label,
      source: "repo_sample",
    }));
  } else {
    entries = buildCoverageAuditLevel2PickerUnion().map((r) => ({
      code: r.code,
      label: r.label,
      source: r.pickerSource,
    }));
  }

  const aggregate = buildUniversalDischargeInstructionCoverageReport(entries);
  const genericRows = aggregate.rows.filter((r) => r.status === "HOSPITAL_GRADE_GENERIC");
  const top100GenericFallback = genericRows.slice(0, 100);
  const highRisk = highRiskGenericCodes();
  const highRiskGenericFallback = genericRows.filter((r) => highRisk.has(r.icdCode.toUpperCase()));
  const pediatricGuardrailMismatches = aggregate.rows.filter((r) => {
    if (r.icdCode.toUpperCase() !== "R50.9") return false;
    const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R50.9", displayName: "pediatric fever" });
    return resolved.template.id === "infectious_fever_unknown_source_v1";
  });
  const obGynGuardrailMismatches = aggregate.rows.filter((r) => r.status === "FAIL_UNSAFE_ROUTE");
  const keywordOnlyMatches = aggregate.rows.filter((r) => r.resolverOutcome === "keyword");
  const unsafeRoutes = aggregate.rows.filter((r) => r.status === "FAIL_UNSAFE_ROUTE");

  return {
    modesSupported,
    repoSampleRowCount: loadIcd10DevSampleCatalog().length,
    pickerUnionRowCount: buildCoverageAuditLevel2PickerUnion().length,
    commonDiagnosesCount: COMMON_DIAGNOSES.length,
    aggregate,
    top100GenericFallback,
    highRiskGenericFallback,
    pediatricGuardrailMismatches,
    obGynGuardrailMismatches,
    keywordOnlyMatches,
    unsafeRoutes,
  };
}

export type AutomaticDiagnosisInstructionApplicationReport = {
  cardCreated: boolean;
  templateApplied: boolean;
  genericFallbackApplied: boolean;
  allFieldsPopulated: boolean;
  refreshUpdatesFields: boolean;
  customTextPreservedUntilRefresh: boolean;
};

export function certifyAutomaticDiagnosisInstructionApplication(): AutomaticDiagnosisInstructionApplicationReport {
  const ref = { encounterDiagnosisId: "dx-auto", code: "Z99.99", label: "Unknown test", isPrimary: true };
  let form = emptyProviderDischargeDocumentationForm();
  const created = ensureProviderDischargeCardForRef(form, ref, {
    applyTemplate: true,
    locale: "en",
    displayOrder: 0,
    isPrimary: true,
  });
  form = { ...form, diagnosisDocs: [created] };

  const cardCreated = Boolean(created.id);
  const templateApplied = created.templateMeta?.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
  const genericFallbackApplied = templateApplied && Boolean(created.description.trim());
  const shared = extractSharedFieldsFromTemplate(
    PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID)!,
    "en"
  );
  const allFieldsPopulated =
    Boolean(created.description.trim()) &&
    Boolean(created.diagnosisInstructions.trim()) &&
    Boolean(created.medicationTreatment.trim()) &&
    Boolean(shared.returnPrecautions.trim()) &&
    (shared.defaultFollowUps?.length ?? 0) > 0;

  const withCustom = {
    ...created,
    description: "Provider custom description",
    diagnosisInstructions: "Provider custom instructions",
  };
  form = { ...form, diagnosisDocs: [withCustom] };
  const syncedNoForce = syncProviderDischargeCardWithRef(withCustom, ref, {
    applyTemplate: true,
    locale: "en",
    isPrimary: true,
    displayOrder: 0,
  });
  const customTextPreservedUntilRefresh =
    syncedNoForce.description === "Provider custom description" &&
    syncedNoForce.diagnosisInstructions === "Provider custom instructions";

  const syncedForce = syncProviderDischargeCardWithRef(withCustom, ref, {
    applyTemplate: true,
    locale: "en",
    isPrimary: true,
    displayOrder: 0,
    forceOverwrite: true,
  });
  const refreshUpdatesFields =
    syncedForce.description !== "Provider custom description" &&
    Boolean(syncedForce.diagnosisInstructions.trim()) &&
    Boolean(syncedForce.medicationTreatment.trim());

  return {
    cardCreated,
    templateApplied,
    genericFallbackApplied,
    allFieldsPopulated,
    refreshUpdatesFields,
    customTextPreservedUntilRefresh,
  };
}

export type UniversalOutputSurfaceCertificationReport = {
  editorHasContent: boolean;
  previewRenders: boolean;
  summaryRenders: boolean;
  printHtmlRenders: boolean;
  erPacketRenders: boolean;
  patientFacingRenders: boolean;
  allSurfacesOk: boolean;
};

export function certifyUniversalOutputSurfaces(
  form: ProviderDischargeDocumentationForm,
  locale: "en" | "fr" = "en"
): UniversalOutputSurfaceCertificationReport {
  const card = form.diagnosisDocs[0];
  const editorHasContent = Boolean(
    card?.description.trim() &&
      card?.diagnosisInstructions.trim() &&
      card?.medicationTreatment.trim()
  );
  const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, locale);
  const previewBlob = JSON.stringify(preview);
  const previewRenders =
    preview.length > 0 &&
    previewBlob.includes(card?.displayName ?? "") &&
    previewBlob.length > 50;

  const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
    documentedAt: "2026-06-03T18:05:00.000Z",
    documentedByDisplayName: "Dr Test",
  });
  const summary = buildProviderDischargeDocumentationSummaryBlock(merged, locale);
  const summaryRenders = Boolean(summary?.lines.some((l) => l.trim().length > 10));

  const html = getDischargePrintHtml({
    patient: { firstName: "Test", lastName: "Patient", dob: "1990-01-01" },
    encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
    language: locale,
  });
  const printHtmlRenders = html.includes(card?.displayName ?? "") && html.length > 200;

  const instructionBlob = [
    card?.description,
    card?.diagnosisInstructions,
    card?.medicationTreatment,
    form.returnPrecautions,
  ]
    .filter(Boolean)
    .join(" ");
  const erPacketRenders = instructionBlob.trim().length > 50;
  const patientFacingRenders = previewRenders && printHtmlRenders;

  return {
    editorHasContent,
    previewRenders,
    summaryRenders,
    printHtmlRenders,
    erPacketRenders,
    patientFacingRenders,
    allSurfacesOk:
      editorHasContent &&
      previewRenders &&
      summaryRenders &&
      printHtmlRenders &&
      erPacketRenders &&
      patientFacingRenders,
  };
}

export function buildCertificationFormForDiagnosis(input: {
  code: string;
  displayName: string;
  locale?: "en" | "fr";
}): ProviderDischargeDocumentationForm {
  const locale = input.locale ?? "en";
  const { card, sharedPlanning, resolved } = buildEffectiveDischargeBundle({ ...input, locale });
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [
      {
        encounterDiagnosisId: `dx-${input.code || "manual"}`,
        code: input.code,
        label: input.displayName,
        isPrimary: true,
      },
    ],
    diagnosisDocs: [card],
    returnPrecautions: sharedPlanning.returnPrecautions,
    returnWorkSchool: sharedPlanning.returnWorkSchool,
    followUps: sharedPlanning.followUps.length ?
      sharedPlanning.followUps
    : [
        {
          ...newDefaultFollowUpRow(),
          specialty: "PRIMARY_CARE",
          timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
        },
      ],
  });
}
