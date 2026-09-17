import { NotFoundException } from "@nestjs/common";
import { isOptionalPortalStorageError } from "./portal-storage.util";

describe("isOptionalPortalStorageError", () => {
  it("treats missing known portal/release tables as optional storage", () => {
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: 'relation "PatientPortalMessageThread" does not exist',
      }),
    ).toBe(true);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: "Raw query failed",
        meta: { code: "42P01", message: 'relation "PatientPortalMessage" does not exist' },
      }),
    ).toBe(true);
    expect(
      isOptionalPortalStorageError({
        code: "P2021",
        message: "The table `PatientDiagnosticResultRelease` does not exist in the current database.",
      }),
    ).toBe(true);
    expect(
      isOptionalPortalStorageError({
        code: "42P01",
        message: 'relation "PatientPortalAccount" does not exist',
      }),
    ).toBe(true);
    expect(
      isOptionalPortalStorageError({
        code: "P2021",
        message: "The table does not exist",
        meta: { table: "PatientPortalLink" },
      }),
    ).toBe(true);
  });

  it("does not swallow unrelated P2010, syntax, permission, or connectivity failures", () => {
    expect(isOptionalPortalStorageError(new NotFoundException("Patient not found"))).toBe(false);
    expect(isOptionalPortalStorageError(new Error("connection refused"))).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: "Raw query failed. Code: `42601`. Message: `syntax error at or near SELECT`",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: 'permission denied for table "PatientPortalMessageThread"',
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: "malformed SQL in PatientPortalMessageThread lookup",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: "query timeout while reading PatientPortalMessage",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P1001",
        message: "Can't reach database server",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2024",
        message: "Timed out fetching a new connection from the connection pool",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: 'relation "Encounter" does not exist',
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2010",
        message: "Raw query failed",
      }),
    ).toBe(false);
    expect(
      isOptionalPortalStorageError({
        code: "P2021",
        message: "The table `Encounter` does not exist in the current database.",
      }),
    ).toBe(false);
  });
});
