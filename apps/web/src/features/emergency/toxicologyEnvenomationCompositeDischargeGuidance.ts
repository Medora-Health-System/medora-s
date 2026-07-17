/**
 * Phase 16 — composite discharge guidance for co-occurring toxicology diagnoses.
 * Higher-acuity post-acute templates surface first. Mirrors environmental composite guidance.
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type ToxicologyEnvenomationDiagnosisSelection = {
  code?: string;
  displayName: string;
  isPrimary?: boolean;
};
export type ToxicologyEnvenomationGuidanceProvenance = { templateId: string; code?: string };

const DOMINANT_TEMPLATE_IDS = new Set([
  "carbon_monoxide_post_acute_v1",
  "caustic_ingestion_post_acute_v1",
  "pesticide_exposure_post_acute_v1",
  "methemoglobinemia_post_acute_v1",
  "snake_envenomation_post_acute_v1",
  "alcohol_withdrawal_post_acute_v1",
  "unknown_ingestion_post_observation_v1",
  "opioid_overdose_post_observation_v1",
]);

export function composeToxicologyEnvenomationDischargeGuidance(
  diagnoses: readonly ToxicologyEnvenomationDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number },
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: ToxicologyEnvenomationGuidanceProvenance[];
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
  const provenance: ToxicologyEnvenomationGuidanceProvenance[] = [];
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
