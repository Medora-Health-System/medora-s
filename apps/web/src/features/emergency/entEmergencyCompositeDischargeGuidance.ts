/**
 * Phase 12 — composite discharge guidance for co-occurring ENT emergency diagnoses.
 * Merges return precautions and follow-ups from multiple resolved templates without
 * duplicating identical sentences, and orders airway/deep-neck and other dominant
 * high-acuity ENT templates first (e.g. Ludwig's angina over dental pain, malignant
 * otitis externa over routine otitis externa, mastoiditis over otitis media, sudden
 * sensorineural hearing loss over routine cerumen impaction).
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type EntEmergencyDiagnosisSelection = { code?: string; displayName: string; isPrimary?: boolean };
export type EntEmergencyGuidanceProvenance = { templateId: string; code?: string };

/**
 * Airway-threatening / higher-acuity ENT emergency templates that should surface first when
 * co-selected with a lower-acuity complaint (e.g. Ludwig's angina over dental pain, epiglottitis
 * or peritonsillar abscess/deep neck infection over routine pharyngitis, malignant otitis externa
 * over routine otitis externa, mastoiditis over otitis media, sudden sensorineural hearing loss
 * over routine cerumen impaction).
 */
const DOMINANT_TEMPLATE_IDS = new Set([
  "ludwig_angina_post_acute_v1",
  "epiglottitis_post_acute_v1",
  "deep_neck_infection_post_acute_v1",
  "peritonsillar_abscess_post_drainage_v1",
  "malignant_otitis_externa_post_acute_v1",
  "mastoiditis_post_acute_v1",
  "sudden_hearing_loss_followup_v1",
]);

export function composeEntEmergencyDischargeGuidance(
  diagnoses: readonly EntEmergencyDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number }
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: EntEmergencyGuidanceProvenance[];
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
  const provenance: EntEmergencyGuidanceProvenance[] = [];
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
