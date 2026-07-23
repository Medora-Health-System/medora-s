/**
 * D4A.2.8-HF1 — frontend bootstrap error differentiation (no raw Prisma).
 */
import { describe, expect, it } from "vitest";
import { classifyInpatientBootstrapClientError } from "./inpatientBootstrapClientErrors";

describe("classifyInpatientBootstrapClientError D4A.2.8-HF1", () => {
  it("maps network / no status to NETWORK", () => {
    expect(classifyInpatientBootstrapClientError(new Error("Failed to fetch"))).toBe(
      "NETWORK"
    );
  });

  it("maps 401 / 403 / 404 / 409 / 500", () => {
    expect(classifyInpatientBootstrapClientError({ status: 401 })).toBe("UNAUTHORIZED");
    expect(classifyInpatientBootstrapClientError({ status: 403 })).toBe("FORBIDDEN");
    expect(classifyInpatientBootstrapClientError({ status: 404 })).toBe("NOT_FOUND");
    expect(classifyInpatientBootstrapClientError({ status: 409 })).toBe(
      "ENCOUNTER_TYPE_MISMATCH"
    );
    expect(classifyInpatientBootstrapClientError({ status: 500 })).toBe("SERVER_ERROR");
  });

  it("maps schema codes without exposing Prisma text as category", () => {
    expect(
      classifyInpatientBootstrapClientError({
        status: 503,
        errorCode: "DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE",
        message: "P2022 Encounter.hospitalEpisodeId",
      })
    ).toBe("SCHEMA_COMPATIBILITY");
    const category = classifyInpatientBootstrapClientError({
      status: 500,
      message: "Invalid `prisma.encounter.findFirst()` invocation",
      errorCode: "SCHEMA_COMPATIBILITY",
    });
    expect(category).toBe("SCHEMA_COMPATIBILITY");
    expect(category).not.toMatch(/prisma|P2022/i);
  });
});
