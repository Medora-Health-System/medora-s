import { BadRequestException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { InternalPlacementActorRole, InternalPlacementStatus } from "@medora/shared";
import { resolvePlacementActorRole } from "./internal-placement.controller";

describe("resolvePlacementActorRole", () => {
  it("maps ADMIN to ADMIN for all transitions", () => {
    expect(
      resolvePlacementActorRole([RoleCode.ADMIN], InternalPlacementStatus.BED_ASSIGNED)
    ).toBe(InternalPlacementActorRole.ADMIN);
  });

  it("maps PROVIDER for clinical submit path", () => {
    expect(
      resolvePlacementActorRole([RoleCode.PROVIDER], InternalPlacementStatus.REQUESTED)
    ).toBe(InternalPlacementActorRole.PROVIDER);
  });

  it("maps RN to ED_NURSE for departure", () => {
    expect(
      resolvePlacementActorRole([RoleCode.RN], InternalPlacementStatus.DEPARTED_ED)
    ).toBe(InternalPlacementActorRole.ED_NURSE);
  });

  it("maps RN to RECEIVING_NURSE for arrival", () => {
    expect(
      resolvePlacementActorRole([RoleCode.RN], InternalPlacementStatus.ARRIVED_DESTINATION)
    ).toBe(InternalPlacementActorRole.RECEIVING_NURSE);
  });

  it("blocks provider from bed assignment", () => {
    expect(() =>
      resolvePlacementActorRole([RoleCode.PROVIDER], InternalPlacementStatus.BED_ASSIGNED)
    ).toThrow(BadRequestException);
  });
});
