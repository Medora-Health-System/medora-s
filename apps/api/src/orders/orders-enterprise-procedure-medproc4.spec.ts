import { ForbiddenException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import {
  assertAckOrStartActor,
  assertCompleteActorForItem,
} from "../common/workflow/order-item-action-guards.util";

const FREESTANDING_ER = { facilityType: "FREESTANDING_ER" as const };
const HOSPITAL = { facilityType: "HOSPITAL" as const };

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

  it("allows LAB and RN completion for specimen collection at freestanding ER", () => {
    expect(() =>
      assertCompleteActorForItem(
        careItem("blood_draw_specimen_collection"),
        [RoleCode.LAB],
        FREESTANDING_ER
      )
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

describe("MEDUI.ED.PROCEDURE.TECH.1 freestanding ER technician procedure guards", () => {
  it("allows LAB ack → start → complete for EKG at freestanding ER", () => {
    const item = careItem("ekg_ecg");
    expect(() =>
      assertAckOrStartActor(item, [RoleCode.LAB], FREESTANDING_ER)
    ).not.toThrow();
    expect(() =>
      assertCompleteActorForItem(item, [RoleCode.LAB], FREESTANDING_ER)
    ).not.toThrow();
  });

  it("allows RADIOLOGY ack → complete for EKG at freestanding ER", () => {
    const item = careItem("ekg_ecg");
    expect(() =>
      assertAckOrStartActor(item, [RoleCode.RADIOLOGY], FREESTANDING_ER)
    ).not.toThrow();
    expect(() =>
      assertCompleteActorForItem(item, [RoleCode.RADIOLOGY], FREESTANDING_ER)
    ).not.toThrow();
  });

  it("blocks LAB EKG workflow at hospital facility", () => {
    const item = careItem("ekg_ecg");
    expect(() => assertAckOrStartActor(item, [RoleCode.LAB], HOSPITAL)).toThrow(ForbiddenException);
    expect(() =>
      assertCompleteActorForItem(item, [RoleCode.LAB], HOSPITAL)
    ).toThrow(ForbiddenException);
  });

  it("blocks LAB from foley at freestanding ER", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("foley_catheter"), [RoleCode.LAB], FREESTANDING_ER)
    ).toThrow(ForbiddenException);
  });

  it("blocks RADIOLOGY from wound care at freestanding ER", () => {
    expect(() =>
      assertCompleteActorForItem(careItem("wound_care"), [RoleCode.RADIOLOGY], FREESTANDING_ER)
    ).toThrow(ForbiddenException);
  });

  it("blocks LAB from IV fluids setup at freestanding ER", () => {
    expect(() =>
      assertAckOrStartActor(careItem("iv_fluids_setup"), [RoleCode.LAB], FREESTANDING_ER)
    ).toThrow(ForbiddenException);
  });
});
