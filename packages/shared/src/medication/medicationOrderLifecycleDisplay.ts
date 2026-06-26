import {
  resolveMedicationOrderLifecycleStatus,
  type MedicationOrderLifecycleStatus,
} from "./medicationOrderLifecycle.js";

/** Statuses visible in UI but not yet provider-actionable (governance-deferred). */
export const MEDICATION_ORDER_LIFECYCLE_GOVERNANCE_DEFERRED_STATUSES = [
  "EXPIRED",
  "CANCELED_ENTERED_IN_ERROR",
] as const satisfies readonly MedicationOrderLifecycleStatus[];

export type MedicationOrderLifecycleGovernanceDeferredStatus =
  (typeof MEDICATION_ORDER_LIFECYCLE_GOVERNANCE_DEFERRED_STATUSES)[number];

export type MedicationOrderLifecycleDisplayInput = {
  medicationLifecycleStatus?: string | null;
  medicationLifecycleAt?: string | Date | null;
  medicationLifecycleReason?: string | null;
  medicationLifecycleNote?: string | null;
  medicationLifecycleByUserId?: string | null;
  medicationLifecycleByDisplay?: string | null;
  replacesOrderItemId?: string | null;
  replacementOrderItemId?: string | null;
  strength?: string | null;
  frequencyCode?: string | null;
  route?: string | null;
  notes?: string | null;
  previousStrength?: string | null;
  previousFrequencyCode?: string | null;
  previousRoute?: string | null;
};

export type MedicationOrderLifecycleDisplay = {
  status: MedicationOrderLifecycleStatus;
  effectiveAtIso: string | null;
  reason: string | null;
  note: string | null;
  providerDisplay: string | null;
  replacesOrderItemId: string | null;
  replacementOrderItemId: string | null;
  doseSummary: string | null;
  previousDoseSummary: string | null;
  isGovernanceDeferred: boolean;
  showLifecycleBadge: boolean;
};

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

function buildDoseSummary(input: {
  strength?: string | null;
  frequencyCode?: string | null;
  route?: string | null;
}): string | null {
  const parts = [
    readStr(input.strength),
    readStr(input.frequencyCode),
    readStr(input.route),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function isMedicationOrderLifecycleGovernanceDeferred(
  status: MedicationOrderLifecycleStatus
): boolean {
  return (MEDICATION_ORDER_LIFECYCLE_GOVERNANCE_DEFERRED_STATUSES as readonly string[]).includes(
    status
  );
}

export function resolveMedicationOrderLifecycleDisplay(
  input: MedicationOrderLifecycleDisplayInput
): MedicationOrderLifecycleDisplay {
  const status = resolveMedicationOrderLifecycleStatus(input.medicationLifecycleStatus);
  const isGovernanceDeferred = isMedicationOrderLifecycleGovernanceDeferred(status);
  return {
    status,
    effectiveAtIso: toIso(input.medicationLifecycleAt),
    reason: readStr(input.medicationLifecycleReason) || null,
    note: readStr(input.medicationLifecycleNote) || null,
    providerDisplay: readStr(input.medicationLifecycleByDisplay) || null,
    replacesOrderItemId: readStr(input.replacesOrderItemId) || null,
    replacementOrderItemId: readStr(input.replacementOrderItemId) || null,
    doseSummary: buildDoseSummary({
      strength: input.strength,
      frequencyCode: input.frequencyCode,
      route: input.route,
    }),
    previousDoseSummary: buildDoseSummary({
      strength: input.previousStrength,
      frequencyCode: input.previousFrequencyCode,
      route: input.previousRoute,
    }),
    isGovernanceDeferred,
    showLifecycleBadge: status !== "ACTIVE",
  };
}

export function findReplacementOrderItemIdForOrderItem(
  orders: unknown[],
  orderItemId: string
): string | null {
  const target = orderItemId.trim();
  if (!target) return null;
  for (const orderRaw of orders) {
    if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) continue;
    const items = (orderRaw as { items?: unknown }).items;
    if (!Array.isArray(items)) continue;
    for (const itemRaw of items) {
      if (!itemRaw || typeof itemRaw !== "object" || Array.isArray(itemRaw)) continue;
      const item = itemRaw as { id?: unknown; replacesOrderItemId?: unknown };
      if (readStr(item.replacesOrderItemId) === target) {
        return readStr(item.id) || null;
      }
    }
  }
  return null;
}

export function extractMedicationOrderLifecycleInputFromItem(
  item: Record<string, unknown>,
  orders: unknown[] = []
): MedicationOrderLifecycleDisplayInput {
  const itemId = readStr(item.id);
  const replacementOrderItemId = itemId
    ? findReplacementOrderItemIdForOrderItem(orders, itemId)
    : null;
  const replacesOrderItemId = readStr(item.replacesOrderItemId);
  let previousStrength: string | null = null;
  let previousFrequencyCode: string | null = null;
  let previousRoute: string | null = null;
  if (replacesOrderItemId) {
    for (const orderRaw of orders) {
      if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) continue;
      const items = (orderRaw as { items?: unknown }).items;
      if (!Array.isArray(items)) continue;
      const prior = items.find(
        (it) =>
          it &&
          typeof it === "object" &&
          !Array.isArray(it) &&
          readStr((it as { id?: unknown }).id) === replacesOrderItemId
      ) as Record<string, unknown> | undefined;
      if (prior) {
        previousStrength = readStr(prior.strength) || null;
        previousFrequencyCode = readStr(prior.frequencyCode) || null;
        previousRoute = readStr(prior.route) || null;
        break;
      }
    }
  }
  return {
    medicationLifecycleStatus: readStr(item.medicationLifecycleStatus) || null,
    medicationLifecycleAt:
      (item.medicationLifecycleAt as string | Date | null | undefined) ?? null,
    medicationLifecycleReason: readStr(item.medicationLifecycleReason) || null,
    medicationLifecycleNote: readStr(item.medicationLifecycleNote) || null,
    medicationLifecycleByUserId: readStr(item.medicationLifecycleByUserId) || null,
    medicationLifecycleByDisplay:
      readStr(item.medicationLifecycleByDisplayFr) ||
      readStr(item.medicationLifecycleByDisplay) ||
      null,
    replacesOrderItemId: replacesOrderItemId || null,
    replacementOrderItemId,
    strength: readStr(item.strength) || null,
    frequencyCode: readStr(item.frequencyCode) || null,
    route: readStr(item.route) || null,
    notes: readStr(item.notes) || null,
    previousStrength,
    previousFrequencyCode,
    previousRoute,
  };
}

export type MedicationOrderLifecycleSummaryLineKey =
  | "status"
  | "reason"
  | "effectiveAt"
  | "provider"
  | "note"
  | "replacement"
  | "previousDose"
  | "newDose"
  | "governanceDeferred";

export function buildMedicationOrderLifecycleSummaryLineKeys(
  display: MedicationOrderLifecycleDisplay
): MedicationOrderLifecycleSummaryLineKey[] {
  if (!display.showLifecycleBadge) return [];
  const keys: MedicationOrderLifecycleSummaryLineKey[] = ["status"];
  if (display.reason) keys.push("reason");
  if (display.effectiveAtIso) keys.push("effectiveAt");
  if (display.providerDisplay) keys.push("provider");
  if (display.note) keys.push("note");
  if (display.replacementOrderItemId || display.replacesOrderItemId) keys.push("replacement");
  if (display.previousDoseSummary && display.status === "SUPERSEDED") keys.push("previousDose");
  if (display.doseSummary && display.status === "SUPERSEDED") keys.push("newDose");
  if (display.isGovernanceDeferred) keys.push("governanceDeferred");
  return keys;
}
