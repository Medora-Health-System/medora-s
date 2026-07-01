import { describe, expect, it } from "vitest";
import { mapOrderCreateApiError } from "./mapOrderCreateApiError";

describe("mapOrderCreateApiError", () => {
  it("surfaces structured API validation details", () => {
    const message = mapOrderCreateApiError(
      {
        message: "fallback",
        body: {
          message: "Chaque ligne doit référencer le catalogue ou un libellé manuel.",
          statusCode: 400,
        },
      },
      (key) => key,
      "en"
    );
    expect(message).toContain("catalog");
  });

  it("falls back to generic copy when no detail is available", () => {
    const message = mapOrderCreateApiError(new Error(""), (key) => key, "en");
    expect(message).toBe("createOrderModal.mapOrderCreateError");
  });
});
