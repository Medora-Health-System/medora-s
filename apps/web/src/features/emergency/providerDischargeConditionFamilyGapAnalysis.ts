/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.1
 * Gap and conflict analysis — family map vs current registry resolution.
 */

import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import { CLINICAL_CONDITION_FAMILY_DEFINITIONS } from "./providerDischargeConditionFamilies";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import {
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";

export type ConditionFamilyConflictType =
  | "TEMPLATE_MISMATCH"
  | "FAMILY_MISSING"
  | "REGISTRY_MISSING"
  | "KEYWORD_OVERRIDE_RISK"
  | "PEDIATRIC_ADULT_RISK"
  | "OVERLY_SPECIFIC"
  | "PREFIX_OVERLAP"
  | "ALIGNED";

export type ConditionFamilyGapConflictRow = {
  icdOrPrefix: string;
  label: string;
  currentTemplateId: string;
  currentMatchLevel: string;
  proposedFamilyId: string | null;
  proposedTemplateId: string;
  proposedMatchLevel: string;
  conflictType: ConditionFamilyConflictType;
  risk: "low" | "moderate" | "high";
  recommendedAction: string;
};

export type ConditionFamilyGapConflictReport = {
  rows: ConditionFamilyGapConflictRow[];
  templateMismatchCount: number;
  alignedCount: number;
  pediatricAdultRiskCount: number;
  keywordOverrideRiskCount: number;
};

const PROBE_CODES: Array<{ code: string; label: string }> = [
  { code: "R11.2", label: "Nausea with vomiting" },
  { code: "R11.0", label: "Nausea" },
  { code: "R11.10", label: "Vomiting" },
  { code: "L03.90", label: "Cellulitis, unspecified" },
  { code: "L03.115", label: "Cellulitis of right lower limb" },
  { code: "L03.116", label: "Cellulitis of left lower limb" },
  { code: "L08.9", label: "Local infection of skin, unspecified" },
  { code: "E11.9", label: "Type 2 diabetes without complication" },
  { code: "E11.65", label: "Type 2 diabetes with hyperglycemia" },
  { code: "J00", label: "Acute nasopharyngitis" },
  { code: "R53.1", label: "Weakness" },
  { code: "K59.1", label: "Functional diarrhea" },
  { code: "R10.2", label: "Pelvic and perineal pain" },
  { code: "N93.9", label: "Abnormal uterine bleeding" },
  { code: "Z99.99", label: "Unmapped code" },
];

function classifyConflict(
  currentTemplateId: string,
  proposedTemplateId: string,
  currentMatch: string,
  proposedMatch: string,
  code: string,
  label: string
): ConditionFamilyConflictType {
  if (currentTemplateId === proposedTemplateId) return "ALIGNED";
  if (proposedMatch === "generic") return "FAMILY_MISSING";
  if (currentMatch === "generic") return "REGISTRY_MISSING";
  if (currentMatch === "keyword" && (proposedMatch === "icdExact" || proposedMatch === "icdPrefix")) {
    return "KEYWORD_OVERRIDE_RISK";
  }
  if (currentTemplateId.includes("pediatric") && !proposedTemplateId.includes("pediatric")) {
    return "PEDIATRIC_ADULT_RISK";
  }
  if (proposedTemplateId.includes("pediatric") && !currentTemplateId.includes("pediatric")) {
    return "PEDIATRIC_ADULT_RISK";
  }
  if (
    currentTemplateId.includes("tia") ||
    currentTemplateId.includes("stroke") ||
    currentTemplateId.includes("hyperglycemia") && code.startsWith("E11.9")
  ) {
    return "OVERLY_SPECIFIC";
  }
  return "TEMPLATE_MISMATCH";
}

function riskForConflict(type: ConditionFamilyConflictType): "low" | "moderate" | "high" {
  switch (type) {
    case "ALIGNED":
      return "low";
    case "REGISTRY_MISSING":
    case "FAMILY_MISSING":
      return "moderate";
    case "KEYWORD_OVERRIDE_RISK":
    case "PEDIATRIC_ADULT_RISK":
    case "OVERLY_SPECIFIC":
      return "high";
    default:
      return "moderate";
  }
}

function actionForConflict(type: ConditionFamilyConflictType): string {
  switch (type) {
    case "ALIGNED":
      return "No action — family map aligns with registry";
    case "FAMILY_MISSING":
      return "Add or extend condition family mapping";
    case "REGISTRY_MISSING":
      return "Registry already generic — family map improves coverage";
    case "KEYWORD_OVERRIDE_RISK":
      return "Prefer ICD family routing; narrow keyword lists";
    case "PEDIATRIC_ADULT_RISK":
      return "Apply age guardrails before pediatric template routing";
    case "OVERLY_SPECIFIC":
      return "Use conservative family template; avoid acute-specific templates for stable codes";
    case "PREFIX_OVERLAP":
      return "Resolve prefix overlap with exclusions or longer-prefix wins";
    default:
      return "Review template parity before switching production resolver";
  }
}

export function buildConditionFamilyGapConflictReport(
  probes: Array<{ code: string; label: string }> = [
    ...PROBE_CODES,
    ...loadIcd10DevSampleCatalog().map((r) => ({ code: r.code, label: r.label })),
  ]
): ConditionFamilyGapConflictReport {
  const seen = new Set<string>();
  const rows: ConditionFamilyGapConflictRow[] = [];

  for (const probe of probes) {
    const key = probe.code.trim().toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const registry = resolveProviderDischargeTemplateForDiagnosis({
      code: probe.code,
      displayName: probe.label,
    });
    const family = resolveClinicalConditionFamily({
      code: probe.code,
      displayName: probe.label,
    });

    const conflictType = classifyConflict(
      registry.template.id,
      family.templateId,
      registry.matchLevel,
      family.matchLevel,
      probe.code,
      probe.label
    );

    rows.push({
      icdOrPrefix: probe.code,
      label: probe.label,
      currentTemplateId: registry.template.id,
      currentMatchLevel: registry.matchLevel,
      proposedFamilyId: family.familyId,
      proposedTemplateId: family.templateId,
      proposedMatchLevel: family.matchLevel,
      conflictType,
      risk: riskForConflict(conflictType),
      recommendedAction: actionForConflict(conflictType),
    });
  }

  return {
    rows,
    templateMismatchCount: rows.filter((r) => r.conflictType === "TEMPLATE_MISMATCH").length,
    alignedCount: rows.filter((r) => r.conflictType === "ALIGNED").length,
    pediatricAdultRiskCount: rows.filter((r) => r.conflictType === "PEDIATRIC_ADULT_RISK").length,
    keywordOverrideRiskCount: rows.filter((r) => r.conflictType === "KEYWORD_OVERRIDE_RISK").length,
  };
}

/** Registry ICD prefixes declared but not represented in any condition family (audit helper). */
export function listRegistryPrefixesMissingFromFamilies(): string[] {
  const familyPrefixes = new Set(
    CLINICAL_CONDITION_FAMILY_DEFINITIONS.flatMap((f) => f.icdPrefixes ?? []).map((p) =>
      p.replace(/\.\*$/, "").replace(/\*$/, "").toUpperCase()
    )
  );
  // High-value prefixes already in families — return empty when covered; extensible for future audits.
  const highValuePrefixes = [
    "R11", "L03", "L08", "J06", "R07", "R10", "R51", "N39", "R19", "M54", "J45", "J18", "I10", "E11", "R73", "S01", "R42", "R55", "G40",
  ];
  return highValuePrefixes.filter((p) => !familyPrefixes.has(p));
}
