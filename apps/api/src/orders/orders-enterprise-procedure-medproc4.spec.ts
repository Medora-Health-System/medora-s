import { ForbiddenException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import {
  assertAckOrStartActor,
  assertCompleteActorForItem,
} from "../common/workflow/order-item-action-guards.util";

function careItem(enterpriseProcedureId: string | null) {
  return {
    catalogItemType: "CARE",
    enterpriseProcedureId,
    medicationFulfillmentIntent: null,
  } as Parameters<typeof assertAckOrStartActor>[0];
}

describe("MEDPROC.4 enterprise procedure execution guards", () => {
  it("allows provider acknowledgement for intubation", () => {
    expect(() =>
      assertAckOrStartActor(careItem("endotracheal_intubation"), [RoleCode.PROVIDER])
    ).not.toThrow();
  });

  it("allows provider completion for intubation", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("endotracheal_intubation"), [RoleCode.PROVIDER])
    ).not.toThrow();
  });

  it("rejects RN completion for provider-only intubation", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("endotracheal_intubation"), [RoleCode.RN])
    ).toThrow(ForbiddenException);
  });

  it("allows RN completion for foley catheter", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("foley_catheter"), [RoleCode.RN])
    ).not.toThrow();
  });

  it("allows RN proxy completion for nebulizer (RT catalog role)", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("nebulizer_treatment"), [RoleCode.RN])
    ).not.toThrow();
  });

  it("rejects provider-only completion for foley", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("foley_catheter"), [RoleCode.PROVIDER])
    ).toThrow(ForbiddenException);
  });

  it("allows LAB and RN completion for specimen collection", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("blood_draw_specimen_collection"), [RoleCode.LAB])
    ).not.toThrow();
    expect(() =>
      assertCompleteActorForItem(careItem("blood_draw_specimen_collection"), [RoleCode.RN])
    ).not.toThrow();
  });

  it("rejects unauthorized pharmacy role for enterprise procedure completion", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("glucose_check"), [RoleCode.PHARMACY])
    ).toThrow(ForbiddenException);
  });

  it("legacy CARE without enterpriseProcedureId keeps RN completion path", () => {
    expect(() => assertCompleteActorForItem(careItem(null), [RoleCode.RN])).not.toThrow();
    expect(() => assertCompleteActorForItem(careItem(null), [RoleCode.PROVIDER])).toThrow(
      ForbiddenException
    );
  });
});
