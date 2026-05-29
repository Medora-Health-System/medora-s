import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { OrderItem, RoleCode } from "@prisma/client";
import {
  requestorMayAcknowledgeEnterpriseProcedure,
  requestorMayCompleteEnterpriseProcedure,
  resolveProcedureExecutionProfile,
} from "@medora/shared";

/** Shared with PATCH /orders/items/:id/status and OrdersService item actions. */
export function assertDepartmentRoleForItem(catalogItemType: string, roleCodes: RoleCode[]) {
  const admin = roleCodes.includes(RoleCode.ADMIN);
  if (catalogItemType === "LAB_TEST") {
    if (!admin && !roleCodes.includes(RoleCode.LAB)) {
      throw new ForbiddenException("Rôle laboratoire requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "IMAGING_STUDY") {
    if (!admin && !roleCodes.includes(RoleCode.RADIOLOGY)) {
      throw new ForbiddenException("Rôle imagerie requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "MEDICATION") {
    if (!admin && !roleCodes.includes(RoleCode.PHARMACY)) {
      throw new ForbiddenException("Rôle pharmacie requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "CARE") {
    if (!admin && !roleCodes.includes(RoleCode.RN)) {
      throw new ForbiddenException("Rôle infirmier requis pour cette action.");
    }
    return;
  }
  if (catalogItemType === "SUPPLY") {
    if (!admin && !roleCodes.includes(RoleCode.RN)) {
      throw new ForbiddenException("Rôle infirmier requis pour cette action.");
    }
    return;
  }
  throw new BadRequestException("Type de ligne d'ordre non pris en charge.");
}

function roleCodesAsStrings(roleCodes: RoleCode[]): string[] {
  return roleCodes.map((code) => String(code));
}

/** MEDPROC.4 — enterprise procedure CARE lines use catalog execution roles. */
function assertEnterpriseProcedureCareActor(
  orderItem: Pick<OrderItem, "catalogItemType" | "enterpriseProcedureId">,
  roleCodes: RoleCode[],
  action: "acknowledge" | "complete"
) {
  if (orderItem.catalogItemType !== "CARE") return false;
  const enterpriseProcedureId = orderItem.enterpriseProcedureId?.trim();
  if (!enterpriseProcedureId) return false;

  const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId });
  if (!profile) return false;

  if (roleCodes.includes(RoleCode.ADMIN)) return true;

  const allowed =
    action === "complete"
      ? requestorMayCompleteEnterpriseProcedure(roleCodesAsStrings(roleCodes), profile)
      : requestorMayAcknowledgeEnterpriseProcedure(roleCodesAsStrings(roleCodes), profile);

  if (!allowed) {
    throw new ForbiddenException(
      action === "complete"
        ? "Rôle non autorisé pour terminer cette procédure."
        : "Rôle non autorisé pour accuser réception de cette procédure."
    );
  }
  return true;
}

/** MEDPROC.4 — completion actor for order item lines. */
export function assertCompleteActorForItem(
  orderItem: Pick<OrderItem, "catalogItemType" | "enterpriseProcedureId">,
  roleCodes: RoleCode[]
) {
  if (assertEnterpriseProcedureCareActor(orderItem, roleCodes, "complete")) return;
  assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
}

/** CARE/procedure effective clinical time correction — after item is confirmed CARE (not med/lab/imaging). */
export function assertCareProcedureEffectiveTimeActor(roleCodes: RoleCode[]) {
  if (
    roleCodes.includes(RoleCode.ADMIN) ||
    roleCodes.includes(RoleCode.RN) ||
    roleCodes.includes(RoleCode.PROVIDER)
  ) {
    return;
  }
  throw new ForbiddenException(
    "Seuls le personnel infirmier, le médecin ou un administrateur peuvent ajuster l'heure clinique d'un soin / procédure."
  );
}

/** MAR effective administration time correction — documented administrations only. */
export function assertMedicationAdminEffectiveTimeActor(roleCodes: RoleCode[]) {
  assertCareProcedureEffectiveTimeActor(roleCodes);
}

export function isMedicationAdministerChart(orderItem: {
  catalogItemType: string;
  medicationFulfillmentIntent: string | null;
}) {
  return (
    orderItem.catalogItemType === "MEDICATION" &&
    orderItem.medicationFulfillmentIntent === "ADMINISTER_CHART"
  );
}

/** Accusé / démarrage : infirmier pour médicament au lit ; sinon file départementale (labo, etc.). */
export function assertAckOrStartActor(orderItem: OrderItem, roleCodes: RoleCode[]) {
  const admin = roleCodes.includes(RoleCode.ADMIN);
  if (admin) return;
  if (isMedicationAdministerChart(orderItem)) {
    if (!roleCodes.includes(RoleCode.RN)) {
      throw new ForbiddenException("Rôle infirmier requis pour cette ligne d'administration au lit.");
    }
    return;
  }
  if (assertEnterpriseProcedureCareActor(orderItem, roleCodes, "acknowledge")) return;
  assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
}
