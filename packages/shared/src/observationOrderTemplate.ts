/**
 * Phase 13E — Default Medora observation / short-stay CARE order template (manual lines only).
 * No medications, no catalog LAB/IMAGING in v1 (avoids facility catalog variance and med safety bypass).
 */

import { z } from "zod";
import type { OrderCreateDto, OrderItemCreateDto } from "./schemas/patient.js";
import {
  parseProductUiLanguage,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  type ProductUiLanguage,
} from "./i18n/productUiLocale.js";

export const OBSERVATION_ORDER_TEMPLATE_ID = "medora_observation_order_set_v1" as const;

/** True when `protocolName` on order authority / events matches the built-in observation CARE template. */
export function isObservationOrderTemplateProtocol(protocolName: string | null | undefined): boolean {
  return (protocolName ?? "").trim() === OBSERVATION_ORDER_TEMPLATE_ID;
}

export const OBSERVATION_ORDER_TEMPLATE_GROUP_IDS = [
  "monitoring",
  "nursing_reassessment",
  "comfort",
  "diagnostics_hint",
  "disposition",
] as const;

export type ObservationOrderTemplateGroupId = (typeof OBSERVATION_ORDER_TEMPLATE_GROUP_IDS)[number];

export type ObservationOrderTemplateLabelLocale = ProductUiLanguage;

export type ObservationOrderTemplateItemDef = {
  id: string;
  group: ObservationOrderTemplateGroupId;
  /** Pre-checked when the modal opens (provider may uncheck). */
  defaultSelected: boolean;
  /** Persisted as CARE `manualLabel` when UI / API locale is French. */
  manualLabelFr: string;
  /** Persisted as CARE `manualLabel` when UI / API locale is English. */
  manualLabelEn: string;
};

/** Stable ids for audit metadata and API validation. */
export const OBSERVATION_ORDER_TEMPLATE_ITEMS: readonly ObservationOrderTemplateItemDef[] = [
  {
    id: "mon_vitals_q2h",
    group: "monitoring",
    defaultSelected: true,
    manualLabelFr: "Signes vitaux toutes les 2 heures (surveillance observation)",
    manualLabelEn: "Vital signs every 2 hours (observation monitoring)",
  },
  {
    id: "mon_vitals_q4h",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Signes vitaux toutes les 4 heures",
    manualLabelEn: "Vital signs every 4 hours",
  },
  {
    id: "mon_pulse_ox_continuous",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Surveillance continue par oxymétrie de pouls",
    manualLabelEn: "Continuous pulse oximetry monitoring",
  },
  {
    id: "mon_cardiac_monitoring",
    group: "monitoring",
    defaultSelected: false,
    manualLabelFr: "Surveillance monitorée (rythme / signes vitaux dédiés)",
    manualLabelEn: "Monitored surveillance (rhythm / dedicated vitals)",
  },
  {
    id: "nurse_reassess_q2h",
    group: "nursing_reassessment",
    defaultSelected: true,
    manualLabelFr: "Réévaluation infirmière toutes les 2 heures (parcours observation)",
    manualLabelEn: "Nursing reassessment every 2 hours (observation pathway)",
  },
  {
    id: "nurse_pain_q2h",
    group: "nursing_reassessment",
    defaultSelected: true,
    manualLabelFr: "Évaluation de la douleur toutes les 2 heures",
    manualLabelEn: "Pain assessment every 2 hours",
  },
  {
    id: "nurse_notify_bp",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si tension artérielle > 160/95 mmHg",
    manualLabelEn: "Notify physician if blood pressure > 160/95 mmHg",
  },
  {
    id: "nurse_notify_hr",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si fréquence cardiaque > 120/min ou < 50/min",
    manualLabelEn: "Notify physician if heart rate > 120/min or < 50/min",
  },
  {
    id: "nurse_notify_spo2",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si SpO₂ < 92 % en air ambiant",
    manualLabelEn: "Notify physician if SpO₂ < 92% on room air",
  },
  {
    id: "nurse_notify_fever",
    group: "nursing_reassessment",
    defaultSelected: false,
    manualLabelFr: "Alerter le médecin si fièvre ≥ 38,3 °C (équivalent 101 °F oral)",
    manualLabelEn: "Notify physician if fever ≥ 38.3 °C (101 °F oral equivalent)",
  },
  {
    id: "com_diet_ad_lib",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Régime alimentaire selon tolérance",
    manualLabelEn: "Diet as tolerated",
  },
  {
    id: "com_oral_fluids",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Encourager les liquides oraux sauf contre-indication",
    manualLabelEn: "Encourage oral fluids unless contraindicated",
  },
  {
    id: "com_fall_precautions",
    group: "comfort",
    defaultSelected: true,
    manualLabelFr: "Précautions anti-chute selon indication",
    manualLabelEn: "Fall precautions as indicated",
  },
  {
    id: "dx_catalog_reminder",
    group: "diagnostics_hint",
    defaultSelected: false,
    manualLabelFr:
      "Biologie ou imagerie de contrôle : utiliser l’onglet Ordres pour commandes au catalogue si cliniquement indiqué",
    manualLabelEn:
      "Follow-up labs or imaging: use the Orders tab for catalog orders when clinically indicated",
  },
  {
    id: "disp_reassess_discharge",
    group: "disposition",
    defaultSelected: true,
    manualLabelFr: "Réévaluer quotidiennement les critères de sortie (observation / court séjour)",
    manualLabelEn: "Reassess discharge criteria daily (observation / short stay)",
  },
  {
    id: "disp_prepare_transfer",
    group: "disposition",
    defaultSelected: false,
    manualLabelFr: "Préparer un transfert en cas d'aggravation clinique",
    manualLabelEn: "Prepare for transfer if clinical condition worsens",
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

/** Narrow persisted order item shape — maps persisted CARE manual labels back to stable template ids. */
export type ObservationTemplatePersistedOrderItemLite = {
  manualLabel?: string | null;
  status?: string | null;
  lifecycleState?: string | null;
};

export function normalizeObservationTemplateManualLabelForMatch(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** True when this item line should count toward "already applied" dedupe (non-cancelled). */
export function isObservationTemplatePersistedOrderItemActive(it: ObservationTemplatePersistedOrderItemLite): boolean {
  const st = String(it.status ?? "").toUpperCase();
  if (st === "CANCELLED") return false;
  const ls = String(it.lifecycleState ?? "").toUpperCase();
  if (ls === "CANCELLED") return false;
  return true;
}

/**
 * Resolve stable template item id from persisted CARE manualLabel (matches FR or EN canonical labels).
 */
export function observationTemplateItemIdFromPersistedManualLabel(
  manualLabel: string | null | undefined
): string | undefined {
  const raw = typeof manualLabel === "string" ? manualLabel : "";
  if (!raw.trim()) return undefined;
  const n = normalizeObservationTemplateManualLabelForMatch(raw);
  for (const def of OBSERVATION_ORDER_TEMPLATE_ITEMS) {
    if (
      n === normalizeObservationTemplateManualLabelForMatch(def.manualLabelFr) ||
      n === normalizeObservationTemplateManualLabelForMatch(def.manualLabelEn)
    ) {
      return def.id;
    }
  }
  return undefined;
}

/** Aggregate distinct template ids already represented by persisted CARE lines (template bundle orders). */
export function collectObservationTemplateItemIdsFromOrderItems(
  items: ObservationTemplatePersistedOrderItemLite[]
): string[] {
  const discovered = new Set<string>();
  for (const it of items) {
    if (!isObservationTemplatePersistedOrderItemActive(it)) continue;
    const id = observationTemplateItemIdFromPersistedManualLabel(it.manualLabel ?? "");
    if (id) discovered.add(id);
  }
  return orderObservationTemplateSelection([...discovered]);
}

function observationTemplateManualLabelForLocale(
  def: ObservationOrderTemplateItemDef,
  locale: ObservationOrderTemplateLabelLocale
): string {
  switch (locale) {
    case "en":
      return def.manualLabelEn;
    case "fr":
      return def.manualLabelFr;
    default: {
      const _exhaustive: never = locale;
      return _exhaustive;
    }
  }
}

/** Display / persistence label for one template line (UI locale or API header). */
export function observationOrderTemplateItemManualLabel(
  id: string,
  locale: ObservationOrderTemplateLabelLocale
): string {
  const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === id);
  if (!def) return id;
  return observationTemplateManualLabelForLocale(def, locale);
}

export function buildObservationTemplateCareOrderDto(input: {
  selectedItemIds: string[];
  prescriberName: string;
  prescriberLicense?: string | null;
  prescriberContact?: string | null;
  /** Product UI locale. Unsupported/omitted values resolve to English at this boundary. */
  labelLocale?: ObservationOrderTemplateLabelLocale;
  /** When applying one order per template line, links rows from the same apply action. */
  observationTemplateGroupId?: string | null;
}): OrderCreateDto {
  const unique = orderObservationTemplateSelection(input.selectedItemIds);
  if (unique.length === 0) {
    throw new Error("observation_template_no_valid_items");
  }
  const locale: ObservationOrderTemplateLabelLocale =
    parseProductUiLanguage(input.labelLocale) ?? PRODUCT_DEFAULT_UI_LANGUAGE;
  const items: OrderItemCreateDto[] = unique.map((id) => {
    const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((i) => i.id === id)!;
    return {
      catalogItemId: null,
      catalogItemType: "CARE",
      manualLabel: observationTemplateManualLabelForLocale(def, locale),
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
    ...(unique.length === 1
      ? { observationTemplateItemId: unique[0] }
      : {}),
    ...(input.observationTemplateGroupId?.trim()
      ? { observationTemplateGroupId: input.observationTemplateGroupId.trim() }
      : {}),
    items,
  };
}
