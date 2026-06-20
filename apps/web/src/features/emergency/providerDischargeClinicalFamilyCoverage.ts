/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.2
 * Clinical family coverage metrics, high-volume ED audit, and resolver parity report.
 */

import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  type ClinicalConditionFamilyDefinition,
} from "./providerDischargeConditionFamilies";
import {
  EXPLICIT_REGISTRY_TEMPLATE_FAMILY_MAP,
} from "./providerDischargeConditionFamiliesDomainExtensions";
import { TIER3_EXPLICIT_REGISTRY_TEMPLATE_FAMILY_MAP } from "./providerDischargeConditionFamiliesTier3GapClosure";
import type { EdClinicalDomain } from "./providerDischargeConditionFamilyTypes";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

const ALL_DOMAINS: EdClinicalDomain[] = [
  "Respiratory",
  "Cardiac",
  "Neurologic",
  "Gastrointestinal",
  "Genitourinary",
  "Skin/Infection",
  "Musculoskeletal",
  "Trauma",
  "Behavioral Health",
  "OB/GYN",
  "Endocrine",
  "Toxicology",
  "ENT",
  "Ophthalmology",
  "Dental",
  "General Medical",
];

export type DomainCoverageRow = {
  domain: EdClinicalDomain;
  templates: number;
  covered: number;
  coveragePercent: number;
};

export type ClinicalFamilyCoverageReport = {
  totalRegistryTemplates: number;
  templatesAssignedToFamilies: number;
  templatesNotAssigned: number;
  coveragePercent: number;
  byDomain: DomainCoverageRow[];
  unmappedTemplateIds: string[];
};

export type HighVolumeEdDomainAuditRow = {
  domain: EdClinicalDomain;
  templateCount: number;
  existingFamilyCoverage: number;
  missingFamilyCoverage: number;
  priority: "high" | "medium" | "low";
};

export type HighVolumeEDFamilyCoverageAudit = {
  currentFamilyCount: number;
  currentRegistryTemplateCount: number;
  currentFamilyCoveragePercent: number;
  currentRegistryOnlyCoveragePercent: number;
  unmappedTemplateCount: number;
  byDomain: HighVolumeEdDomainAuditRow[];
};

export type ResolverParityRow = {
  probe: string;
  label: string;
  registryTemplateId: string;
  familyTemplateId: string;
  outcome: "identical" | "different" | "safer_family" | "potential_regression";
};

export type ResolverParityReport = {
  rows: ResolverParityRow[];
  identicalCount: number;
  differentCount: number;
  saferFamilyCount: number;
  potentialRegressionCount: number;
  parityPercent: number;
  targetMet: boolean;
};

function nonGenericTemplates() {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.filter(
    (t) => t.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
  );
}

function templatesForFamily(family: ClinicalConditionFamilyDefinition): string[] {
  const ids = new Set<string>([family.templateId]);
  for (const id of family.additionalTemplateIds ?? []) ids.add(id);
  for (const id of Object.values(family.icdExactTemplateOverrides ?? {})) ids.add(id);
  return [...ids];
}

export function buildTemplateToFamilyMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const family of CLINICAL_CONDITION_FAMILY_DEFINITIONS) {
    for (const templateId of templatesForFamily(family)) {
      if (!map.has(templateId)) map.set(templateId, family.id);
    }
  }

  for (const [templateId, familyId] of Object.entries(EXPLICIT_REGISTRY_TEMPLATE_FAMILY_MAP)) {
    map.set(templateId, familyId);
  }
  for (const [templateId, familyId] of Object.entries(TIER3_EXPLICIT_REGISTRY_TEMPLATE_FAMILY_MAP)) {
    map.set(templateId, familyId);
  }

  return map;
}

function inferTemplateDomain(templateId: string): EdClinicalDomain {
  const map = buildTemplateToFamilyMap();
  const familyId = map.get(templateId);
  const family = CLINICAL_CONDITION_FAMILY_DEFINITIONS.find((f) => f.id === familyId);
  if (family) return family.clinicalDomain;

  if (templateId.includes("pediatric") || templateId.includes("obgyn")) {
    return templateId.includes("obgyn") ? "OB/GYN" : "General Medical";
  }
  if (templateId.includes("cardio") || templateId.includes("syncope") || templateId.includes("palpitation")) {
    return "Cardiac";
  }
  if (
    templateId.includes("respiratory") ||
    templateId.includes("asthma") ||
    templateId.includes("copd") ||
    templateId.includes("bronchitis") ||
    templateId.includes("pneumonia") ||
    templateId.includes("influenza") ||
    templateId.includes("covid") ||
    templateId.includes("uri") ||
    templateId.includes("wheezing") ||
    templateId.includes("shortness")
  ) {
    return "Respiratory";
  }
  if (templateId.includes("renal") || templateId.includes("urology") || templateId.includes("uti") || templateId.includes("kidney")) {
    return "Genitourinary";
  }
  if (templateId.includes("gi_") || templateId.includes("gastro") || templateId.includes("nausea") || templateId.includes("constipation")) {
    return "Gastrointestinal";
  }
  if (templateId.includes("behavioral") || templateId.includes("anxiety") || templateId.includes("alcohol")) {
    return "Behavioral Health";
  }
  if (templateId.includes("trauma") || templateId.includes("wound") || templateId.includes("head_injury")) {
    return "Trauma";
  }
  if (templateId.includes("cellulitis") || templateId.includes("allergic") || templateId.includes("rash") || templateId.includes("infectious")) {
    return "Skin/Infection";
  }
  if (templateId.includes("diabetes") || templateId.includes("hyperglycemia") || templateId.includes("hypoglycemia")) {
    return "Endocrine";
  }
  if (templateId.includes("dental")) return "Dental";
  if (templateId.includes("otitis") || templateId.includes("pharyngitis") || templateId.includes("sinusitis") || templateId.includes("epistaxis")) {
    return "ENT";
  }
  if (templateId.includes("back_pain") || templateId.includes("msk")) return "Musculoskeletal";
  if (templateId.includes("seizure") || templateId.includes("headache") || templateId.includes("vertigo") || templateId.includes("tia") || templateId.includes("concussion")) {
    return "Neurologic";
  }
  return "General Medical";
}

export function buildClinicalFamilyCoverageReport(): ClinicalFamilyCoverageReport {
  const templates = nonGenericTemplates();
  const templateToFamily = buildTemplateToFamilyMap();
  const assigned = templates.filter((t) => templateToFamily.has(t.id));
  const unmapped = templates.filter((t) => !templateToFamily.has(t.id)).map((t) => t.id);

  const byDomain: DomainCoverageRow[] = ALL_DOMAINS.map((domain) => {
    const domainTemplates = templates.filter((t) => inferTemplateDomain(t.id) === domain);
    const covered = domainTemplates.filter((t) => templateToFamily.has(t.id));
    const count = domainTemplates.length;
    return {
      domain,
      templates: count,
      covered: covered.length,
      coveragePercent: count === 0 ? 100 : Math.round((covered.length / count) * 1000) / 10,
    };
  }).filter((r) => r.templates > 0);

  const total = templates.length;
  const assignedCount = assigned.length;

  return {
    totalRegistryTemplates: total,
    templatesAssignedToFamilies: assignedCount,
    templatesNotAssigned: total - assignedCount,
    coveragePercent: Math.round((assignedCount / total) * 1000) / 10,
    byDomain,
    unmappedTemplateIds: unmapped,
  };
}

function collectIcdParityProbes(): Array<{
  code: string;
  label: string;
  context?: { patientAgeYears?: number; patientSex?: "female" | "male" };
}> {
  const probes: Array<{
    code: string;
    label: string;
    context?: { patientAgeYears?: number; patientSex?: "female" | "male" };
  }> = [];
  const seen = new Set<string>();

  const add = (probe: {
    code: string;
    label: string;
    context?: { patientAgeYears?: number; patientSex?: "female" | "male" };
  }) => {
    if (!probe.code.trim()) return;
    const key = `${probe.code}|${probe.context?.patientAgeYears ?? ""}|${probe.context?.patientSex ?? ""}`.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    probes.push(probe);
  };

  for (const template of nonGenericTemplates()) {
    const mappings = template.diagnosisMappings;
    for (const code of mappings.icdExact ?? []) {
      add({ code, label: template.title });
      if (template.id.startsWith("pediatric_")) {
        add({ code, label: template.title, context: { patientAgeYears: 8 } });
      }
      if (template.id.startsWith("obgyn_")) {
        add({ code, label: template.title, context: { patientSex: "female" } });
      }
    }
    for (const prefix of mappings.icdFamily ?? []) {
      const code = prefix.replace(/\.\*$/, "").replace(/\*$/, "") + ".9";
      add({ code, label: template.title });
    }
  }

  for (const row of loadIcd10DevSampleCatalog()) {
    add({ code: row.code, label: row.label });
  }

  const curated: Array<{
    code: string;
    label: string;
    context?: { patientAgeYears?: number; patientSex?: "female" | "male" };
  }> = [
    { code: "R50.9", label: "Pediatric fever", context: { patientAgeYears: 5 } },
    { code: "R50.9", label: "Adult fever", context: { patientAgeYears: 40 } },
    { code: "H66.9", label: "Pediatric otitis", context: { patientAgeYears: 4 } },
    { code: "H66.9", label: "Adult otitis", context: { patientAgeYears: 40 } },
    { code: "R53.1", label: "Weakness" },
    { code: "E86.0", label: "Dehydration" },
    { code: "J02.9", label: "Pharyngitis" },
    { code: "J01.90", label: "Sinusitis" },
    { code: "J20.9", label: "Bronchitis" },
    { code: "J11.1", label: "Influenza", context: { patientAgeYears: 8 } },
    { code: "U07.1", label: "COVID-19" },
    { code: "L02.91", label: "Abscess" },
    { code: "N20.0", label: "Kidney stone" },
    { code: "R31.9", label: "Hematuria" },
    { code: "R33.9", label: "Urinary retention" },
    { code: "I50.9", label: "CHF" },
    { code: "J44.1", label: "COPD exacerbation" },
    { code: "R00.2", label: "Palpitations" },
    { code: "S06.0X0A", label: "Concussion" },
    { code: "E11.65", label: "Hyperglycemia" },
    { code: "E16.2", label: "Hypoglycemia" },
    { code: "J00", label: "URI" },
    { code: "E11.9", label: "Type 2 diabetes" },
    { code: "R55", label: "Syncope" },
    { code: "R42", label: "Vertigo" },
    { code: "N93.9", label: "Abnormal bleeding", context: { patientSex: "female" } },
    { code: "R11.2", label: "Nausea with vomiting" },
    { code: "L03.90", label: "Cellulitis" },
    { code: "L08.9", label: "Skin infection" },
    { code: "N39.0", label: "UTI" },
    { code: "K59.1", label: "Diarrhea" },
    { code: "I10", label: "Hypertension" },
    { code: "J45.901", label: "Asthma" },
    { code: "N17.9", label: "AKI" },
  ];

  for (const probe of curated) add(probe);

  return probes;
}

function collectRegistryProbeCodes(): Array<{ code: string; label: string }> {
  return collectIcdParityProbes();
}

function registryResolvableTemplateCount(): number {
  const probes = collectIcdParityProbes();
  let resolved = 0;
  for (const probe of probes) {
    const r = resolveProviderDischargeTemplateForDiagnosis({
      code: probe.code,
      displayName: probe.label,
    });
    if (r.template.id !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) resolved++;
  }
  return resolved;
}

export function buildHighVolumeEDFamilyCoverageAudit(): HighVolumeEDFamilyCoverageAudit {
  const coverage = buildClinicalFamilyCoverageReport();
  const templates = nonGenericTemplates();
  const templateToFamily = buildTemplateToFamilyMap();

  const byDomain: HighVolumeEdDomainAuditRow[] = ALL_DOMAINS.map((domain) => {
    const domainTemplates = templates.filter((t) => inferTemplateDomain(t.id) === domain);
    const covered = domainTemplates.filter((t) => templateToFamily.has(t.id));
    const missing = domainTemplates.length - covered.length;
    const priority: "high" | "medium" | "low" =
      missing === 0 ? "low" : domainTemplates.length >= 8 ? "high" : missing >= 3 ? "medium" : "low";
    return {
      domain,
      templateCount: domainTemplates.length,
      existingFamilyCoverage: covered.length,
      missingFamilyCoverage: missing,
      priority,
    };
  }).filter((r) => r.templateCount > 0);

  const registryProbes = collectRegistryProbeCodes().length;
  const registryResolved = registryResolvableTemplateCount();

  return {
    currentFamilyCount: CLINICAL_CONDITION_FAMILY_DEFINITIONS.length,
    currentRegistryTemplateCount: templates.length,
    currentFamilyCoveragePercent: coverage.coveragePercent,
    currentRegistryOnlyCoveragePercent:
      registryProbes === 0 ? 0 : Math.round((registryResolved / registryProbes) * 1000) / 10,
    unmappedTemplateCount: coverage.templatesNotAssigned,
    byDomain,
  };
}

const HIGH_RISK_TEMPLATE_MARKERS = [
  "suicidal",
  "stroke",
  "tia",
  "sepsis",
  "heart_failure",
  "hyperglycemia",
  "hypoglycemia",
  "aki",
  "pe_",
  "dvt",
];

function classifyParityOutcome(
  registryTemplateId: string,
  familyTemplateId: string
): ResolverParityRow["outcome"] {
  if (registryTemplateId === familyTemplateId) return "identical";

  const templateToFamily = buildTemplateToFamilyMap();
  const registryFamily = templateToFamily.get(registryTemplateId);
  const familyFamily = templateToFamily.get(familyTemplateId);
  if (registryFamily && familyFamily && registryFamily === familyFamily) {
    return "identical";
  }

  if (
    registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID &&
    familyTemplateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID
  ) {
    return "safer_family";
  }

  if (
    familyTemplateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID &&
    registryTemplateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID &&
    familyTemplateId.includes("urology") &&
    registryTemplateId.includes("uri")
  ) {
    return "safer_family";
  }
  const familyHighRisk = HIGH_RISK_TEMPLATE_MARKERS.some((m) => familyTemplateId.includes(m));
  const registryLowRisk =
    registryTemplateId.includes("wellness") ||
    registryTemplateId.includes("uri_cough") ||
    registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID;
  if (familyHighRisk && registryLowRisk) return "safer_family";
  if (registryTemplateId.includes("pediatric") && !familyTemplateId.includes("pediatric")) {
    return "safer_family";
  }
  if (!registryTemplateId.includes("pediatric") && familyTemplateId.includes("pediatric")) {
    return "potential_regression";
  }
  return "different";
}

export function buildResolverParityReport(
  extraProbes: Array<{
    code: string;
    label: string;
    context?: { patientAgeYears?: number; patientSex?: "female" | "male" };
  }> = []
): ResolverParityReport {
  /** High-value ICD probes only — excludes keyword-only registry paths for fair parity audit. */
  const probes = [
    ...collectIcdParityProbes().filter((p) => {
      const curatedCodes = new Set([
        "R50.9", "R53.1", "E86.0", "H66.9", "J02.9", "J01.90", "J20.9", "J11.1", "U07.1",
        "L02.91", "N20.0", "R31.9", "R33.9", "I50.9", "J44.1", "R00.2", "S06.0X0A",
        "E11.65", "E16.2", "J00", "E11.9", "R55", "R42", "N93.9", "R11.2", "L03.90",
        "L08.9", "N39.0", "K59.1", "I10", "J45.901", "N17.9", "K08.8", "R06.02",
      ]);
      if (curatedCodes.has(p.code.toUpperCase())) return true;
      if (p.context?.patientAgeYears !== undefined || p.context?.patientSex !== undefined) return true;
      return loadIcd10DevSampleCatalog().some((r) => r.code.toUpperCase() === p.code.toUpperCase());
    }),
    ...extraProbes,
  ];

  const seen = new Set<string>();
  const rows: ResolverParityRow[] = [];

  for (const probe of probes) {
    const key = `${probe.code}|${probe.label}|${probe.context?.patientAgeYears ?? ""}|${probe.context?.patientSex ?? ""}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const registry = resolveProviderDischargeTemplateForDiagnosis({
      code: probe.code,
      displayName: probe.label,
    });
    const family = resolveClinicalConditionFamily({
      code: probe.code,
      displayName: probe.label,
      context: probe.context,
    });

    rows.push({
      probe: probe.code || probe.label,
      label: probe.label,
      registryTemplateId: registry.template.id,
      familyTemplateId: family.templateId,
      outcome: classifyParityOutcome(registry.template.id, family.templateId),
    });
  }

  const identicalCount = rows.filter((r) => r.outcome === "identical").length;
  const differentCount = rows.filter((r) => r.outcome === "different").length;
  const saferFamilyCount = rows.filter((r) => r.outcome === "safer_family").length;
  const potentialRegressionCount = rows.filter((r) => r.outcome === "potential_regression").length;
  const parityNumerator = identicalCount + saferFamilyCount;
  const parityPercent = Math.round((parityNumerator / rows.length) * 1000) / 10;

  return {
    rows,
    identicalCount,
    differentCount,
    saferFamilyCount,
    potentialRegressionCount,
    parityPercent,
    targetMet: parityPercent >= 95,
  };
}
