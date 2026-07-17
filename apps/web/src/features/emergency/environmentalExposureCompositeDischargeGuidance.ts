/**
 * Phase 15 — composite discharge guidance for co-occurring environmental diagnoses.
 * Higher-acuity post-acute templates (heat stroke, severe hypothermia, drowning,
 * HACE/HAPE, DCI, high-voltage/lightning, radiation injury) surface first.
 * Mirrors `dermatologyCompositeDischargeGuidance.ts` (Phase 14).
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type EnvironmentalExposureDiagnosisSelection = {
  code?: string;
  displayName: string;
  isPrimary?: boolean;
};
export type EnvironmentalExposureGuidanceProvenance = { templateId: string; code?: string };

const DOMINANT_TEMPLATE_IDS = new Set([
  "heat_stroke_post_acute_v1",
  "hypothermia_post_acute_v1",
  "deep_frostbite_post_acute_v1",
  "nonfatal_drowning_post_acute_v1",
  "high_voltage_electrical_injury_post_acute_v1",
  "lightning_injury_post_acute_v1",
  "hace_post_acute_v1",
  "hape_post_acute_v1",
  "decompression_illness_post_acute_v1",
  "radiation_injury_post_acute_v1",
]);

export function composeEnvironmentalExposureDischargeGuidance(
  diagnoses: readonly EnvironmentalExposureDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number },
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: EnvironmentalExposureGuidanceProvenance[];
} {
  const locale = options?.locale ?? "en";
  const limit = options?.maxSentences ?? 16;

  const resolved = diagnoses.map((diagnosis) => ({
    diagnosis,
    resolved: resolveProviderDischargeTemplateForDiagnosis(diagnosis),
  }));

  const ordered = [...resolved].sort(
    (a, b) =>
      Number(DOMINANT_TEMPLATE_IDS.has(b.resolved.template.id)) -
        Number(DOMINANT_TEMPLATE_IDS.has(a.resolved.template.id)) ||
      Number(Boolean(b.diagnosis.isPrimary)) - Number(Boolean(a.diagnosis.isPrimary)),
  );

  let returnPrecautions = "";
  let followUps: ReturnType<typeof mergeDedupedFollowUpRows> = [];
  const provenance: EnvironmentalExposureGuidanceProvenance[] = [];
  const seenTemplateIds = new Set<string>();

  for (const { diagnosis, resolved: result } of ordered) {
    const templateId = result.template.id;
    if (!seenTemplateIds.has(templateId)) {
      seenTemplateIds.add(templateId);
      const text = getProviderDischargeSuggestedTextBody(result.template, locale);
      returnPrecautions = mergeUniquePrecautionText(returnPrecautions, [text.returnPrecautions])
        .split(/\n+/)
        .slice(0, limit)
        .join("\n");
      followUps = mergeDedupedFollowUpRows(followUps, result.template.defaultFollowUps ?? []);
    }
    provenance.push({ templateId, code: diagnosis.code });
  }

  return { returnPrecautions, followUps, provenance };
}
