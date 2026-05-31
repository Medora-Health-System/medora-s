import { describe, expect, it } from "vitest";
import {
  canShowOrderLineCancelControl,
  formatOrderCancelErrorMessage,
  hasOrderLineCancelAttemptRole,
  resolveOrderCancelErrorKey,
  shouldShowErOrderLineCancelAction,
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

describe("shouldShowErOrderLineCancelAction", () => {
  const orderedLabLine = {
    lifecycleState: "ORDERED",
    status: "PLACED",
    catalogItemType: "LAB_TEST",
  };

  it("shows cancel for PROVIDER on open ORDERED lab line", () => {
    expect(shouldShowErOrderLineCancelAction(["PROVIDER"], orderedLabLine)).toBe(true);
  });

  it("shows cancel for RN on open ORDERED lab line (backend may 403)", () => {
    expect(shouldShowErOrderLineCancelAction(["RN"], orderedLabLine)).toBe(true);
  });

  it("hides cancel when user has no cancel-eligible role", () => {
    expect(shouldShowErOrderLineCancelAction(["FRONT_DESK"], orderedLabLine)).toBe(false);
  });

  it("hides cancel for COMPLETED line", () => {
    expect(
      shouldShowErOrderLineCancelAction(["PROVIDER"], {
        ...orderedLabLine,
        lifecycleState: "COMPLETED",
        status: "COMPLETED",
      })
    ).toBe(false);
  });

  it("hides cancel for IN_PROGRESS line", () => {
    expect(
      shouldShowErOrderLineCancelAction(["PROVIDER"], {
        ...orderedLabLine,
        lifecycleState: "IN_PROGRESS",
        status: "IN_PROGRESS",
      })
    ).toBe(false);
  });

  it("shows cancel for ACKNOWLEDGED line when role allows attempt", () => {
    expect(
      shouldShowErOrderLineCancelAction(["PROVIDER"], {
        ...orderedLabLine,
        lifecycleState: "ACKNOWLEDGED",
        status: "ACKNOWLEDGED",
      })
    ).toBe(true);
  });
});

describe("hasOrderLineCancelAttemptRole", () => {
  it("accepts clinical cancel roles", () => {
    expect(hasOrderLineCancelAttemptRole(["RN"])).toBe(true);
    expect(hasOrderLineCancelAttemptRole(["PROVIDER"])).toBe(true);
    expect(hasOrderLineCancelAttemptRole(["LAB"])).toBe(true);
  });

  it("rejects front desk", () => {
    expect(hasOrderLineCancelAttemptRole(["FRONT_DESK"])).toBe(false);
  });
});

describe("canShowOrderLineCancelControl (strict attribution mirror)", () => {
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

  it("resolves creator from createdByDisplay when orderedBy missing", () => {
    expect(
      canShowOrderLineCancelControl(
        {
          type: "LAB",
          createdByDisplay: { userId: "user-md", name: "Dr Test" },
        },
        baseItem,
        { roles: ["PROVIDER"], currentUserId: "user-md" }
      )
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

  it("hides cancel for RN on provider order they did not create", () => {
    expect(
      canShowOrderLineCancelControl(baseOrder, baseItem, {
        roles: ["RN"],
        currentUserId: "user-rn",
      })
    ).toBe(false);
  });
});
