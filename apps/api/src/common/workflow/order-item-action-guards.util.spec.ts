import { ForbiddenException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import {
  assertAckOrStartActor,
  assertCompleteActorForItem,
  assertDepartmentRoleForItem,
} from "./order-item-action-guards.util";

const labItem = {
  catalogItemType: "LAB_TEST",
  enterpriseProcedureId: null,
  medicationFulfillmentIntent: null,
} as Parameters<typeof assertAckOrStartActor>[0];

const imagingItem = {
  catalogItemType: "IMAGING_STUDY",
  enterpriseProcedureId: null,
  medicationFulfillmentIntent: null,
} as Parameters<typeof assertAckOrStartActor>[0];

const allowedClinicalRoles: RoleCode[] = [
  RoleCode.ADMIN,
  RoleCode.PROVIDER,
  RoleCode.RN,
  RoleCode.LAB,
  RoleCode.RADIOLOGY,
];

const rejectedNonClinicalRoles: RoleCode[] = [RoleCode.FRONT_DESK, RoleCode.BILLING, RoleCode.PHARMACY];

describe("LAB.ED.4 — LAB_TEST / IMAGING_STUDY clinical workflow roles", () => {
  describe.each(["LAB_TEST", "IMAGING_STUDY"] as const)("catalog %s", (catalogItemType) => {
    const item =
      catalogItemType === "LAB_TEST"
        ? labItem
        : (imagingItem as Parameters<typeof assertAckOrStartActor>[0]);

    it.each(allowedClinicalRoles)("acknowledge/start allowed for %s", (role) => {
      expect(() => assertAckOrStartActor(item, [role])).not.toThrow();
    });

    it.each(allowedClinicalRoles)("complete allowed for %s", (role) => {
      expect(() =>
        assertCompleteActorForItem(
          { catalogItemType, enterpriseProcedureId: null },
          [role]
        )
      ).not.toThrow();
    });

    it.each(rejectedNonClinicalRoles)("acknowledge/start rejected for %s", (role) => {
      expect(() => assertAckOrStartActor(item, [role])).toThrow(ForbiddenException);
    });

    it.each(rejectedNonClinicalRoles)("complete rejected for %s", (role) => {
      expect(() =>
        assertCompleteActorForItem(
          { catalogItemType, enterpriseProcedureId: null },
          [role]
        )
      ).toThrow(ForbiddenException);
    });

    it("rejects MEDORA_SUPER_ADMIN without a clinical role", () => {
      expect(() => assertAckOrStartActor(item, [RoleCode.MEDORA_SUPER_ADMIN])).toThrow(
        ForbiddenException
      );
    });
  });

  it("MEDICATION workflow unchanged — PHARMACY required", () => {
    expect(() => assertDepartmentRoleForItem("MEDICATION", [RoleCode.RN])).toThrow(
      ForbiddenException
    );
    expect(() => assertDepartmentRoleForItem("MEDICATION", [RoleCode.PHARMACY])).not.toThrow();
  });
});
