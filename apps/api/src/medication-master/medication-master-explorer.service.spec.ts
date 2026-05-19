import { ForbiddenException } from "@nestjs/common";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";

describe("MedicationMasterExplorerService", () => {
  const prisma = {
    medicationConcept: { findMany: jest.fn(), findUnique: jest.fn() },
    facilityFormularyItem: { findMany: jest.fn() },
    facility: { findUnique: jest.fn() },
  };

  const service = new MedicationMasterExplorerService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("assertFacilityScope rejects mismatched facility", () => {
    expect(() => service.assertFacilityScope("a", "b")).toThrow(ForbiddenException);
  });

  it("assertFacilityScope allows matching facility", () => {
    expect(() => service.assertFacilityScope("same", "same")).not.toThrow();
  });

  it("search returns empty when no concepts match", async () => {
    prisma.medicationConcept.findMany = jest.fn().mockResolvedValue([]);
    prisma.facilityFormularyItem.findMany = jest.fn().mockResolvedValue([]);

    const result = await service.search({
      q: "acetaminophen",
      limit: 10,
      offset: 0,
      activeOnly: undefined,
      ndcStatus: "any",
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(prisma.medicationConcept.findMany).toHaveBeenCalled();
  });

  it("getConceptDetail returns readOnly with validation warnings", async () => {
    prisma.medicationConcept.findUnique = jest.fn().mockResolvedValue({
      id: "concept-1",
      code: "C-EPINEPH",
      genericName: "Epinephrine",
      displayName: "Épinéphrine",
      isActive: true,
      rxNormConceptId: null,
      therapeuticClass: null,
      safetyProfile: null,
      searchAliases: [],
      products: [
        {
          id: "prod-1",
          code: "P-1",
          strengthDisplay: "1 mg/mL",
          dosageForm: "INJ",
          administrationType: "INFUSION",
          billingClass: "THERAPEUTIC",
          isActive: true,
          legacyCatalogMedicationId: null,
          defaultRoute: null,
          administrationProfile: null,
          infusionProfile: null,
          searchAliases: [],
          packages: [
            {
              id: "pkg-1",
              code: "PKG-1",
              packageDescription: "Ampoule",
              packageType: "AMPULE",
              ndc11: null,
              ndcDisplay: null,
              isDefaultForProduct: true,
              billingProfiles: [],
              facilityFormularyItems: [],
            },
          ],
        },
      ],
    });

    const detail = await service.getConceptDetail("concept-1", "fac-1");

    expect(detail.readOnly).toBe(true);
    expect(detail.validationWarnings.length).toBeGreaterThan(0);
    expect(detail.validationWarnings.some((w) => w.code === "MISSING_SAFETY_PROFILE")).toBe(true);
    expect(detail.validationWarnings.some((w) => w.code === "MISSING_NDC")).toBe(true);
    expect(detail.concept.conceptAliases).toEqual([]);
  });
});
