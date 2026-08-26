/**
 * MEDUI.CP.1F.2 — Correction prefill + History clinical text helpers.
 */

import { describe, expect, it } from "vitest";
import {
  isCanonicalCarePlanTemplateI18nKey,
  resolveCarePlanClinicalNarrativeForClinician,
} from "@medora/shared";
import {
  carePlanCorrectionPrefillText,
  carePlanHistoryClinicalDetail,
} from "./CarePlanClinicianWorkflowCp1c";

const GOAL_KEY =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goalBody";
const OUTCOME_KEY =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.outcomeBody";
const INTERVENTION_KEY =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.interventionBody";
const MONITORING_KEY =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.monitoringBody";
const EDUCATION_KEY =
  "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.educationBody";

function resolveEn(value: string): string {
  if (isCanonicalCarePlanTemplateI18nKey(value)) {
    return resolveCarePlanClinicalNarrativeForClinician(value, "en");
  }
  return value;
}

describe("MEDUI.CP.1F.2 Care Plan correction + History clinical text", () => {
  it("correction prefill resolves recognized template key", () => {
    const prefill = carePlanCorrectionPrefillText(GOAL_KEY, "ignored-title", resolveEn);
    expect(prefill).toContain("safe mobility");
    expect(prefill).not.toContain("enterpriseInterdisciplinaryCarePlans");
    expect(isCanonicalCarePlanTemplateI18nKey(prefill)).toBe(false);
  });

  it("correction prefill preserves ordinary narrative", () => {
    const narrative = "Patient will ambulate with walker BID.";
    expect(carePlanCorrectionPrefillText(narrative, GOAL_KEY, resolveEn)).toBe(narrative);
  });

  it("History resolves goal/outcome/intervention/monitoring/education", () => {
    const cases = [
      GOAL_KEY,
      OUTCOME_KEY,
      INTERVENTION_KEY,
      MONITORING_KEY,
      EDUCATION_KEY,
    ];
    for (const key of cases) {
      const detail = carePlanHistoryClinicalDetail(key, null, resolveEn);
      expect(detail).toBeTruthy();
      expect(detail!).not.toContain("enterpriseInterdisciplinaryCarePlans");
      expect(detail!).not.toContain(".goalBody");
      expect(isCanonicalCarePlanTemplateI18nKey(detail!)).toBe(false);
    }
  });

  it("History preserves unknown historical narrative", () => {
    const unknown = "Custom bedside mobility goal for this admission.";
    expect(carePlanHistoryClinicalDetail(unknown, null, resolveEn)).toBe(unknown);
  });

  it("History does not treat amended key-plus-suffix as exact canonical key", () => {
    const amended = `${GOAL_KEY} (corrected CP.1F)`;
    const detail = carePlanHistoryClinicalDetail(amended, null, resolveEn);
    expect(detail).toBe(amended);
  });
});
