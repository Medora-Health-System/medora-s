import { MedicationCatalogService } from "./medication-catalog.service";
import {
  listActiveTranche1PilotCatalogCodes,
  listActiveTranche2ProviderOrderingCatalogCodes,
  listActiveAnticoagulationProviderOrderingCatalogCodes,
  listActiveInsulinDiabetesProviderOrderingCatalogCodes,
  listActiveVaccineProviderOrderingCatalogCodes,
  listActiveCriticalCareProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveCardiologyProviderOrderingCatalogCodes,
  listActiveIvFluidsProviderOrderingCatalogCodes,
  listActiveObgynProviderOrderingCatalogCodes,
  listActivePsychiatryProviderOrderingCatalogCodes,
  listActiveGastroenterologyProviderOrderingCatalogCodes,
} from "@medora/shared";

describe("MedicationCatalogService activation gate (19G)", () => {
  const prisma = {
    catalogMedication: { findMany: jest.fn() },
    medicationAlias: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn() },
  };
  const canonicalRead = {
    findCatalogIdsViaCanonicalAlias: jest.fn().mockResolvedValue([]),
    getReadMetadataByCatalogIds: jest.fn().mockResolvedValue(new Map()),
  };
  const activationGovernance = {
    filterProviderSearchCatalogIds: jest.fn(),
  };

  const service = new MedicationCatalogService(
    prisma as never,
    canonicalRead as never,
    activationGovernance as never
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.catalogMedication.findMany.mockResolvedValue([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    canonicalRead.findCatalogIdsViaCanonicalAlias.mockResolvedValue([]);
    canonicalRead.getReadMetadataByCatalogIds.mockResolvedValue(new Map());
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());
  });

  it("excludes canonical-linked catalog rows failing order-search gate", async () => {
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([
        {
          id: "cat-inactive",
          code: "A",
          name: "Acetaminophen",
          genericName: null,
          displayNameEn: null,
          displayNameFr: null,
          strength: "500mg",
          searchText: "acetaminophen",
          isEssential: false,
          sortPriority: 0,
          isActive: true,
        },
        {
          id: "cat-enabled",
          code: "B",
          name: "Ibuprofen",
          genericName: null,
          displayNameEn: null,
          displayNameFr: null,
          strength: "200mg",
          searchText: "ibuprofen",
          isEssential: false,
          sortPriority: 0,
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(
      new Set(["cat-enabled"])
    );

    const res = await service.search("fac-1", { q: "fe", limit: 20 });
    expect(res.items.map((i) => i.id)).toEqual(["cat-enabled"]);
  });

  it("skips order-search activation gate when purpose is documentation", async () => {
    prisma.catalogMedication.findMany.mockResolvedValue([
      {
        id: "cat-inactive",
        code: "A",
        name: "Acetaminophen",
        genericName: null,
        displayNameEn: null,
        displayNameFr: null,
        strength: "500mg",
        searchText: "acetaminophen",
        isEssential: false,
        sortPriority: 0,
        isActive: true,
      },
    ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "fe", limit: 20, purpose: "documentation" });
    expect(res.items.map((i) => i.id)).toEqual(["cat-inactive"]);
    expect(activationGovernance.filterProviderSearchCatalogIds).not.toHaveBeenCalled();
  });

  it("appends certified pilot rows only inside Tranche 1 pilot scope", async () => {
    const pilotCode = listActiveTranche1PilotCatalogCodes()[0] ?? "PILOT_LOW_RISK_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-pilot",
          code: pilotCode,
          name: "Acetaminophen",
          genericName: "Acetaminophen",
          displayNameEn: "Acetaminophen",
          displayNameFr: "Acétaminophène",
          strength: "500 mg",
          searchText: "acetaminophen acetaminophene",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("pilot-facility-1", {
      q: "acetaminophen",
      limit: 20,
      pilotScope: {
        facilityId: "pilot-facility-1",
        providerGroupId: "pilot-provider-group-1",
        roleCodes: ["PROVIDER"],
      },
    });

    expect(res.items.map((i) => i.id)).toEqual(["cat-pilot"]);
    expect(res.items[0]?.code).toBe(pilotCode);
  });

  it("appends certified Tranche 2 provider-ordering rows after activation gate", async () => {
    const tranche2Code = listActiveTranche2ProviderOrderingCatalogCodes()[0] ?? "TRANCHE2_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-tranche2",
          code: tranche2Code,
          name: "Lisinopril",
          genericName: "Lisinopril",
          displayNameEn: "Lisinopril",
          displayNameFr: "Lisinopril",
          strength: "10 mg",
          searchText: "lisinopril",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "lisinopril", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-tranche2"]);
    expect(res.items[0]?.code).toBe(tranche2Code);
  });

  it("appends certified anticoagulation provider-ordering rows after existing activation gates", async () => {
    const anticoagulationCode = listActiveAnticoagulationProviderOrderingCatalogCodes()[0] ?? "ANTICOAG_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-anticoag",
          code: anticoagulationCode,
          name: "Warfarin",
          genericName: "Warfarin",
          displayNameEn: "Warfarin",
          displayNameFr: "Warfarin",
          strength: "5 mg",
          searchText: "warfarin anticoagulant",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "warfarin", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-anticoag"]);
    expect(res.items[0]?.code).toBe(anticoagulationCode);
  });

  it("appends certified insulin/diabetes provider-ordering rows after existing activation gates", async () => {
    const diabetesCode = listActiveInsulinDiabetesProviderOrderingCatalogCodes()[0] ?? "DIABETES_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-diabetes",
          code: diabetesCode,
          name: "Insulin glargine",
          genericName: "Insulin glargine",
          displayNameEn: "Insulin glargine",
          displayNameFr: "Insuline glargine",
          strength: "100 UI/mL",
          searchText: "insulin glargine diabetes",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "glargine", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-diabetes"]);
    expect(res.items[0]?.code).toBe(diabetesCode);
  });

  it("appends certified vaccine provider-ordering rows after existing activation gates", async () => {
    const vaccineCode = listActiveVaccineProviderOrderingCatalogCodes()[0] ?? "VACCINE_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-vaccine",
          code: vaccineCode,
          name: "Tdap vaccine",
          genericName: "Tdap vaccine",
          displayNameEn: "Tdap vaccine",
          displayNameFr: "Vaccin dcaT",
          strength: "0.5 mL",
          searchText: "tdap vaccine tetanus diphtheria pertussis",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "tdap", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-vaccine"]);
    expect(res.items[0]?.code).toBe(vaccineCode);
  });

  it("appends certified critical-care provider-ordering rows after existing activation gates", async () => {
    const criticalCareCode = listActiveCriticalCareProviderOrderingCatalogCodes()[0] ?? "CRITICAL_CARE_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-critical-care",
          code: criticalCareCode,
          name: "Norepinephrine",
          genericName: "Norepinephrine",
          displayNameEn: "Norepinephrine",
          displayNameFr: "Norépinéphrine",
          strength: "8 mg/250 mL",
          searchText: "norepinephrine vasopressor infusion critical care",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "norepinephrine", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-critical-care"]);
    expect(res.items[0]?.code).toBe(criticalCareCode);
  });

  it("appends certified neurology provider-ordering rows after existing activation gates", async () => {
    const neurologyCode = listActiveNeurologyProviderOrderingCatalogCodes()[0] ?? "NEUROLOGY_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-neurology",
          code: neurologyCode,
          name: "Levetiracetam",
          genericName: "Levetiracetam",
          displayNameEn: "Levetiracetam",
          displayNameFr: "Lévétiracétam",
          strength: "500 mg",
          searchText: "levetiracetam keppra seizure neurology",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "levetiracetam", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-neurology"]);
    expect(res.items[0]?.code).toBe(neurologyCode);
  });

  it("appends certified infectious-disease provider-ordering rows after existing activation gates", async () => {
    const infectiousDiseaseCode = listActiveInfectiousDiseaseProviderOrderingCatalogCodes()[0] ?? "ID_MED";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-infectious-disease",
          code: infectiousDiseaseCode,
          name: "Daptomycin",
          genericName: "Daptomycin",
          displayNameEn: "Daptomycin",
          displayNameFr: "Daptomycine",
          strength: "500 mg",
          searchText: "daptomycin infectious disease antibiotic",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "daptomycin", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-infectious-disease"]);
    expect(res.items[0]?.code).toBe(infectiousDiseaseCode);
  });

  it("appends certified cardiology provider-ordering rows after existing activation gates", async () => {
    const cardiologyCode = listActiveCardiologyProviderOrderingCatalogCodes()[0] ?? "AMIODARONE_150MG_3ML_IV";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-cardiology",
          code: cardiologyCode,
          name: "Amiodarone",
          genericName: "Amiodarone",
          displayNameEn: "Amiodarone",
          displayNameFr: "Amiodarone",
          strength: "150 mg/3 mL",
          searchText: "amiodarone antiarrhythmia cardiology",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "amiodarone", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-cardiology"]);
    expect(res.items[0]?.code).toBe(cardiologyCode);
  });

  it("appends certified IV fluids provider-ordering rows after existing activation gates", async () => {
    const ivFluidsCode = listActiveIvFluidsProviderOrderingCatalogCodes()[0] ?? "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-iv-fluids",
          code: ivFluidsCode,
          name: "Normal saline",
          genericName: "Normal saline",
          displayNameEn: "Normal saline",
          displayNameFr: "Chlorure de sodium",
          strength: "0.9% 1000 mL",
          searchText: "normal saline ns iv fluid",
          isEssential: true,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "normal saline", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-iv-fluids"]);
    expect(res.items[0]?.code).toBe(ivFluidsCode);
  });

  it("appends certified OBGYN provider-ordering rows after existing activation gates", async () => {
    const obgynCode = listActiveObgynProviderOrderingCatalogCodes()[0] ?? "OXYTOCIN_10_UNITS_ML_INJECTABLE_INTRAVEINEUSE";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-obgyn",
          code: obgynCode,
          name: "Oxytocin",
          genericName: "Oxytocin",
          displayNameEn: "Oxytocin",
          displayNameFr: "Ocytocine",
          strength: "10 units/mL",
          searchText: "oxytocin pitocin ob labor",
          isEssential: true,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "oxytocin", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-obgyn"]);
    expect(res.items[0]?.code).toBe(obgynCode);
  });

  it("appends certified psychiatry provider-ordering rows after existing activation gates", async () => {
    const psychiatryCode = listActivePsychiatryProviderOrderingCatalogCodes()[0] ?? "HALOPERIDOL_2_MG_COMPRIME_ORALE";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-psychiatry",
          code: psychiatryCode,
          name: "Haloperidol",
          genericName: "Haloperidol",
          displayNameEn: "Haloperidol",
          displayNameFr: "Halopéridol",
          strength: "2 mg",
          searchText: "haloperidol antipsychotic psychiatry",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "haloperidol", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-psychiatry"]);
    expect(res.items[0]?.code).toBe(psychiatryCode);
  });

  it("appends certified gastroenterology provider-ordering rows after existing activation gates", async () => {
    const gastroCode = listActiveGastroenterologyProviderOrderingCatalogCodes()[0] ?? "LACTULOSE_10_G_PER_15_ML_SIROP_ORAL";
    prisma.catalogMedication.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "cat-gastro",
          code: gastroCode,
          name: "Lactulose",
          genericName: "Lactulose",
          displayNameEn: "Lactulose",
          displayNameFr: "Lactulose",
          strength: "10 g/15 mL",
          searchText: "lactulose hepatic encephalopathy",
          isEssential: false,
          sortPriority: 0,
          isActive: false,
        },
      ]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("fac-1", { q: "lactulose", limit: 20 });

    expect(res.items.map((i) => i.id)).toEqual(["cat-gastro"]);
    expect(res.items[0]?.code).toBe(gastroCode);
  });

  it("does not append certified pilot rows outside pilot scope", async () => {
    prisma.catalogMedication.findMany.mockResolvedValue([]);
    prisma.medicationAlias.findMany.mockResolvedValue([]);
    activationGovernance.filterProviderSearchCatalogIds.mockResolvedValue(new Set());

    const res = await service.search("other-facility", {
      q: "acetaminophen",
      limit: 20,
      pilotScope: {
        facilityId: "other-facility",
        providerGroupId: "pilot-provider-group-1",
        roleCodes: ["PROVIDER"],
      },
    });

    expect(res.items).toEqual([]);
    expect(prisma.catalogMedication.findMany).toHaveBeenCalledTimes(13);
  });
});
