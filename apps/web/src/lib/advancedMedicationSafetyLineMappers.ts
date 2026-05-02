import type { AdvancedMedicationSafetyLine } from "@medora/shared";
import type { CreateOrderLineItem } from "@/components/orders/createOrderModal/types";
import { ACTIVE_ORDER_ITEM_STATUSES_FOR_CATALOG_DEDUP } from "@/lib/encounterClinicalSafetyUi";

type CatalogMed = {
  code?: string | null;
  name?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  route?: string | null;
  isControlled?: boolean | null;
  controlledSchedule?: string | null;
};

type OrderItemLike = {
  id?: string;
  catalogItemId?: string | null;
  catalogItemType?: string | null;
  manualLabel?: string | null;
  strength?: string | number | null;
  route?: string | null;
  quantity?: string | number | null;
  notes?: string | null;
  catalogMedication?: CatalogMed | null;
};

function strengthToString(raw: string | number | null | undefined): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  const s = String(raw).trim();
  return s || undefined;
}

function quantityToNumber(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Map a catalog-backed order item (encounter orders API) to a shared advanced-safety line. */
export function orderItemLikeToAdvancedMedicationSafetyLine(
  it: OrderItemLike,
  displayLabel: string
): AdvancedMedicationSafetyLine | null {
  const id = typeof it.id === "string" ? it.id.trim() : "";
  if (!id || String(it.catalogItemType ?? "").toUpperCase() !== "MEDICATION") return null;
  const cm = it.catalogMedication;
  const strength = strengthToString(it.strength);
  const route = it.route?.trim() || cm?.route?.trim() || undefined;
  const manual =
    String(it.catalogItemType ?? "").toUpperCase() === "MEDICATION" && !it.catalogItemId?.trim()
      ? it.manualLabel?.trim() || displayLabel
      : undefined;
  return {
    lineKey: id,
    catalogItemId: it.catalogItemId?.trim() || null,
    genericName: cm?.genericName?.trim() || null,
    therapeuticClass: cm?.therapeuticClass?.trim() || null,
    code: cm?.code?.trim() || undefined,
    name: cm?.name?.trim() || undefined,
    displayName: cm?.displayNameEn?.trim() || cm?.displayNameFr?.trim() || displayLabel,
    strength,
    route,
    dosageForm: undefined,
    quantity: quantityToNumber(it.quantity),
    notes: it.notes?.trim() || undefined,
    manualLabel: manual,
    isControlled: cm?.isControlled ?? undefined,
    controlledSchedule: cm?.controlledSchedule ?? undefined,
  };
}

export function createOrderLineToAdvancedMedicationSafetyLine(line: CreateOrderLineItem): AdvancedMedicationSafetyLine {
  const s = line._safetyCatalog;
  return {
    lineKey: line._lineId,
    catalogItemId: line.catalogItemId?.trim() || null,
    genericName: s?.genericName?.trim() || null,
    therapeuticClass: s?.therapeuticClass?.trim() || null,
    code: s?.code,
    name: s?.name ?? undefined,
    displayName: s?.displayName ?? line._label,
    strength: line.strength?.trim() || undefined,
    route: line.route?.trim() || undefined,
    dosageForm: line._dosageForm?.trim() || undefined,
    quantity: line.quantity ?? null,
    notes: line.notes?.trim() || undefined,
    manualLabel: line.isManual ? line.manualLabel?.trim() || line._label : undefined,
    isControlled: line._isControlled ?? undefined,
    controlledSchedule: line._controlledSchedule ?? undefined,
    commonAliases: s?.commonAliases,
  };
}

export function encounterOrdersToAdvancedMedicationSafetyLines(orders: unknown[]): AdvancedMedicationSafetyLine[] {
  const out: AdvancedMedicationSafetyLine[] = [];
  for (const order of orders) {
    if (!order || typeof order !== "object" || Array.isArray(order)) continue;
    const o = order as { status?: string; items?: unknown[] };
    if (o.status === "CANCELLED") continue;
    const items = Array.isArray(o.items) ? o.items : [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const it = raw as OrderItemLike & { status?: string };
      if (typeof it.id === "string" && it.id.startsWith("local:")) continue;
      if (String(it.catalogItemType ?? "").toUpperCase() !== "MEDICATION") continue;
      const st = String(it.status ?? "");
      if (!ACTIVE_ORDER_ITEM_STATUSES_FOR_CATALOG_DEDUP.has(st)) continue;
      const label =
        it.catalogMedication?.displayNameFr?.trim() ||
        it.catalogMedication?.displayNameEn?.trim() ||
        it.catalogMedication?.name?.trim() ||
        it.manualLabel?.trim() ||
        "Medication";
      const line = orderItemLikeToAdvancedMedicationSafetyLine(it, label);
      if (line) out.push(line);
    }
  }
  return out;
}
