/**
 * Phase 11 — composite discharge guidance for co-occurring eye emergency diagnoses.
 * Merges return precautions and follow-ups from multiple resolved templates without
 * duplicating identical sentences, and orders sight-threatening/dominant templates first.
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type EyeEmergencyDiagnosisSelection = { code?: string; displayName: string; isPrimary?: boolean };
export type EyeEmergencyGuidanceProvenance = { templateId: string; code?: string };

/**
 * Sight-threatening / most specific eye emergency templates that should surface first when
 * co-selected with a lower-acuity ocular complaint (e.g. open globe over a corneal foreign
 * body, acute glaucoma over a routine abrasion, orbital cellulitis over an eyelid laceration).
 */
const DOMINANT_TEMPLATE_IDS = new Set([
  "open_globe_post_acute_v1",
  "acute_glaucoma_followup_v1",
  "retinal_detachment_followup_v1",
  "orbital_cellulitis_followup_v1",
  "corneal_ulcer_followup_v1",
]);

export function composeEyeEmergencyDischargeGuidance(
  diagnoses: readonly EyeEmergencyDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number }
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: EyeEmergencyGuidanceProvenance[];
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
      Number(Boolean(b.diagnosis.isPrimary)) - Number(Boolean(a.diagnosis.isPrimary))
  );

  let returnPrecautions = "";
  let followUps: ReturnType<typeof mergeDedupedFollowUpRows> = [];
  const provenance: EyeEmergencyGuidanceProvenance[] = [];
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
