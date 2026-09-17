import { NotFoundException } from "@nestjs/common";
import { isOptionalPortalStorageError } from "./portal-storage.util";

describe("isOptionalPortalStorageError", () => {
  it("treats missing portal message tables as optional storage", () => {
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: 'relation "PatientPortalMessageThread" does not exist',
      }),
    ).toBe(true);
    expect(isOptionalPortalStorageError({ code: "P2021", message: "The table does not exist" })).toBe(true);
  });

  it("does not swallow HTTP exceptions or unrelated failures", () => {
    expect(isOptionalPortalStorageError(new NotFoundException("Patient not found"))).toBe(false);
    expect(isOptionalPortalStorageError(new Error("connection refused"))).toBe(false);
  });
});
