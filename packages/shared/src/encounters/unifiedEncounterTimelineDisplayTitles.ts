/**
 * Phase 15F-D.3.4 — Locale-aware unified timeline display titles (read-model only).
 */

import {
  clinicalTimelineDisplayLabelEn,
  clinicalTimelineDisplayLabelFr,
} from "./clinicalTimelineDisplayNormalization.js";
import {
  observationOrderTemplateItemManualLabel,
  observationTemplateItemIdFromPersistedManualLabel,
  type ObservationOrderTemplateLabelLocale,
} from "../observationOrderTemplate.js";

export type UnifiedTimelineDisplayLocale = ObservationOrderTemplateLabelLocale;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** Resolve order line label for timeline titles without mutating stored metadata. */
export function resolveUnifiedTimelineOrderLineLabel(input: {
  metadata?: unknown;
  lineLabelFr?: string | null;
  lineLabelEn?: string | null;
  locale: UnifiedTimelineDisplayLocale;
}): string | null {
  const meta = asRecord(input.metadata);
  const templateItemId =
    (typeof meta?.templateItemId === "string" && meta.templateItemId.trim()) ||
    (typeof meta?.observationTemplateItemId === "string" && meta.observationTemplateItemId.trim()) ||
    null;

  if (templateItemId) {
    return observationOrderTemplateItemManualLabel(templateItemId, input.locale);
  }

  const metaEn = typeof meta?.lineLabelEn === "string" ? meta.lineLabelEn.trim() : "";
  const metaFr = typeof meta?.lineLabelFr === "string" ? meta.lineLabelFr.trim() : "";
  if (input.locale === "en" && metaEn) return metaEn;
  if (input.locale === "fr" && metaFr) return metaFr;

  const storedFr = input.lineLabelFr?.trim() || "";
  const storedEn = input.lineLabelEn?.trim() || "";
  const fromManualId = observationTemplateItemIdFromPersistedManualLabel(storedFr || storedEn);
  if (fromManualId) {
    return observationOrderTemplateItemManualLabel(fromManualId, input.locale);
  }

  if (input.locale === "en" && storedEn) return storedEn;
  if (input.locale === "fr" && storedFr) return storedFr;
  if (storedFr) return storedFr;
  if (storedEn) return storedEn;
  return null;
}

function observationTemplateTimelineTitle(
  locale: UnifiedTimelineDisplayLocale,
  eventType: string,
  lineLabel: string | null,
  metadata?: Record<string, unknown> | null
): string | null {
  if (metadata?.source !== "OBSERVATION_TEMPLATE_ORDER") return null;
  const line = lineLabel?.trim();
  const et = eventType.toUpperCase();
  const lifecycle =
    typeof metadata.lifecycleOutcome === "string" ? metadata.lifecycleOutcome.toUpperCase() : "";

  if (locale === "en") {
    if (et === "CREATED") {
      return line ? `${line} — ordered (observation)` : "Observation order placed";
    }
    if (et === "STARTED" && lifecycle === "ACKNOWLEDGED") {
      return line ? `Order acknowledged — ${line}` : "Order acknowledged";
    }
    if (et === "STARTED") {
      return line ? `${line} — in progress` : "Observation order started";
    }
    if (et === "COMPLETED") {
      return line ? `${line} — completed` : "Observation order completed";
    }
    if (et === "CANCELLED") {
      return line ? `${line} — cancelled` : "Observation order cancelled";
    }
    return null;
  }

  if (et === "CREATED") {
    return line ? `${line} — prescrit (observation)` : "Ordre observation prescrit";
  }
  if (et === "STARTED" && lifecycle === "ACKNOWLEDGED") {
    return line ? `${line} — accusé réception` : "Ordre observation accusé réception";
  }
  if (et === "STARTED") {
    return line ? `${line} — en cours` : "Ordre observation démarré";
  }
  if (et === "COMPLETED") {
    return line ? `${line} — terminé` : "Ordre observation terminé";
  }
  if (et === "CANCELLED") {
    return line ? `${line} — annulé` : "Ordre observation annulé";
  }
  return null;
}

export function buildUnifiedOrderEventTitle(input: {
  locale: UnifiedTimelineDisplayLocale;
  eventType: string;
  orderType: string;
  lineLabel: string | null;
  metadata?: unknown;
}): string {
  const meta = asRecord(input.metadata);
  const templateTitle = observationTemplateTimelineTitle(
    input.locale,
    input.eventType,
    input.lineLabel,
    meta
  );
  if (templateTitle) return templateTitle;

  const et = input.eventType.toUpperCase();
  const ot = input.orderType.toUpperCase();
  const lifecycle =
    meta && typeof meta.lifecycleOutcome === "string" ? meta.lifecycleOutcome.toUpperCase() : "";
  const line = input.lineLabel?.trim();

  if (et === "STARTED" && lifecycle === "ACKNOWLEDGED") {
    if (input.locale === "en") {
      return line ? `Order acknowledged — ${line}` : "Order acknowledged";
    }
    return line ? `Ordre accusé réception — ${line}` : "Ordre accusé réception";
  }

  if (line && et !== "STARTED") return line;

  if (et === "CREATED") {
    if (input.locale === "en") {
      if (ot === "LAB") return "Lab order placed";
      if (ot === "IMAGING") return "Imaging order placed";
      if (ot === "MEDICATION") return "Medication order placed";
      if (ot === "CARE") return "Care / procedure order placed";
    } else {
      if (ot === "LAB") return "Prescription laboratoire";
      if (ot === "IMAGING") return "Prescription imagerie";
      if (ot === "MEDICATION") return "Prescription médicament";
      if (ot === "CARE") return "Ordre de soins / procédure";
    }
  }

  if (et === "COMPLETED") {
    if (input.locale === "en") {
      if (ot === "LAB") return "Laboratory — step completed";
      if (ot === "IMAGING") return "Imaging — step completed";
      if (ot === "CARE") return "Care / procedure completed";
    } else {
      if (ot === "LAB") return "Laboratoire — étape terminée";
      if (ot === "IMAGING") return "Imagerie — étape terminée";
      if (ot === "CARE") return "Soins / procédure terminés";
    }
  }

  if (et === "CANCELLED") {
    if (input.locale === "en") {
      if (line && meta?.orderItemId) return `${line} — line cancelled`;
      return "Order cancelled";
    }
    if (line && meta?.orderItemId) return `${line} — ligne annulée`;
    return "Ordre annulé";
  }

  if (et === "STARTED" && ot === "MEDICATION") {
    return input.locale === "en" ? "Infusion started" : "Perfusion démarrée";
  }

  if (et === "STARTED" && ot === "CARE") {
    if (input.locale === "en") {
      return line ? `${line} — started` : "Care / procedure started";
    }
    return line ? `${line} — démarré` : "Soins / procédure démarrés";
  }

  return input.locale === "en" ? `Order — ${et}` : `Ordre — ${et}`;
}

export function buildUnifiedClinicalEventTitle(
  locale: UnifiedTimelineDisplayLocale,
  displayEventType: string
): string {
  return locale === "en"
    ? clinicalTimelineDisplayLabelEn(displayEventType)
    : clinicalTimelineDisplayLabelFr(displayEventType);
}

export function buildUnifiedMarAdministrationTitle(
  locale: UnifiedTimelineDisplayLocale,
  medicationLabel: string | null | undefined
): string {
  const label = medicationLabel?.trim() || (locale === "en" ? "Medication" : "Médicament");
  return locale === "en" ? `Administration — ${label}` : `Administration — ${label}`;
}

export function buildUnifiedResultTitle(
  locale: UnifiedTimelineDisplayLocale,
  isImaging: boolean,
  itemLabel: string | null | undefined
): string {
  const label = itemLabel?.trim() || (locale === "en" ? "Result" : "Résultat");
  if (locale === "en") {
    return isImaging ? `Imaging result — ${label}` : `Lab result — ${label}`;
  }
  return isImaging ? `Résultat imagerie — ${label}` : `Résultat labo — ${label}`;
}
