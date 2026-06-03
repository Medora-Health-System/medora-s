import { Prisma } from "@prisma/client";
import {
  isPrismaSchemaResourceMissingError,
  loadLatestPharmacyVerificationByOrderItemIdSafe,
  loadPharmacyVerificationDetailsByOrderItemIdSafe,
} from "./pharmacy-verification-enrichment.util";

describe("pharmacy-verification-enrichment.util (M1.7A.7)", () => {
  const tableMissingError = () =>
    new Prisma.PrismaClientKnownRequestError(
      "The table `public.PharmacyVerification` does not exist in the current database.",
      { code: "P2021", clientVersion: "test" }
    );

  it("isPrismaSchemaResourceMissingError detects P2021 table missing", () => {
    expect(isPrismaSchemaResourceMissingError(tableMissingError())).toBe(true);
  });

  it("loadLatestPharmacyVerificationByOrderItemIdSafe returns empty map when table missing", async () => {
    const prisma = {
      pharmacyVerification: {
        findMany: jest.fn().mockRejectedValue(tableMissingError()),
      },
    };
    const out = await loadLatestPharmacyVerificationByOrderItemIdSafe(
      prisma as never,
      ["item-1"]
    );
    expect(out.size).toBe(0);
  });

  it("loadPharmacyVerificationDetailsByOrderItemIdSafe returns empty map when table missing", async () => {
    const prisma = {
      pharmacyVerification: {
        findMany: jest.fn().mockRejectedValue(tableMissingError()),
      },
    };
    const out = await loadPharmacyVerificationDetailsByOrderItemIdSafe(
      prisma as never,
      ["item-1"]
    );
    expect(out.size).toBe(0);
  });

  it("rethrows non-schema pharmacy verification errors", async () => {
    const prisma = {
      pharmacyVerification: {
        findMany: jest.fn().mockRejectedValue(new Error("connection refused")),
      },
    };
    await expect(
      loadLatestPharmacyVerificationByOrderItemIdSafe(prisma as never, ["item-1"])
    ).rejects.toThrow("connection refused");
  });
});
