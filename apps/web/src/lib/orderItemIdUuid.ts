import { medicationAdministrationCreateDtoSchema } from "@medora/shared";

/** Same rule as POST body `orderItemId` in `medicationAdministrationCreateDtoSchema` (Zod `.uuid()`). */
const orderItemIdField = medicationAdministrationCreateDtoSchema.shape.orderItemId;

export function isOrderItemIdUuid(id: string): boolean {
  const t = typeof id === "string" ? id.trim() : "";
  if (!t) return false;
  return orderItemIdField.safeParse(t).success;
}
