import { describe, expect, it } from "vitest";
import {
  canShowOrderLineCancelControl,
  formatOrderCancelErrorMessage,
  resolveOrderCancelErrorKey,
} from "./orderCancelErrors";

describe("resolveOrderCancelErrorKey", () => {
  it("maps 403 / forbidden to permission key", () => {
    expect(resolveOrderCancelErrorKey("Droits insuffisants pour annuler cette ligne.", 403)).toBe(
      "erEmergencyOrders.cancelErrorForbidden"
    );
  });

  it("maps 409 / completed state to conflict key", () => {
    expect(
      resolveOrderCancelErrorKey("Cette commande ne peut plus être annulée car elle est déjà réalisée.", 409)
    ).toBe("erEmergencyOrders.cancelErrorConflict");
  });

  it("maps missing reason to required key", () => {
    expect(resolveOrderCancelErrorKey("Le motif d'annulation est requis.", 400)).toBe(
      "erEmergencyOrders.cancelErrorReasonRequired"
    );
  });
});

describe("formatOrderCancelErrorMessage", () => {
  const tr = (key: string) =>
    (
      ({
        "erEmergencyOrders.cancelErrorForbidden":
          "Vous n'avez pas l'autorisation d'annuler cette commande.",
        "erEmergencyOrders.cancelErrorConflict":
          "Cette commande ne peut plus être annulée car elle a déjà été reçue ou réalisée.",
        "erEmergencyOrders.cancelErrorReasonRequired": "Le motif d'annulation est requis.",
        "erEmergencyOrders.cancelErrorGeneric": "Impossible d'annuler cette commande.",
      }) as Record<string, string>
    )[key] ?? key;

  it("returns French permission message for 403", () => {
    expect(formatOrderCancelErrorMessage("Forbidden", tr, 403)).toContain("autorisation");
  });
});

describe("canShowOrderLineCancelControl", () => {
  const baseOrder = {
    type: "LAB",
    orderedBy: "user-md",
    source: "PROVIDER_ORDER",
  };
  const baseItem = {
    lifecycleState: "ORDERED",
    status: "PLACED",
    catalogItemType: "LAB_TEST",
  };

  it("shows cancel for assigned provider on open lab line", () => {
    expect(
      canShowOrderLineCancelControl(baseOrder, baseItem, {
        roles: ["PROVIDER"],
        currentUserId: "user-md",
        physicianAssignedUserId: "user-md",
      })
    ).toBe(true);
  });

  it("hides cancel for completed line", () => {
    expect(
      canShowOrderLineCancelControl(baseOrder, { ...baseItem, status: "COMPLETED", lifecycleState: "COMPLETED" }, {
        roles: ["PROVIDER"],
        currentUserId: "user-md",
      })
    ).toBe(false);
  });

  it("shows cancel for RN creator on ORDERED line", () => {
    expect(
      canShowOrderLineCancelControl(
        { ...baseOrder, orderedBy: "user-rn" },
        baseItem,
        { roles: ["RN"], currentUserId: "user-rn" }
      )
    ).toBe(true);
  });

  it("hides cancel for RN on provider order they did not create", () => {
    expect(
      canShowOrderLineCancelControl(baseOrder, baseItem, {
        roles: ["RN"],
        currentUserId: "user-rn",
      })
    ).toBe(false);
  });
});
