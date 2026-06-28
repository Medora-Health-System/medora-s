import { Test, TestingModule } from "@nestjs/testing";
import { CANONICAL_CARE_PROCEDURE_CATEGORIES } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProcedureCatalogService } from "./procedure-catalog.service";

describe("ProcedureCatalogService", () => {
  let service: ProcedureCatalogService;
  const prisma = {
    catalogProcedure: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcedureCatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProcedureCatalogService);
  });

  it("returns ranked CARE_PROCEDURE search items capped at limit", async () => {
    prisma.catalogProcedure.findMany.mockResolvedValue(
      Array.from({ length: 40 }, (_, index) => ({
        id: `uuid-${index}`,
        code: `code_${index}`,
        name: `Procedure ${index}`,
        displayNameEn: `Procedure ${index}`,
        displayNameFr: `Procédure ${index}`,
        category: "NURSING_PATIENT_CARE",
        executionRoleCategory: "NURSING",
        searchText: "procedure",
        isActive: true,
        orderable: true,
        sortPriority: index,
        requiresProviderOrder: false,
        nursingProtocolAllowed: true,
        requiresClinicalNote: false,
        aliases: [],
      }))
    );

    const result = await service.search({ q: "procedure", limit: 25 });
    expect(result.items.length).toBeLessThanOrEqual(25);
    expect(prisma.catalogProcedure.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 75 })
    );
  });

  it("returns ranked CARE_PROCEDURE search items", async () => {
    prisma.catalogProcedure.findMany.mockResolvedValue([
      {
        id: "uuid-ekg",
        code: "ekg_ecg",
        name: "EKG / ECG 12-Lead",
        displayNameEn: "EKG / ECG 12-Lead",
        displayNameFr: "ECG 12 dérivations",
        category: "MONITORING",
        executionRoleCategory: "MULTI_ROLE",
        searchText: "ekg ecg 12 lead",
        isActive: true,
        orderable: true,
        sortPriority: 10,
        requiresProviderOrder: false,
        nursingProtocolAllowed: true,
        requiresClinicalNote: true,
        documentationTemplateId: "EKG",
        aliases: [{ alias: "ecg" }, { alias: "12 lead" }],
      },
    ]);

    const result = await service.search({ q: "ecg", limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.type).toBe("CARE_PROCEDURE");
    expect(result.items[0]?.code).toBe("ekg_ecg");
    expect(result.items[0]?.metadata?.category).toBe("MONITORING");
  });

  it("lists all canonical categories", () => {
    const categories = service.listCategories("en");
    expect(categories).toHaveLength(CANONICAL_CARE_PROCEDURE_CATEGORIES.length);
    expect(categories.some((entry) => entry.id === "CONSULTS")).toBe(true);
  });
});
