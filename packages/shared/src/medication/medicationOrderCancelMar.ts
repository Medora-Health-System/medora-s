import { pickProductUiCopy } from "../i18n/productUiLocale.js";
import { formatMarShiftTimelineClinicianDisplay } from "./marShiftTimeline.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "./medicationDoseStatus.js";

/** Synthetic dose-instance id prefix for canceled-order timeline markers (not a DB row). */
export const MAR_CANCELED_ORDER_MARKER_DOSE_ID_PREFIX = "canceled-order:";

export function buildMarCanceledOrderMarkerDoseInstanceId(orderItemId: string): string {
  return `${MAR_CANCELED_ORDER_MARKER_DOSE_ID_PREFIX}${orderItemId.trim()}`;
}

export function isMarCanceledOrderMarkerDoseInstanceId(
  medicationDoseInstanceId: string | null | undefined
): boolean {
  return (medicationDoseInstanceId?.trim() ?? "").startsWith(MAR_CANCELED_ORDER_MARKER_DOSE_ID_PREFIX);
}

const NON_CASCADE_DOSE_STATUSES = new Set<MedicationDoseStatus>([
  "COMPLETED",
  "MISSED",
  "CANCELLED",
  "SUPERSEDED",
  "HELD",
]);

/** Open future dose eligible for cancel cascade (MEDUI.ED.MAR.H1B). */
export function isMedicationDoseOpenForCancellation(input: {
  doseStatus: string;
  scheduledAt: Date;
  cancelledAt: Date;
  hasTerminalAdministration?: boolean;
}): boolean {
  if (input.hasTerminalAdministration) return false;
  const status = parseMedicationDoseStatus(input.doseStatus);
  if (!status || NON_CASCADE_DOSE_STATUSES.has(status)) return false;
  if (status === "IN_PROGRESS") return true;
  if (input.scheduledAt.getTime() < input.cancelledAt.getTime()) return false;
  return true;
}

export type MedicationOrderCancelMetadata = {
  cancelledAt: Date;
  cancellationReason: string | null;
  cancellationDetails: string | null;
  cancelledByUserId: string | null;
  cancelledByDisplay: string | null;
  cancelScope: "ORDER" | "ORDER_ITEM" | null;
};

type OrderCancelEventMetadata = {
  cancelScope?: unknown;
  orderItemId?: unknown;
  cancellationReason?: unknown;
  cancellationDetails?: unknown;
};

function readOrderEventMetadata(raw: unknown): OrderCancelEventMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as OrderCancelEventMetadata;
}

function readMetadataString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Resolve line-level cancel metadata from parent order and/or OrderEvent rows. */
export function resolveMedicationOrderCancelMetadata(input: {
  orderItemId: string;
  orderCancelledAt: Date | null;
  orderCancellationReason: string | null;
  orderCancelledByUserId: string | null;
  orderCancelledByDisplay: string | null;
  cancelEvents: ReadonlyArray<{
    performedAt: Date;
    performedByUserId: string | null;
    performedByFirstName: string | null;
    performedByLastName: string | null;
    note: string | null;
    metadata: unknown;
  }>;
}): MedicationOrderCancelMetadata | null {
  const lineEvents = input.cancelEvents
    .map((event) => {
      const meta = readOrderEventMetadata(event.metadata);
      const scope = readMetadataString(meta?.cancelScope)?.toUpperCase() ?? null;
      const eventOrderItemId = readMetadataString(meta?.orderItemId);
      if (scope === "ORDER_ITEM" && eventOrderItemId !== input.orderItemId) {
        return null;
      }
      if (scope === "ORDER_ITEM" || scope === "ORDER" || scope == null) {
        return { event, meta, scope };
      }
      return null;
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.event.performedAt.getTime() - a.event.performedAt.getTime());

  const latestLineEvent = lineEvents.find((row) => {
    const scope = row.scope;
    const eventOrderItemId = readMetadataString(row.meta?.orderItemId);
    return scope === "ORDER_ITEM" && eventOrderItemId === input.orderItemId;
  });
  const latestOrderEvent = lineEvents.find((row) => row.scope === "ORDER" || row.scope == null);

  const source = latestLineEvent ?? latestOrderEvent;
  if (!source && !input.orderCancelledAt) return null;

  const cancelledAt =
    source?.event.performedAt ??
    input.orderCancelledAt ??
    null;
  if (!cancelledAt) return null;

  const cancellationReason =
    readMetadataString(source?.meta?.cancellationReason) ??
    readMetadataString(source?.event.note) ??
    input.orderCancellationReason;
  const cancellationDetails = readMetadataString(source?.meta?.cancellationDetails);
  const cancelledByUserId =
    source?.event.performedByUserId?.trim() || input.orderCancelledByUserId;
  const cancelledByDisplay =
    formatMarShiftTimelineClinicianDisplay(
      source?.event.performedByFirstName,
      source?.event.performedByLastName
    ) ?? input.orderCancelledByDisplay;

  const scopeRaw = readMetadataString(source?.meta?.cancelScope)?.toUpperCase();
  const cancelScope =
    scopeRaw === "ORDER_ITEM" || scopeRaw === "ORDER"
      ? scopeRaw
      : input.orderCancelledAt
        ? "ORDER"
        : null;

  return {
    cancelledAt,
    cancellationReason,
    cancellationDetails,
    cancelledByUserId: cancelledByUserId?.trim() || null,
    cancelledByDisplay,
    cancelScope,
  };
}

export function resolveMarCanceledTimelinePlacementInstant(input: {
  cancelledAt: Date;
  shiftStart: Date;
  shiftEnd: Date;
}): Date | null {
  if (input.cancelledAt.getTime() > input.shiftEnd.getTime()) return null;
  if (input.cancelledAt.getTime() < input.shiftStart.getTime()) {
    return input.shiftStart;
  }
  return input.cancelledAt;
}

export function buildMarCanceledTimelineCellDisplay(input: {
  medicationLabel: string | null;
  route: string | null;
  cancellationReason: string | null;
  locale?: string | null;
}): {
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  hoverStatus: string;
} {
  const locale = input.locale ?? "fr";
  const label =
    input.medicationLabel?.trim() ||
    pickProductUiCopy(locale, { en: "Medication", fr: "Médicament", es: "Medicamento" }, "Medicamento");
  const route = input.route?.trim().toUpperCase() || null;
  const canceledLabel = pickProductUiCopy(locale, { en: "CANCELED", fr: "ANNULÉ", es: "ANULADO" }, "ANULADO");
  const reason = input.cancellationReason?.trim();
  return {
    primaryText: label.split(/\s+/)[0] ?? label,
    secondaryText: route ? `${canceledLabel} · ${route}` : canceledLabel,
    tertiaryText:
      reason ??
      pickProductUiCopy(locale, { en: "Order canceled", fr: "Ordonnance annulée", es: "Orden anulada" }, "Orden anulada"),
    hoverStatus: pickProductUiCopy(locale, { en: "Canceled", fr: "Annulé", es: "Anulado" }, "Anulado"),
  };
}
