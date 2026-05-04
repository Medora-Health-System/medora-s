import type { OrderItem, Prisma } from "@prisma/client";
import type { MedicationInfusionCandidateInput } from "@medora/shared";
import { isMedicationInfusionCandidate } from "@medora/shared";

export type MedicationInfusionCatalogSlice = {
  code: string;
  name: string;
  displayNameEn: string | null;
  genericName: string | null;
  route: string | null;
  strength: string | null;
  /** Optional catalog therapeutic class (billing suggestion hint only). */
  therapeuticClass: string | null;
  administrationType: string | null;
  billingClass: string | null;
};

type OrderItemInfusionPick = Pick<
  OrderItem,
  | "route"
  | "catalogItemId"
  | "manualLabel"
  | "manualSecondaryText"
  | "strength"
  | "catalogItemType"
  | "medicationFulfillmentIntent"
>;

/**
 * Same route + catalog resolution as OrdersService infusion eligibility (single source of truth).
 */
export async function loadMedicationInfusionClassificationContext(
  db: Pick<Prisma.TransactionClient, "catalogMedication">,
  orderItem: Pick<OrderItem, "route" | "catalogItemId">
): Promise<{ resolvedRoute: string | null; catalog: MedicationInfusionCatalogSlice | null }> {
  let resolvedRoute = orderItem.route?.trim() || null;
  if (!orderItem.catalogItemId) {
    return { resolvedRoute, catalog: null };
  }
  const catalog = await db.catalogMedication.findUnique({
    where: { id: orderItem.catalogItemId },
    select: {
      code: true,
      name: true,
      displayNameEn: true,
      genericName: true,
      route: true,
      strength: true,
      therapeuticClass: true,
      administrationType: true,
      billingClass: true,
    },
  });
  if (!catalog) {
    return { resolvedRoute, catalog: null };
  }
  if (catalog.route?.trim() && !resolvedRoute) {
    resolvedRoute = catalog.route.trim();
  }
  return { resolvedRoute, catalog };
}

export function buildMedicationInfusionCandidateInputFromOrderItem(
  orderItem: Pick<OrderItem, "manualLabel" | "manualSecondaryText" | "strength">,
  catalog: MedicationInfusionCatalogSlice | null,
  resolvedRoute: string | null
): MedicationInfusionCandidateInput {
  const labelParts = [
    orderItem.manualLabel,
    orderItem.manualSecondaryText,
    typeof orderItem.strength === "string" ? orderItem.strength.trim() : "",
    catalog?.strength?.trim() ? catalog.strength.trim() : "",
    catalog?.displayNameEn,
    catalog?.name,
    catalog?.genericName,
    catalog?.code,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return {
    route: resolvedRoute,
    medicationLabel: labelParts.length ? labelParts.join(" ") : null,
    code: catalog?.code ?? null,
    genericName: catalog?.genericName ?? null,
    metadata: null,
    catalogAdministrationType: catalog?.administrationType?.trim() ?? null,
  };
}

/** Bedside MAR lines: null intent treated like ADMINISTER_CHART (aligns MAR + infusion guard). */
export function isOrderItemMarGuardBedsideChartMedication(orderItem: {
  catalogItemType: string;
  medicationFulfillmentIntent: string | null;
}): boolean {
  return (
    orderItem.catalogItemType === "MEDICATION" &&
    String(orderItem.medicationFulfillmentIntent ?? "ADMINISTER_CHART") === "ADMINISTER_CHART"
  );
}

/**
 * True when POST MAR with marAction administered must be rejected (use infusion start/stop instead).
 * Does not apply to refused / not_available / md_changed.
 */
export function shouldBlockDirectMarAdministeredForInfusionLine(
  orderItem: OrderItemInfusionPick,
  catalog: MedicationInfusionCatalogSlice | null,
  resolvedRoute: string | null
): boolean {
  if (!isOrderItemMarGuardBedsideChartMedication(orderItem)) return false;
  const input = buildMedicationInfusionCandidateInputFromOrderItem(orderItem, catalog, resolvedRoute);
  return isMedicationInfusionCandidate(input);
}
