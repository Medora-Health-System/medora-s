import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { OrderItem, RoleCode } from "@prisma/client";

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
  throw new BadRequestException("Type de ligne d'ordre non pris en charge.");
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
  assertDepartmentRoleForItem(orderItem.catalogItemType, roleCodes);
}
