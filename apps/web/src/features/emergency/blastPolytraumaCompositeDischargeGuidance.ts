import {
  mergeDedupedFollowUpRows,
  mergeUniquePrecautionText,
} from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type BlastPolytraumaDiagnosisSelection = { code: string; displayName: string; isPrimary?: boolean };
export type BlastPolytraumaGuidanceProvenance = { templateId: string; code: string };

/**
 * Produces shared blast/polytrauma precautions without altering diagnosis cards.
 * A primary template remains authoritative; provider-entered shared text is never replaced.
 */
export function composeBlastPolytraumaDischargeGuidance(
  diagnoses: readonly BlastPolytraumaDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; existingReturnPrecautions?: string; maxSentences?: number },
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: BlastPolytraumaGuidanceProvenance[];
} {
  const locale = options?.locale ?? "en";
  const limit = options?.maxSentences ?? 12;
  const primary = diagnoses.find((item) => item.isPrimary) ?? diagnoses[0];
  if (!primary) return { returnPrecautions: options?.existingReturnPrecautions ?? "", followUps: [], provenance: [] };
  const ordered = [primary, ...diagnoses.filter((item) => item !== primary)];
  let returnPrecautions = options?.existingReturnPrecautions?.trim() ?? "";
  let followUps: ReturnType<typeof mergeDedupedFollowUpRows> = [];
  const provenance: BlastPolytraumaGuidanceProvenance[] = [];
  for (const diagnosis of ordered) {
    const resolved = resolveProviderDischargeTemplateForDiagnosis(diagnosis);
    const isBlastContributor = /^(blast_|polytrauma_)/.test(resolved.template.id);
    if (diagnosis !== primary && !isBlastContributor) continue;
    const text = getProviderDischargeSuggestedTextBody(resolved.template, locale);
    if (!options?.existingReturnPrecautions?.trim() && (diagnosis === primary || isBlastContributor)) {
      const merged = mergeUniquePrecautionText(returnPrecautions, [text.returnPrecautions]);
      returnPrecautions = merged.split(/\n+/).slice(0, limit).join("\n");
    }
    if (isBlastContributor) {
      followUps = mergeDedupedFollowUpRows(followUps, resolved.template.defaultFollowUps ?? []);
      provenance.push({ templateId: resolved.template.id, code: diagnosis.code });
    }
  }
  return { returnPrecautions, followUps, provenance };
}
