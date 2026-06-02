import type { PrismaService } from "../prisma/prisma.service";
import { enrichBillingCaptureItem } from "./billing-capture.enrichment";
import { tryAutoMedicationAdministrationBilling } from "./billing-auto-append.util";

jest.mock("./medication-administration-billing-resolve.util", () => {
  const actual = jest.requireActual("./medication-administration-billing-resolve.util");
  return {
    ...actual,
    resolveMedicationAdministrationBilling: jest.fn(),
  };
});

import { resolveMedicationAdministrationBilling } from "./medication-administration-billing-resolve.util";

const mockedResolve = resolveMedicationAdministrationBilling as jest.MockedFunction<
  typeof resolveMedicationAdministrationBilling
>;

describe("medication administration charge capture (M1.4C)", () => {
  beforeEach(() => {
    mockedResolve.mockReset();
  });

  it("enriches MEDICATION_ADMINISTRATION capture with resolver HCPCS and NDC", async () => {
    mockedResolve.mockResolvedValue({
      hcpcsCode: "J2270",
      catalogMapping: {
        code: "J2270",
        system: "HCPCS",
        billClass: "both",
        description: "Morphine",
      },
      ndc11: "06416112701",
      ndcDisplay: "0641-6127-01",
      quantityUnit: "mg",
      revenueCode: null,
      sourceKind: "CATALOG_BILLING_CODE_DEFAULT",
      manualReviewReason: null,
      catalogMedicationCode: "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
      requiresManualReview: false,
      labelFallback: "Morphine",
    });

    const db = {} as PrismaService;
    const enriched = await enrichBillingCaptureItem(db, {
      id: "bc-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      sourceType: "MEDICATION_ADMINISTRATION",
      sourceId: "adm-1",
      status: "needs_review",
      createdAt: new Date(0).toISOString(),
    });

    expect(enriched.hcpcsCode).toBe("J2270");
    expect(enriched.ndc11).toBe("06416112701");
    expect(enriched.medicationBillingSource).toBe("CATALOG_BILLING_CODE_DEFAULT");
    expect(enriched.catalogEnriched).toBe(true);
  });

  it("does not enrich when resolver returns null (non-administered)", async () => {
    mockedResolve.mockResolvedValue(null);
    const db = {} as PrismaService;
    const enriched = await enrichBillingCaptureItem(db, {
      id: "bc-2",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      sourceType: "MEDICATION_ADMINISTRATION",
      sourceId: "adm-refused",
      status: "needs_review",
      createdAt: new Date(0).toISOString(),
    });
    expect(enriched.hcpcsCode).toBeUndefined();
  });

  it("tryAutoMedicationAdministrationBilling skips when resolver returns null", async () => {
    mockedResolve.mockResolvedValue(null);
    const prisma = {
      medicationAdministration: { findFirst: jest.fn().mockResolvedValue({ encounterId: "enc-1" }) },
      billingEvent: { findUnique: jest.fn() },
    } as unknown as PrismaService;

    await tryAutoMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      medicationAdministrationId: "adm-refused",
    });

    expect(prisma.billingEvent.findUnique).not.toHaveBeenCalled();
  });

  it("tryAutoMedicationAdministrationBilling creates catalog line when mapped", async () => {
    mockedResolve.mockResolvedValue({
      hcpcsCode: "J2270",
      catalogMapping: {
        code: "J2270",
        system: "HCPCS",
        billClass: "both",
        description: "Morphine",
      },
      ndc11: null,
      ndcDisplay: null,
      quantityUnit: null,
      revenueCode: null,
      sourceKind: "BILLING_CATALOG_MEDICATION",
      manualReviewReason: null,
      catalogMedicationCode: "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
      requiresManualReview: false,
      labelFallback: "Morphine",
    });

    const findUnique = jest.fn().mockResolvedValue(null);
    const appendSpy = jest.fn().mockResolvedValue(undefined);
    jest.doMock("./billing-capture.append.util", () => ({
      appendBillingCaptureCandidate: appendSpy,
    }));

    const prisma = {
      medicationAdministration: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ encounterId: "enc-1" })
          .mockResolvedValueOnce({
            id: "adm-1",
            encounterId: "enc-1",
            patientId: "pat-1",
            route: "IV push",
            orderItem: { catalogItemId: "cat-1", order: {} },
          }),
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({ route: "intraveineuse" }),
      },
      billingEvent: { findUnique },
      encounter: {
        findFirst: jest.fn().mockResolvedValue({ id: "enc-1", billingCaptureJson: {}, version: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;

    await tryAutoMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      medicationAdministrationId: "adm-1",
    });

    expect(findUnique).toHaveBeenCalled();
  });
});
