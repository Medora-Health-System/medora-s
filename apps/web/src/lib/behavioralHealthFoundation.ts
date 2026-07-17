/**
 * Phase 18 (Commit 1) — behavioral / psychiatric documentation foundation. Mirrors
 * `reproductiveGuFoundation.ts` (Phase 17): detects behavioral-health vocabulary in free text
 * so a chart note can echo terminology back. Never invents findings, capacity, risk level,
 * or disposition.
 */

export type BehavioralHealthFindings = {
  presentingConcernReported: boolean;
  patientOwnWordsReported: boolean;
  collateralSourceReported: boolean;
  historyReliabilityReported: boolean;
  psychiatricHistoryReported: boolean;
  priorSuicideAttemptReported: boolean;
  priorSelfHarmReported: boolean;
  violenceHistoryReported: boolean;
  substanceUseReported: boolean;
  sleepDisturbanceReported: boolean;
  housingOrSupportsReported: boolean;
  lethalMeansAccessReported: boolean;
  legalStatusReported: boolean;
  developmentalBaselineReported: boolean;
  pregnancyOrPostpartumReported: boolean;
  safeguardingConcernReported: boolean;
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Documentation advisory only. Detects behavioral-health vocabulary already present in free
 * text. Never invents findings when not documented.
 */
export function parseBehavioralHealthFromText(text = ""): BehavioralHealthFindings {
  const normalized = normalize(text);

  return {
    presentingConcernReported:
      /\b(presenting concern|chief complaint|reason for (visit|presentation)|behavioral complaint|psychiatric complaint)\b/.test(
        normalized
      ),
    patientOwnWordsReported:
      /\b(patient states|patient reports|in (their|his|her) own words|quotes patient|verbatim)\b/.test(normalized),
    collateralSourceReported:
      /\b(collateral|family (report|historian)|caregiver (report|historian)|ems report|police report|friend report)\b/.test(
        normalized
      ) && !/\b(no collateral|collateral unavailable|unable to obtain collateral)\b/.test(normalized),
    historyReliabilityReported:
      /\b(reliable historian|unreliable historian|limited historian|history limited by|poor historian)\b/.test(
        normalized
      ),
    psychiatricHistoryReported:
      /\b(psychiatric history|prior (psychiatric|mental health)|bipolar|schizophrenia|depression history|anxiety disorder|ptsd|prior hospitalization for mental health)\b/.test(
        normalized
      ) && !/\b(no psychiatric history|psychiatric history unknown|denies psychiatric history)\b/.test(normalized),
    priorSuicideAttemptReported:
      /\b(prior suicide attempt|previous suicide attempt|past suicide attempt|history of suicide attempt)\b/.test(
        normalized
      ) && !/\b(denies prior suicide attempt|no prior suicide attempt)\b/.test(normalized),
    priorSelfHarmReported:
      /\b(prior self.?harm|history of self.?harm|non.?suicidal self.?injury|nssi|cutting history)\b/.test(
        normalized
      ) && !/\b(denies self.?harm|no prior self.?harm)\b/.test(normalized),
    violenceHistoryReported:
      /\b(violence history|prior assault|prior aggression|domestic violence history|history of violence)\b/.test(
        normalized
      ) && !/\b(denies violence history|no violence history)\b/.test(normalized),
    substanceUseReported:
      /\b(substance use|alcohol use|drug use|intoxication|withdrawal|polysubstance|recent (drug|alcohol) use)\b/.test(
        normalized
      ),
    sleepDisturbanceReported:
      /\b(insomnia|sleep disturbance|decreased sleep|unable to sleep|hypersomnia|sleep deprivation)\b/.test(normalized),
    housingOrSupportsReported:
      /\b(housing|homeless|shelter|support system|lives alone|lives with|caregiver support|social supports)\b/.test(
        normalized
      ),
    lethalMeansAccessReported:
      /\b(access to (weapons|firearms|guns|means)|lethal means|weapons at home|firearm access|means restriction)\b/.test(
        normalized
      ) && !/\b(denies access to weapons|no access to means|means removed)\b/.test(normalized),
    legalStatusReported:
      // 5150 (California) and 302 (Pennsylvania) are US jurisdiction-specific hold labels used only
      // as recognition tokens when already documented in chart text. Involuntary hold criteria,
      // duration, and legal process are facility-configurable — not universal law.
      /\b(involuntary hold|5150|302|certification|court order|legal status|psychiatric hold|emergency petition)\b/.test(
        normalized
      ),
    developmentalBaselineReported:
      /\b(developmental (delay|disability|baseline)|autism|asd|adhd|intellectual disability|baseline function)\b/.test(
        normalized
      ),
    pregnancyOrPostpartumReported:
      /\b(pregnan(t|cy)|postpartum|post.?partum|peripartum|postnatal|recent delivery|breastfeeding)\b/.test(normalized),
    safeguardingConcernReported:
      /\b(safeguarding|abuse concern|neglect concern|child protection|mandated report|unsafe home|exploitation concern)\b/.test(
        normalized
      ),
  };
}
