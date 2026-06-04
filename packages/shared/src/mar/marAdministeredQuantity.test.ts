import { describe, expect, it } from "vitest";
import {
  formatMarModalDefaultAdministeredQuantity,
  MAR_ADMINISTERED_QUANTITY_REQUIRED_CODE,
  resolveMarAdministeredQuantityForCreate,
  validateMarAdministeredQuantityRequired,
} from "./marAdministeredQuantity.js";

describe("marAdministeredQuantity (M1.7B.7E)", () => {
  it("defaults administered quantity from ordered quantity when explicit absent", () => {
    expect(
      resolveMarAdministeredQuantityForCreate({
        marAction: "administered",
        explicitQuantity: null,
        orderedQuantity: 1,
      })
    ).toBe(1);
  });

  it("prefers explicit administered quantity over ordered quantity", () => {
    expect(
      resolveMarAdministeredQuantityForCreate({
        marAction: "administered",
        explicitQuantity: 2,
        orderedQuantity: 1,
      })
    ).toBe(2);
  });

  it("does not require administered quantity for refused action", () => {
    expect(
      validateMarAdministeredQuantityRequired({
        marAction: "refused",
        administeredQuantity: null,
      }).ok
    ).toBe(true);
  });

  it("requires administered quantity for administered action when both absent", () => {
    const result = validateMarAdministeredQuantityRequired({
      marAction: "administered",
      administeredQuantity: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(MAR_ADMINISTERED_QUANTITY_REQUIRED_CODE);
    }
  });

  it("formats modal default from ordered quantity", () => {
    expect(formatMarModalDefaultAdministeredQuantity(1)).toBe("1");
    expect(formatMarModalDefaultAdministeredQuantity(null)).toBe("");
  });
});
