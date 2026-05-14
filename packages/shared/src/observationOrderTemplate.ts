/**
 * Phase 13E — Default Medora observation / short-stay CARE order template (manual lines only).
 * No medications, no catalog LAB/IMAGING in v1 (avoids facility catalog variance and med safety bypass).
 */

import { z } from "zod";
import type { OrderCreateDto, OrderItemCreateDto } from "./schemas/patient.js";

export const OBSERVATION_ORDER_TEMPLATE_ID = "medora_observation_order_set_v1" as const;

export const OBSERVATION_ORDER_TEMPLATE_GROUP_IDS = [
  "monitoring",
  "nursing_reassessment",
  "comfort",
  "diagnostics_hint",
  "disposition",
] as const;

export type ObservationOrderTemplateGroupId = (typeof OBSERVATION_ORDER_TEMPLATE_GROUP_IDS)[number];

export type ObservationOrderTemplateItemDef = {
  id: string;
  group: ObservationOrderTemplateGroupId;
  /** Pre-checked when the modal opens (provider may uncheck). */
  defaultSelected: boolean;
  /** Persisted as CARE `manualLabel` (French product copy). */
  manualLabelFr: string;
};

/** Stable ids for audit metadata and API validation. */
export const OBSERVATION_ORDER_TEMPLATE_ITEMS: readonly ObservationOrderTemplateItemDef[] = [
  {
    id: "mon_vitals_q2h",
    group: "monitoring",
    defaultSelected: true,
    manualLabelFr: "Signes vitaux toutes les 2 heures (surveillance observation)",
  },
  {
    id: "mon_vitals_q4h",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Signes vitaux toutes les 4 heures",
  },
  {
    id: "mon_pulse_ox_continuous",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Surveillance continue par oxymétrie de pouls",
  },
  {
    id: "mon_cardiac_monitoring",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Surveillance monitorée (rythme / signes vitaux dédiés)",
  },
  {
    id: "nurse_reassess_q2h",
    group: "nursing_reassessment",
    defaultSelected: true,
    manualLabelFr: "Réévaluation infirmière toutes les 2 heures (parcours observation)",
  },
  {
    id: "nurse_pain_q2h",
    group: "nursing_reassessment",
    defaultSelected: true,
    manualLabelFr: "Évaluation de la douleur toutes les 2 heures",
  },
  {
    id: "nurse_notify_bp",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si tension artérielle > 160/95 mmHg",
  },
  {
    id: "nurse_notify_hr",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si fréquence cardiaque > 120/min ou < 50/min",
  },
  {
    id: "nurse_notify_spo2",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si SpO₂ < 92 % en air ambiant",
  },
  {
    id: "nurse_notify_fever",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si fièvre ≥ 38,3 °C (équivalent 101 °F oral)",
  },
  {
    id: "com_diet_ad_lib",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Régime alimentaire selon tolérance",
  },
  {
    id: "com_oral_fluids",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Encourager les liquides oraux sauf contre-indication",
  },
  {
    id: "com_fall_precautions",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Précautions anti-chute selon indication",
  },
  {
    id: "dx_catalog_reminder",
    group: "diagnostics_hint",
    defaultSelected: false,
    manualLabelFr:
      "Biologie ou imagerie de contrôle : utiliser l’onglet Ordres pour commandes au catalogue si cliniquement indiqué",
  },
  {
    id: "disp_reassess_discharge",
    group: "disposition",
    defaultSelected: true,
    manualLabelFr: "Réévaluer quotidiennement les critères de sortie (observation / court séjour)",
  },
  {
    id: "disp_prepare_transfer",
    group: "disposition",
    defaultSelected: false,
    manualLabelFr: "Préparer un transfert en cas d'aggravation clinique",
  },
] as const;

const ITEM_ID_SET = new Set(OBSERVATION_ORDER_TEMPLATE_ITEMS.map((i) => i.id));

export const observationOrderTemplateApplyDtoSchema = z.object({
  selectedItemIds: z.array(z.string().min(1).max(80)).min(1).max(40),
});

export type ObservationOrderTemplateApplyDto = z.infer<typeof observationOrderTemplateApplyDtoSchema>;

export function isKnownObservationTemplateItemId(id: string): boolean {
  return ITEM_ID_SET.has(id);
}

export function filterToKnownObservationTemplateIds(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => ITEM_ID_SET.has(id));
}

/** Ids in the request that are not part of the built-in template (stable ids only). */
export function findUnknownObservationTemplateIds(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => !ITEM_ID_SET.has(id));
}

/** Stable template order for persistence and audit (ignores unknown ids). */
export function orderObservationTemplateSelection(ids: string[]): string[] {
  const knownSet = new Set(filterToKnownObservationTemplateIds(ids));
  return OBSERVATION_ORDER_TEMPLATE_ITEMS.map((d) => d.id).filter((id) => knownSet.has(id));
}

export function buildObservationTemplateCareOrderDto(input: {
  selectedItemIds: string[];
  prescriberName: string;
  prescriberLicense?: string | null;
  prescriberContact?: string | null;
}): OrderCreateDto {
  const unique = orderObservationTemplateSelection(input.selectedItemIds);
  if (unique.length === 0) {
    throw new Error("observation_template_no_valid_items");
  }
  const items: OrderItemCreateDto[] = unique.map((id) => {
    const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === id)!;
    return {
      catalogItemId: null,
      catalogItemType: "CARE",
      manualLabel: def.manualLabelFr,
    };
  });
  return {
    type: "CARE",
    orderSource: "PROVIDER_ORDER",
    priority: "ROUTINE",
    prescriberName: input.prescriberName.trim(),
    prescriberLicense: input.prescriberLicense?.trim() || undefined,
    prescriberContact: input.prescriberContact?.trim() || undefined,
    protocolName: OBSERVATION_ORDER_TEMPLATE_ID,
    items,
  };
}
