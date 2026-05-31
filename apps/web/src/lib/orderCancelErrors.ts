import type { SupportedLanguage } from "@/i18n/config";
import { isOrderLineCancelableByStateForEr } from "@/features/emergency/erOrderLifecycleUi";

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

/** User holds a role that may attempt order-line cancel (backend enforces final RBAC). */
export function hasOrderLineCancelAttemptRole(roles: string[] | undefined): boolean {
  return (roles ?? []).some((r) => CANCEL_ATTEMPT_ROLES.has(String(r).toUpperCase()));
}

/**
 * ED open-order cancel × visibility: clinical cancel role + safe lifecycle state only.
 * Backend remains authoritative for 403/409; this avoids hiding controls when row data
 * lacks `orderedBy` / assignment fields needed for a full RBAC mirror.
 */
export function shouldShowErOrderLineCancelAction(
  roles: string[] | undefined,
  item: Record<string, unknown>
): boolean {
  return hasOrderLineCancelAttemptRole(roles) && isOrderLineCancelableByStateForEr(item);
}

function resolveOrderCreatorUserId(order: Record<string, unknown>): string {
  if (typeof order.orderedBy === "string" && order.orderedBy.trim()) {
    return order.orderedBy.trim();
  }
  const createdBy = order.createdByDisplay;
  if (createdBy && typeof createdBy === "object" && !Array.isArray(createdBy)) {
    const userId = (createdBy as { userId?: unknown }).userId;
    if (typeof userId === "string" && userId.trim()) return userId.trim();
  }
  return "";
}

function resolveOrderSource(order: Record<string, unknown>): string {
  if (typeof order.source === "string" && order.source.trim()) return order.source.trim();
  const authority = order.authority;
  if (authority && typeof authority === "object" && !Array.isArray(authority)) {
    const source = (authority as { source?: unknown }).source;
    if (typeof source === "string" && source.trim()) return source.trim();
  }
  return "";
}

/** Optional strict hint when full order attribution is available (not used for ED × default). */
export function canShowOrderLineCancelControl(
  order: Record<string, unknown>,
  item: Record<string, unknown>,
  ctx: OrderCancelVisibilityContext
): boolean {
  if (!hasOrderLineCancelAttemptRole(ctx.roles)) return false;
  if (!isOrderLineCancelableByStateForEr(item)) return false;

  const lifecycle = String(item.lifecycleState ?? "");
  const userId = ctx.currentUserId?.trim() || "";
  const orderedBy = resolveOrderCreatorUserId(order);
  const source = resolveOrderSource(order);
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
