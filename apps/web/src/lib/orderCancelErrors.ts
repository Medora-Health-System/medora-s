import type { SupportedLanguage } from "@/i18n/config";

/** Maps cancel API failures to user-facing i18n keys (403/409/400). */
export function resolveOrderCancelErrorKey(
  message: string | null | undefined,
  httpStatus?: number
): string {
  const m = (message ?? "").trim();
  const lower = m.toLowerCase();

  if (httpStatus === 403 || /droits insuffisants|access denied|forbidden|accès refusé/i.test(m)) {
    return "erEmergencyOrders.cancelErrorForbidden";
  }
  if (
    httpStatus === 409 ||
    /déjà réalisée|déjà validée|prélèvement|administration déjà|étude déjà|closée/i.test(m)
  ) {
    return "erEmergencyOrders.cancelErrorConflict";
  }
  if (
    httpStatus === 400 ||
    /motif d'annulation|cancellation reason|motif d'annulation invalide/i.test(lower)
  ) {
    return "erEmergencyOrders.cancelErrorReasonRequired";
  }
  return "erEmergencyOrders.cancelErrorGeneric";
}

export function formatOrderCancelErrorMessage(
  message: string | null | undefined,
  tr: (key: string) => string,
  httpStatus?: number
): string {
  const key = resolveOrderCancelErrorKey(message, httpStatus);
  const mapped = tr(key);
  if (mapped && mapped !== key) return mapped;
  return message?.trim() || tr("erEmergencyOrders.cancelErrorGeneric");
}

export type OrderCancelVisibilityContext = {
  roles: string[];
  currentUserId?: string | null;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
};

const CANCEL_ATTEMPT_ROLES = new Set(["RN", "PROVIDER", "LAB", "RADIOLOGY", "PHARMACY", "ADMIN", "MEDORA_SUPER_ADMIN"]);

const RN_ACK_SOURCES = new Set(["VERBAL_ORDER", "NURSING_PROTOCOL"]);

function hasRole(roles: string[], code: string): boolean {
  return roles.some((r) => String(r).toUpperCase() === code);
}

/** UI hint: show cancel control when user might be authorized (backend is source of truth). */
export function canShowOrderLineCancelControl(
  order: Record<string, unknown>,
  item: Record<string, unknown>,
  ctx: OrderCancelVisibilityContext
): boolean {
  if (!ctx.roles.some((r) => CANCEL_ATTEMPT_ROLES.has(String(r).toUpperCase()))) return false;

  const lifecycle = String(item.lifecycleState ?? "");
  if (lifecycle === "REVIEWED" || lifecycle === "CANCELLED") return false;

  const status = String(item.status ?? "");
  if (status === "CANCELLED" || status === "COMPLETED" || status === "RESULTED" || status === "VERIFIED") {
    return false;
  }

  const userId = ctx.currentUserId?.trim() || "";
  const orderedBy = typeof order.orderedBy === "string" ? order.orderedBy : "";
  const source = typeof order.source === "string" ? order.source : "";
  const orderType = String(order.type ?? "");

  if (hasRole(ctx.roles, "ADMIN") || hasRole(ctx.roles, "MEDORA_SUPER_ADMIN")) return true;
  if (hasRole(ctx.roles, "LAB") && String(item.catalogItemType ?? "") === "LAB_TEST") return true;
  if (hasRole(ctx.roles, "RADIOLOGY") && String(item.catalogItemType ?? "") === "IMAGING_STUDY") return true;

  if (hasRole(ctx.roles, "PROVIDER")) {
    if (orderType === "MEDICATION" || orderType === "CARE") return true;
    if (userId && orderedBy === userId) return true;
    if (userId && ctx.physicianAssignedUserId === userId) return true;
  }

  if (hasRole(ctx.roles, "RN")) {
    if (userId && orderedBy === userId && lifecycle === "ORDERED") return true;
    if (
      userId &&
      orderedBy === userId &&
      lifecycle === "ACKNOWLEDGED" &&
      RN_ACK_SOURCES.has(source)
    ) {
      return true;
    }
    if (
      userId &&
      ctx.nurseAssignedUserId === userId &&
      RN_ACK_SOURCES.has(source) &&
      lifecycle !== "IN_PROGRESS" &&
      lifecycle !== "COMPLETED"
    ) {
      return true;
    }
  }

  return false;
}

export function orderCancelErrorLabelForTests(lang: SupportedLanguage): Record<string, string> {
  return lang === "en"
    ? {
        forbidden: "You do not have permission to cancel this order.",
        conflict: "This order can no longer be canceled because it has already been acknowledged or completed.",
        reason: "Cancellation reason is required.",
      }
    : {
        forbidden: "Vous n'avez pas l'autorisation d'annuler cette commande.",
        conflict: "Cette commande ne peut plus être annulée car elle a déjà été reçue ou réalisée.",
        reason: "Le motif d'annulation est requis.",
      };
}
