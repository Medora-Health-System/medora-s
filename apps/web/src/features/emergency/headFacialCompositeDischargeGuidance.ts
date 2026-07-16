/**
 * Phase 10 — composite discharge guidance for co-occurring head/facial trauma diagnoses.
 * Merges return precautions and follow-ups from multiple resolved templates without
 * duplicating identical sentences, and orders higher-risk/ocular-dominant templates first.
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type HeadFacialDiagnosisSelection = { code?: string; displayName: string; isPrimary?: boolean };
export type HeadFacialGuidanceProvenance = { templateId: string; code?: string };

/**
 * Highest-risk / most specific head-facial templates that should surface first when
 * co-selected with a lower-acuity diagnosis (e.g. intracranial hemorrhage over skull
 * fracture, orbital/ocular precautions over a general facial complaint).
 */
const DOMINANT_TEMPLATE_IDS = new Set(["intracranial_hemorrhage_followup_v1", "orbital_fracture_v1"]);

export function composeHeadFacialDischargeGuidance(
  diagnoses: readonly HeadFacialDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number }
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: HeadFacialGuidanceProvenance[];
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
  const provenance: HeadFacialGuidanceProvenance[] = [];
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
