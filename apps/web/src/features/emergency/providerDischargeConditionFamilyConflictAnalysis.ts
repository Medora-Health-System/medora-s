/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.2
 * Pairwise condition family conflict analysis.
 */

import { CLINICAL_CONDITION_FAMILY_DEFINITIONS } from "./providerDischargeConditionFamilies";
import type { ClinicalConditionFamilyDefinition } from "./providerDischargeConditionFamilyTypes";

export type ConditionFamilyCoverageConflictType =
  | "ICD_EXACT_CONFLICT"
  | "ICD_PREFIX_OVERLAP"
  | "KEYWORD_CONFLICT"
  | "PEDIATRIC_ADULT_CONFLICT"
  | "OBGYN_CONFLICT"
  | "BEHAVIORAL_HEALTH_CONFLICT";

export type ConditionFamilyCoverageConflictRow = {
  familyA: string;
  familyB: string;
  conflictType: ConditionFamilyCoverageConflictType;
  risk: "low" | "moderate" | "high";
  detail: string;
  recommendedResolution: string;
};

export type ConditionFamilyCoverageConflictReport = {
  rows: ConditionFamilyCoverageConflictRow[];
  icdExactConflictCount: number;
  prefixOverlapCount: number;
  keywordConflictCount: number;
  highRiskCount: number;
};

function normalizeIcd(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

function prefixToken(raw: string): string {
  return normalizeIcd(raw.replace(/\.\*$/, "").replace(/\*$/, ""));
}

function riskForType(type: ConditionFamilyCoverageConflictType): "low" | "moderate" | "high" {
  switch (type) {
    case "ICD_EXACT_CONFLICT":
    case "PEDIATRIC_ADULT_CONFLICT":
    case "BEHAVIORAL_HEALTH_CONFLICT":
      return "high";
    case "ICD_PREFIX_OVERLAP":
    case "OBGYN_CONFLICT":
      return "moderate";
    default:
      return "low";
  }
}

function hasPediatricGuardrail(f: ClinicalConditionFamilyDefinition): boolean {
  return f.guardrails?.age?.maxAgeYears !== undefined;
}

function hasAdultGuardrail(f: ClinicalConditionFamilyDefinition): boolean {
  return f.guardrails?.age?.minAgeYears !== undefined;
}

function isObgynFamily(f: ClinicalConditionFamilyDefinition): boolean {
  return f.clinicalDomain === "OB/GYN" || f.id.includes("obgyn");
}

function isBehavioralFamily(f: ClinicalConditionFamilyDefinition): boolean {
  return f.clinicalDomain === "Behavioral Health" || f.id.includes("behavioral");
}

export function buildConditionFamilyCoverageConflictReport(): ConditionFamilyCoverageConflictReport {
  const rows: ConditionFamilyCoverageConflictRow[] = [];
  const families = CLINICAL_CONDITION_FAMILY_DEFINITIONS;

  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const a = families[i]!;
      const b = families[j]!;

      for (const exactA of a.icdExact ?? []) {
        for (const exactB of b.icdExact ?? []) {
          if (normalizeIcd(exactA) === normalizeIcd(exactB)) {
            const bothPediatricAdult =
              (hasPediatricGuardrail(a) && hasAdultGuardrail(b)) ||
              (hasPediatricGuardrail(b) && hasAdultGuardrail(a));
            rows.push({
              familyA: a.id,
              familyB: b.id,
              conflictType: bothPediatricAdult ? "PEDIATRIC_ADULT_CONFLICT" : "ICD_EXACT_CONFLICT",
              risk: bothPediatricAdult ? "high" : riskForType("ICD_EXACT_CONFLICT"),
              detail: `Shared ICD exact ${exactA}`,
              recommendedResolution: bothPediatricAdult
                ? "Age guardrails disambiguate — verify resolver applies guardrails before match"
                : "Remove duplicate exact code or add exclusion on lower-priority family",
            });
          }
        }
      }

      for (const prefixA of a.icdPrefixes ?? []) {
        for (const prefixB of b.icdPrefixes ?? []) {
          const pa = prefixToken(prefixA);
          const pb = prefixToken(prefixB);
          if (!pa || !pb) continue;
          if (pa.startsWith(pb) || pb.startsWith(pa)) {
            const excluded =
              (b.excludeIcdPrefixes ?? []).some((p) => pa.startsWith(prefixToken(p))) ||
              (a.excludeIcdPrefixes ?? []).some((p) => pb.startsWith(prefixToken(p)));
            if (excluded) continue;
            rows.push({
              familyA: a.id,
              familyB: b.id,
              conflictType: "ICD_PREFIX_OVERLAP",
              risk: riskForType("ICD_PREFIX_OVERLAP"),
              detail: `Prefix overlap ${prefixA} / ${prefixB}`,
              recommendedResolution: "Longer prefix wins; add excludeIcdPrefixes where clinically distinct",
            });
          }
        }
      }

      for (const kwA of a.keywords ?? []) {
        for (const kwB of b.keywords ?? []) {
          if (kwA.toLowerCase() === kwB.toLowerCase()) {
            rows.push({
              familyA: a.id,
              familyB: b.id,
              conflictType: "KEYWORD_CONFLICT",
              risk: "low",
              detail: `Shared keyword "${kwA}"`,
              recommendedResolution: "Prefer ICD routing; keyword only when no ICD match",
            });
          }
        }
      }

      if (isObgynFamily(a) && isObgynFamily(b) && a.id !== b.id) {
        rows.push({
          familyA: a.id,
          familyB: b.id,
          conflictType: "OBGYN_CONFLICT",
          risk: "moderate",
          detail: "Multiple OB/GYN families — verify sex guardrails",
          recommendedResolution: "Apply female sex guardrail and pregnancy context where applicable",
        });
      }

      if (isBehavioralFamily(a) && isBehavioralFamily(b) && a.id !== b.id) {
        rows.push({
          familyA: a.id,
          familyB: b.id,
          conflictType: "BEHAVIORAL_HEALTH_CONFLICT",
          risk: "high",
          detail: "Multiple behavioral health families",
          recommendedResolution: "Use ICD exact overrides; require crisis return precautions",
        });
      }
    }
  }

  const curatedExamples: ConditionFamilyCoverageConflictRow[] = [
    {
      familyA: "uri_cough",
      familyB: "pediatric_uri",
      conflictType: "PEDIATRIC_ADULT_CONFLICT",
      risk: "high",
      detail: "J00 routes to uri_cough; pediatric keyword requires age context",
      recommendedResolution: "ICD exact J00 → uri_cough; pediatric_uri keyword-only with age <18",
    },
    {
      familyA: "type_2_diabetes_non_acute",
      familyB: "hyperglycemia_tier2",
      conflictType: "ICD_PREFIX_OVERLAP",
      risk: "high",
      detail: "E11.9 vs E11.65 — stable diabetes vs acute hyperglycemia",
      recommendedResolution: "excludeIcdExact E11.65 from type_2 family; E11.65 exact on hyperglycemia",
    },
    {
      familyA: "syncope",
      familyB: "generalized_weakness",
      conflictType: "ICD_PREFIX_OVERLAP",
      risk: "moderate",
      detail: "R55 syncope vs R53 weakness",
      recommendedResolution: "excludeIcdExact R55 from weakness family; R55 exact on syncope",
    },
    {
      familyA: "dizziness_vertigo",
      familyB: "neurology_stroke_tia",
      conflictType: "ICD_PREFIX_OVERLAP",
      risk: "high",
      detail: "R42 vertigo vs I63/G45 stroke/TIA",
      recommendedResolution: "exclude stroke prefixes from vertigo; route G45/I63 to stroke/TIA family",
    },
  ];

  const merged = [...curatedExamples];
  for (const row of rows) {
    const dup = merged.some(
      (r) =>
        r.familyA === row.familyA &&
        r.familyB === row.familyB &&
        r.conflictType === row.conflictType &&
        r.detail === row.detail
    );
    if (!dup) merged.push(row);
  }

  return {
    rows: merged,
    icdExactConflictCount: merged.filter((r) => r.conflictType === "ICD_EXACT_CONFLICT").length,
    prefixOverlapCount: merged.filter((r) => r.conflictType === "ICD_PREFIX_OVERLAP").length,
    keywordConflictCount: merged.filter((r) => r.conflictType === "KEYWORD_CONFLICT").length,
    highRiskCount: merged.filter((r) => r.risk === "high").length,
  };
}
