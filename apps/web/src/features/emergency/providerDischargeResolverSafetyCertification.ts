/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Resolver safety certification helpers — audit gate before production switch.
 */

import { loadIcd10DevSampleCatalog } from "./edDischargeCoverageAuditLevel2";
import {
  CLINICAL_CONDITION_FAMILY_DEFINITIONS,
  getRoutableClinicalConditionFamilies,
} from "./providerDischargeConditionFamilies";
import {
  conditionFamilyKeywordWouldOverrideIcdMatch,
  resolveClinicalConditionFamily,
} from "./providerDischargeConditionFamilyResolver";
import { GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID } from "./providerDischargeTemplateRegistry";

export type SafetyCertificationCheck = {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
};

export type ResolverSafetyCertificationReport = {
  checks: SafetyCertificationCheck[];
  allPassed: boolean;
  failedCount: number;
};

const ADULT_AGE = 40;
const PEDIATRIC_AGE = 8;

export function runResolverSafetyCertification(): ResolverSafetyCertificationReport {
  const checks: SafetyCertificationCheck[] = [];

  // 1. No adult diagnosis routes to pediatric template without age <18
  {
    const adultJ00 = resolveClinicalConditionFamily({
      code: "J00",
      displayName: "URI",
      context: { patientAgeYears: ADULT_AGE },
    });
    checks.push({
      id: "adult_no_pediatric_template",
      description: "Adult diagnosis must not route to pediatric template without age context",
      passed: !adultJ00.templateId.includes("pediatric"),
      detail: `J00 age=${ADULT_AGE} → ${adultJ00.templateId}`,
    });
  }

  // 2. OB/GYN requires female guardrail when sex known
  {
    const maleObgyn = resolveClinicalConditionFamily({
      code: "N93.9",
      displayName: "Bleeding",
      context: { patientSex: "male" },
    });
    checks.push({
      id: "obgyn_sex_guardrail",
      description: "OB/GYN diagnosis blocked for male sex when documented",
      passed: maleObgyn.familyId !== "obgyn_bleeding_pelvic_pain",
      detail: `N93.9 male → family=${maleObgyn.familyId ?? "none"}`,
    });
  }

  // 3. No high-risk routes to low-risk (PE → UNSAFE blocked)
  {
    const pe = resolveClinicalConditionFamily({ code: "I26.99", displayName: "PE" });
    checks.push({
      id: "high_risk_not_low_risk",
      description: "High-risk PE must not route via UNSAFE family",
      passed: pe.familyId !== "pe_evaluation_discharge",
      detail: `I26.99 → ${pe.templateId} family=${pe.familyId ?? "none"}`,
    });
  }

  // 4. UNSAFE families not routable
  {
    const unsafeFamilies = CLINICAL_CONDITION_FAMILY_DEFINITIONS.filter(
      (f) => f.routingStatus === "UNSAFE_DO_NOT_MAP"
    );
    const routableIds = new Set(getRoutableClinicalConditionFamilies().map((f) => f.id));
    const leaked = unsafeFamilies.filter((f) => routableIds.has(f.id));
    checks.push({
      id: "unsafe_not_routable",
      description: "UNSAFE_DO_NOT_MAP families excluded from routable set",
      passed: leaked.length === 0,
      detail: leaked.length ? `Leaked: ${leaked.map((f) => f.id).join(", ")}` : "All UNSAFE excluded",
    });
  }

  // 5. Keyword never overrides ICD exact
  {
    checks.push({
      id: "keyword_no_icd_override",
      description: "Keyword match never overrides ICD exact/family",
      passed: !conditionFamilyKeywordWouldOverrideIcdMatch({
        code: "J00",
        displayName: "pediatric uri child cold",
      }),
      detail: "J00 + pediatric keyword → uri_cough icdExact wins",
    });
  }

  // 6. Exact beats prefix (E11.9 → type 2, not hyperglycemia prefix)
  {
    const e119 = resolveClinicalConditionFamily({ code: "E11.9", displayName: "Type 2 diabetes" });
    checks.push({
      id: "exact_beats_prefix",
      description: "ICD exact match beats prefix",
      passed: e119.familyId === "type_2_diabetes_non_acute" && e119.matchLevel === "icdExact",
      detail: `E11.9 → ${e119.familyId} (${e119.matchLevel})`,
    });
  }

  // 7. Longer prefix beats shorter (J44 vs J4)
  {
    const copd = resolveClinicalConditionFamily({ code: "J44.1", displayName: "COPD" });
    checks.push({
      id: "longer_prefix_wins",
      description: "Longer ICD prefix wins",
      passed: copd.familyId === "copd_exacerbation",
      detail: `J44.1 → ${copd.familyId}`,
    });
  }

  // 8. Exclusions beat inclusion (L02 abscess not cellulitis L03)
  {
    const abscess = resolveClinicalConditionFamily({ code: "L02.91", displayName: "Abscess" });
    checks.push({
      id: "exclusions_beat_inclusion",
      description: "Excluded prefixes prevent wrong family",
      passed: abscess.familyId === "cutaneous_abscess",
      detail: `L02.91 → ${abscess.familyId}`,
    });
  }

  // 9. Generic fallback available
  {
    const unknown = resolveClinicalConditionFamily({ code: "Z99.99", displayName: "Unknown" });
    checks.push({
      id: "generic_fallback",
      description: "Unknown ICD falls back to generic template",
      passed: unknown.templateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
      detail: `Z99.99 → ${unknown.templateId}`,
    });
  }

  // 10. Unknown ICD does not crash
  {
    let crashed = false;
    try {
      resolveClinicalConditionFamily({ code: "INVALID!!!", displayName: "" });
    } catch {
      crashed = true;
    }
    checks.push({
      id: "unknown_icd_no_crash",
      description: "Malformed/unknown ICD does not throw",
      passed: !crashed,
      detail: crashed ? "Threw exception" : "Resolved safely",
    });
  }

  // 11. E11.65 hyperglycemia not type 2
  {
    const hyper = resolveClinicalConditionFamily({ code: "E11.65", displayName: "Hyperglycemia" });
    checks.push({
      id: "e1165_hyperglycemia",
      description: "E11.65 routes to hyperglycemia not stable type 2",
      passed: hyper.templateId === "hyperglycemia_v1",
      detail: `E11.65 → ${hyper.templateId}`,
    });
  }

  // 12. R53.1 not stroke/TIA
  {
    const weak = resolveClinicalConditionFamily({ code: "R53.1", displayName: "Weakness" });
    checks.push({
      id: "r531_not_stroke",
      description: "R53.1 weakness not stroke/TIA family",
      passed: weak.familyId !== "neurology_stroke_tia",
      detail: `R53.1 → ${weak.familyId}`,
    });
  }

  // 13. Dev catalog keyword override scan
  {
    const catalog = loadIcd10DevSampleCatalog();
    const overrides = catalog.filter((row) =>
      conditionFamilyKeywordWouldOverrideIcdMatch({ code: row.code, displayName: row.label })
    );
    checks.push({
      id: "dev_catalog_keyword_override_scan",
      description: "Dev ICD catalog has no keyword-over-ICD conflicts",
      passed: overrides.length === 0,
      detail: overrides.length ? `${overrides.length} conflicts: ${overrides[0]!.code}` : "Clean",
    });
  }

  const failedCount = checks.filter((c) => !c.passed).length;
  return {
    checks,
    allPassed: failedCount === 0,
    failedCount,
  };
}
