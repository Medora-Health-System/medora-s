/**
 * Composite discharge guidance for bite + infection multi-diagnosis selections.
 * Preserves primary template priority, adds infection return precautions without rabies on human bites,
 * and dedupes identical sentences.
 */
import {
  mergeDedupedFollowUpRows,
  mergeUniquePrecautionText,
} from "./providerDischargeSharedPlanningMerge";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";

export type BiteWoundDiagnosisSelection = { code: string; displayName: string; isPrimary?: boolean };
export type BiteWoundGuidanceProvenance = { templateId: string; code: string };

const BITE_TEMPLATE_IDS = new Set([
  "animal_bite_v1",
  "animal_bite_rabies_followup_v1",
  "human_bite_v1",
  "fight_bite_v1",
  "high_risk_hand_wound_v1",
  "contaminated_wound_v1",
  "water_exposed_wound_v1",
  "delayed_wound_v1",
  "deep_contaminated_wound_v1",
  "infected_traumatic_wound_v1",
  "bite_cellulitis_v1",
  "post_bite_abscess_drainage_v1",
  "tetanus_followup_v1",
]);

const INFECTION_TEMPLATE_IDS = new Set([
  "bite_cellulitis_v1",
  "cellulitis_v1",
  "infected_traumatic_wound_v1",
  "post_bite_abscess_drainage_v1",
]);

const HUMAN_BITE_TEMPLATE_IDS = new Set(["human_bite_v1", "fight_bite_v1", "high_risk_hand_wound_v1"]);

export function composeBiteWoundDischargeGuidance(
  diagnoses: readonly BiteWoundDiagnosisSelection[],
  options?: { locale?: ProviderDischargeTemplateLocale; existingReturnPrecautions?: string; maxSentences?: number },
): {
  returnPrecautions: string;
  followUps: ReturnType<typeof mergeDedupedFollowUpRows>;
  provenance: BiteWoundGuidanceProvenance[];
  includesRabies: boolean;
} {
  const locale = options?.locale ?? "en";
  const limit = options?.maxSentences ?? 14;
  const primary = diagnoses.find((item) => item.isPrimary) ?? diagnoses[0];
  if (!primary) {
    return {
      returnPrecautions: options?.existingReturnPrecautions ?? "",
      followUps: [],
      provenance: [],
      includesRabies: false,
    };
  }
  const ordered = [primary, ...diagnoses.filter((item) => item !== primary)];
  let returnPrecautions = options?.existingReturnPrecautions?.trim() ?? "";
  let followUps: ReturnType<typeof mergeDedupedFollowUpRows> = [];
  const provenance: BiteWoundGuidanceProvenance[] = [];
  let includesRabies = false;
  const primaryResolved = resolveProviderDischargeTemplateForDiagnosis(primary);
  const primaryIsHuman = HUMAN_BITE_TEMPLATE_IDS.has(primaryResolved.template.id);

  for (const diagnosis of ordered) {
    const resolved = resolveProviderDischargeTemplateForDiagnosis(diagnosis);
    const id = resolved.template.id;
    const isBite = BITE_TEMPLATE_IDS.has(id);
    const isInfection = INFECTION_TEMPLATE_IDS.has(id);
    if (diagnosis !== primary && !isBite && !isInfection) continue;
    if (primaryIsHuman && (id === "animal_bite_v1" || id === "animal_bite_rabies_followup_v1")) continue;
    const text = getProviderDischargeSuggestedTextBody(resolved.template, locale);
    if (!options?.existingReturnPrecautions?.trim()) {
      const merged = mergeUniquePrecautionText(returnPrecautions, [text.returnPrecautions]);
      returnPrecautions = merged.split(/\n+/).slice(0, limit).join("\n");
    }
    followUps = mergeDedupedFollowUpRows(followUps, resolved.template.defaultFollowUps ?? []);
    provenance.push({ templateId: id, code: diagnosis.code });
    if (/rabies|rage/i.test(`${text.returnPrecautions} ${text.diagnosisInstructions}`)) {
      includesRabies = true;
    }
  }
  if (primaryIsHuman) {
    includesRabies = false;
    returnPrecautions = returnPrecautions
      .split(/\n+/)
      .filter((line) => !/rabies|rage|animal control|contrôle animalier/i.test(line))
      .join("\n");
  }
  return { returnPrecautions, followUps, provenance, includesRabies };
}
