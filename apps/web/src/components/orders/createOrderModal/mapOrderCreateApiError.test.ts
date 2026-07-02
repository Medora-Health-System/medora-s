import { describe, expect, it } from "vitest";
import {
  extractRawOrderCreateErrorMessage,
  mapOrderCreateApiError,
  translateOrderCreateMessage,
} from "./mapOrderCreateApiError";

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

  it("preserves ASCII backend validation text for English UI", () => {
    expect(
      translateOrderCreateMessage(
        "Verbal order attestation is required for RN standing orders.",
        "en"
      )
    ).toBe("Verbal order attestation is required for RN standing orders.");
  });

  it("maps duplicate active catalog errors from French API text", () => {
    expect(
      translateOrderCreateMessage(
        "Une ligne catalogue identique est déjà en cours pour cette consultation (laboratoire, imagerie ou médicament).",
        "en"
      )
    ).toContain("identical catalog line");
  });

  it("extracts nested API body before generic fallback", () => {
    const raw = extractRawOrderCreateErrorMessage({
      message: "Something went wrong.",
      body: { message: "Invalid uuid", statusCode: 400 },
    });
    expect(raw).toBe("Invalid uuid");
    expect(mapOrderCreateApiError({ message: "Something went wrong.", body: { message: "Invalid uuid" } }, (key) => key, "en")).toContain(
      "catalog item id"
    );
  });

  it("falls back to generic copy when no detail is available", () => {
    const message = mapOrderCreateApiError(new Error(""), (key) => key, "en");
    expect(message).toBe("createOrderModal.mapOrderCreateError");
  });
});
