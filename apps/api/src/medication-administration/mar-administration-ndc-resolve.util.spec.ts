import { resolveMarNdcSnapshotFromOrderLine } from "./mar-administration-ndc-resolve.util";

describe("resolveMarNdcSnapshotFromOrderLine", () => {
  it("returns normalized input NDC when provided", async () => {
    const prisma = {} as never;
    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      normalizedInputNdc: { ok: true, ndc11: "12345678901", ndcDisplay: "12345-6789-01" },
    });
    expect(result).toEqual({ ndc11: "12345678901", ndcDisplay: "12345-6789-01" });
  });

  it("falls back to catalog NDC when input absent", async () => {
    const prisma = {} as never;
    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      catalogMedication: { ndc11: "55150011801", ndcDisplay: "55150-0118-01" },
    });
    expect(result.ndc11).toBe("55150011801");
  });

  it("resolves NDC from order medication package when catalog lacks NDC", async () => {
    const prisma = {
      medicationPackage: {
        findFirst: jest.fn().mockResolvedValue({
          ndc11: "55150011801",
          ndcDisplay: "55150-0118-01",
        }),
      },
    } as never;
    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      orderItem: { medicationPackageId: "pkg-ondansetron" },
      catalogMedication: { ndc11: null, ndcDisplay: null },
    });
    expect(result).toEqual({ ndc11: "55150011801", ndcDisplay: "55150-0118-01" });
  });

  it("resolves NDC from product default package via legacy catalog id", async () => {
    const packageFindFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: "pkg-default" })
      .mockResolvedValueOnce({ ndc11: "00000500068", ndcDisplay: "00000-5000-68" });
    const prisma = {
      medicationPackage: { findFirst: packageFindFirst },
      medicationProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: "prod-1" }),
      },
    } as unknown as import("../prisma/prisma.service").PrismaService;

    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      orderItem: { catalogItemId: "cat-ondansetron" },
      catalogMedication: { id: "cat-ondansetron", ndc11: null, ndcDisplay: null },
    });
    expect(result.ndc11).toBe("00000500068");
  });

  it("resolves NDC from product default package via explicit medicationProductId (M1.7B.7B)", async () => {
    const packageFindFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: "pkg-default-prod" })
      .mockResolvedValueOnce({ ndc11: "77777777701", ndcDisplay: "77777-7777-01" });
    const prisma = {
      medicationPackage: { findFirst: packageFindFirst },
      medicationProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: "prod-explicit" }),
      },
    } as unknown as import("../prisma/prisma.service").PrismaService;

    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      orderItem: { medicationProductId: "prod-explicit", medicationPackageId: null },
      catalogMedication: { ndc11: null, ndcDisplay: null },
    });
    expect(result).toEqual({ ndc11: "77777777701", ndcDisplay: "77777-7777-01" });
  });

  it("returns null when no NDC exists anywhere (M1.7B.7B priority 5)", async () => {
    const prisma = {
      medicationPackage: { findFirst: jest.fn().mockResolvedValue(null) },
      medicationProduct: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as import("../prisma/prisma.service").PrismaService;

    const result = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      orderItem: { medicationPackageId: null, medicationProductId: null, catalogItemId: "cat-none" },
      catalogMedication: { id: "cat-none", ndc11: null, ndcDisplay: null },
    });
    expect(result).toEqual({ ndc11: null, ndcDisplay: null });
  });

  it("follows exact NDC priority chain without silent overwrite (M1.7B.7B)", async () => {
    const packageFindFirst = jest.fn().mockResolvedValue({
      ndc11: "33333333301",
      ndcDisplay: "33333-3333-01",
    });
    const prisma = {
      medicationPackage: { findFirst: packageFindFirst },
      medicationProduct: { findFirst: jest.fn() },
    } as unknown as import("../prisma/prisma.service").PrismaService;

    const userInput = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      normalizedInputNdc: { ok: true, ndc11: "11111111111", ndcDisplay: "11111-1111-11" },
      catalogMedication: { ndc11: "22222222222", ndcDisplay: "22222-2222-22" },
      orderItem: { medicationPackageId: "pkg-1" },
    });
    expect(userInput.ndc11).toBe("11111111111");

    const catalogOnly = await resolveMarNdcSnapshotFromOrderLine({} as never, {
      catalogMedication: { ndc11: "22222222222", ndcDisplay: "22222-2222-22" },
      orderItem: { medicationPackageId: "pkg-1" },
    });
    expect(catalogOnly.ndc11).toBe("22222222222");

    const packageOnly = await resolveMarNdcSnapshotFromOrderLine(prisma, {
      catalogMedication: { ndc11: null, ndcDisplay: null },
      orderItem: { medicationPackageId: "pkg-1" },
    });
    expect(packageOnly.ndc11).toBe("33333333301");
  });
});
