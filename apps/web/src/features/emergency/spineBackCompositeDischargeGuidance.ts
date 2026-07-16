import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import { resolveProviderDischargeTemplateForDiagnosis, type ProviderDischargeTemplateLocale } from "./providerDischargeTemplateRegistry";

export type SpineBackDiagnosisSelection = { code: string; displayName: string; isPrimary?: boolean };
const HIGH_RISK = new Set(["post_caudal_red_flag_evaluation_v1", "post_spinal_trauma_evaluation_v1", "vertebral_compression_fracture_v1", "stable_vertebral_fracture_followup_v1"]);

/** High-risk spine families dominate generic back-pain text; this only merges guidance. */
export function composeSpineBackDischargeGuidance(diagnoses: readonly SpineBackDiagnosisSelection[], options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number }) {
  const locale = options?.locale ?? "en"; const limit = options?.maxSentences ?? 14;
  const resolved = diagnoses.map((diagnosis) => ({ diagnosis, resolved: resolveProviderDischargeTemplateForDiagnosis(diagnosis) }));
  const ordered = [...resolved].sort((a, b) => Number(HIGH_RISK.has(b.resolved.template.id)) - Number(HIGH_RISK.has(a.resolved.template.id)) || Number(Boolean(b.diagnosis.isPrimary)) - Number(Boolean(a.diagnosis.isPrimary)));
  let returnPrecautions = ""; let followUps: ReturnType<typeof mergeDedupedFollowUpRows> = [];
  for (const { resolved: result } of ordered) {
    const text = getProviderDischargeSuggestedTextBody(result.template, locale);
    returnPrecautions = mergeUniquePrecautionText(returnPrecautions, [text.returnPrecautions]).split(/\n+/).slice(0, limit).join("\n");
    followUps = mergeDedupedFollowUpRows(followUps, result.template.defaultFollowUps ?? []);
  }
  return { returnPrecautions, followUps, provenance: ordered.map(({ diagnosis, resolved: result }) => ({ templateId: result.template.id, code: diagnosis.code })) };
}
