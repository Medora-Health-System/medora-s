import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import {
  applyMedicationAdministrationBillingResolutionToCaptureItem,
  resolveMedicationAdministrationBilling,
} from "./medication-administration-billing-resolve.util";

function buildPrismaMock(overrides: {
  marAction?: string | null;
  billingCodeDefault?: string | null;
  catalogCode?: string;
  ndc11Snapshot?: string | null;
  billingCatalog?: { code: string; system: string; description: string; billClass: string } | null;
  packageProfile?: { hcpcsCodeSuggested: string; requiresManualReview?: boolean; ndc11?: string } | null;
}) {
  const catalogId = "cat-1";
  const adm = {
    id: "adm-1",
    facilityId: "fac-1",
    encounterId: "enc-1",
    patientId: "pat-1",
    marAction: overrides.marAction ?? "administered",
    notes: null,
    route: "intraveineuse",
    medicationLabelSnapshot: "Morphine",
    ndc11Snapshot: overrides.ndc11Snapshot ?? null,
    ndcDisplaySnapshot: null,
    medicationPackageId: null,
    orderItemId: "oi-1",
    infusionPhase: null,
    infusionSessionKey: null,
    administeredAt: new Date("2026-06-02T10:00:00.000Z"),
    effectiveAdministeredAt: null,
    orderItem: {
      catalogItemType: "MEDICATION",
      catalogItemId: catalogId,
      manualLabel: null,
      medicationPackageId: null,
      order: { encounterId: "enc-1", patientId: "pat-1" },
    },
  };

  const catalog = {
    id: catalogId,
    code: overrides.catalogCode ?? "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
    name: "Morphine",
    displayNameFr: "Morphine",
    genericName: "Morphine",
    strength: "10 mg/mL",
    dosageForm: "injectable",
    route: "injectable",
    billingCodeDefault:
      overrides.billingCodeDefault !== undefined ? overrides.billingCodeDefault : "J2270",
    ndc11: "06416112701",
    ndcDisplay: "0641-6127-01",
    billingUnitType: "mg",
  };

  const prisma = {
    medicationAdministration: {
      findFirst: jest.fn().mockResolvedValue(adm),
      findMany: jest.fn().mockResolvedValue([]),
    },
    catalogMedication: {
      findUnique: jest.fn().mockResolvedValue(catalog),
    },
    medicationPackage: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.packageProfile
          ? {
              ndc11: overrides.packageProfile.ndc11 ?? null,
              ndcDisplay: null,
              billingProfiles: [
                {
                  hcpcsCodeSuggested: overrides.packageProfile.hcpcsCodeSuggested,
                  hcpcsUnitType: "mg",
                  revenueCodeSuggested: null,
                  requiresManualReview: overrides.packageProfile.requiresManualReview ?? false,
                },
              ],
            }
          : null
      ),
    },
    medicationProduct: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    billingCatalog: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.billingCatalog
          ? {
              code: overrides.billingCatalog.code,
              system: overrides.billingCatalog.system,
              description: overrides.billingCatalog.description,
              billClass: overrides.billingCatalog.billClass,
            }
          : null
      ),
    },
  };

  return { prisma: prisma as unknown as PrismaService, adm, catalog };
}

describe("resolveMedicationAdministrationBilling", () => {
  it("returns null for refused MAR actions", async () => {
    const { prisma } = buildPrismaMock({ marAction: "refused" });
    const result = await resolveMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      medicationAdministrationId: "adm-1",
    });
    expect(result).toBeNull();
  });

  it("prefers catalog billingCodeDefault over BillingCatalog", async () => {
    const { prisma } = buildPrismaMock({
      billingCodeDefault: "J2270",
      billingCatalog: { code: "J9999", system: "HCPCS", description: "Other", billClass: "both" },
    });
    const result = await resolveMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      medicationAdministrationId: "adm-1",
    });
    expect(result?.sourceKind).toBe("CATALOG_BILLING_CODE_DEFAULT");
    expect(result?.hcpcsCode).toBe("J2270");
  });

  it("falls back to BillingCatalog when billingCodeDefault is empty", async () => {
    const { prisma } = buildPrismaMock({
      billingCodeDefault: null,
      billingCatalog: {
        code: "J2270",
        system: "HCPCS",
        description: "Morphine injection",
        billClass: "both",
      },
    });
    const result = await resolveMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      medicationAdministrationId: "adm-1",
    });
    expect(result?.sourceKind).toBe("BILLING_CATALOG_MEDICATION");
    expect(result?.hcpcsCode).toBe("J2270");
  });

  it("includes MAR NDC snapshot when present", async () => {
    const { prisma } = buildPrismaMock({ ndc11Snapshot: "06416112701" });
    const result = await resolveMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      medicationAdministrationId: "adm-1",
    });
    expect(result?.ndc11).toBe("06416112701");
  });

  it("returns manual review when no mapping exists", async () => {
    const { prisma } = buildPrismaMock({
      billingCodeDefault: null,
      billingCatalog: null,
    });
    const result = await resolveMedicationAdministrationBilling(prisma, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      medicationAdministrationId: "adm-1",
    });
    expect(result?.sourceKind).toBe("MANUAL_REVIEW");
    expect(result?.hcpcsCode).toBeNull();
    expect(result?.manualReviewReason).toMatch(/No HCPCS/);
  });

  it("applies resolution metadata to capture items", () => {
    const item = applyMedicationAdministrationBillingResolutionToCaptureItem(
      { status: "needs_review" } as BillingCaptureItem,
      {
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
        infusionGovernance: {
          infusionBillingCategory: "IV_PUSH",
          infusionStartTime: null,
          infusionStopTime: null,
          infusionDurationMinutes: null,
          suggestedAdministrationCodes: [
            {
              suggestedAdministrationCode: "96374",
              suggestedAdministrationCodeType: "CPT",
              companionCodeSource: "ROUTE_INFERENCE",
              manualReviewRequired: true,
              rationale: "IV push readiness",
            },
          ],
          infusionManualReviewReasons: ["PAYER_VERIFICATION_REQUIRED"],
          infusionBillingReady: true,
        },
      }
    );
    expect(item.hcpcsCode).toBe("J2270");
    expect(item.procedureCode).toBe("96374");
    expect(item.infusionBillingCategory).toBe("IV_PUSH");
    expect(item.ndc11).toBe("06416112701");
    expect(item.medicationBillingSource).toBe("CATALOG_BILLING_CODE_DEFAULT");
  });
});
