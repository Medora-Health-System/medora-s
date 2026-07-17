/**
 * Phase 17 — composite discharge guidance for co-occurring OB/GYN / urology diagnoses.
 * Higher-acuity post-acute templates surface first. Mirrors toxicology composite guidance.
 */
import { mergeDedupedFollowUpRows, mergeUniquePrecautionText } from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type ObGynUrologyDiagnosisSelection = {
  code?: string;
  displayName: string;
  isPrimary?: boolean;
};
export type ObGynUrologyGuidanceProvenance = { templateId: string; code?: string };

const DOMINANT_TEMPLATE_IDS = new Set([
  "ectopic_pregnancy_post_acute_v1",
  "ovarian_torsion_post_acute_v1",
  "testicular_torsion_post_acute_v1",
  "hypertensive_pregnancy_post_acute_v1",
  "postpartum_bleeding_post_acute_v1",
  "infected_obstructed_stone_post_acute_v1",
  "obstructing_ureteral_stone_post_acute_v1",
  "priapism_post_acute_v1",
  "penile_fracture_post_acute_v1",
  "pregnancy_unknown_location_v1",
  "tubo_ovarian_abscess_post_acute_v1",
]);

export function composeObGynUrologyDischargeGuidance(
  diagnoses: readonly ObGynUrologyDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; maxSentences?: number },
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: ObGynUrologyGuidanceProvenance[];
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
  const provenance: ObGynUrologyGuidanceProvenance[] = [];
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
