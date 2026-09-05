import { PrismaClient } from "@prisma/client";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
  evaluateIcd10MultilingualCertification,
  icd10MultilingualCertificationExitCode,
  resolveIcd10DiagnosisDisplay,
  resolveIcd10SearchHitDisplay,
} from "@medora/shared";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "./icd10-catalog-search.query";
import { collectIcd10MultilingualCertification } from "../../prisma/icd/certify-icd10-multilingual";
import { seedGovernedIcd10Terminology } from "../../prisma/icd/seed-icd10-governed-terminology";
import { P21_FIXTURE_RELEASE, P21_PRIOR_RELEASE, seedIcd10P21Fixture } from "../../prisma/icd/seed-icd10-p21-fixture";
import { recomputeIcd10EffectiveClinicianLabel } from "./icd10-terminology-effective";

const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
const runDb = dbUrl.includes("medora_trilang_p21");
const describeDb = runDb ? describe : describe.skip;

describeDb("MEDUI.TRILANG.DX.P2.1 disposable database certification", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("migrates fixture, seeds 89 terms, search/resolver/safety, and rejects cross-release attach", async () => {
    const fixture = await seedIcd10P21Fixture(prisma);
    expect(fixture.fixtureCount).toBeGreaterThan(10);

    const vendorRow = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85" },
    });
    await prisma.icd10DiagnosisTerminology.create({
      data: {
        icd10CatalogId: vendorRow.id,
        codeSystem: vendorRow.codeSystem,
        releaseVersion: vendorRow.releaseVersion,
        code: vendorRow.code,
        normalizedCode: vendorRow.normalizedCode,
        locale: "es",
        preferredLabel: "Vendor label",
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "LICENSED_VENDOR",
        exactness: "EXACT_SOURCE",
        sourceId: "IMO_P21",
        terminologyVersion: "VENDOR.P21",
        sourcePriority: 40,
        status: "APPROVED",
        isEffective: true,
      },
    });

    const plan = await seedGovernedIcd10Terminology(prisma, {
      releaseVersion: P21_FIXTURE_RELEASE,
      dryRun: false,
    });
    expect(plan.acceptedTerminology.length).toBeGreaterThan(0);
    const firstGoverned = await prisma.icd10DiagnosisTerminology.count({
      where: { releaseVersion: P21_FIXTURE_RELEASE, provenance: "MEDORA_GOVERNED", labelRegister: "CLINICIAN_PREFERRED" },
    });
    expect(firstGoverned).toBe(178);
    await seedGovernedIcd10Terminology(prisma, {
      releaseVersion: P21_FIXTURE_RELEASE,
      dryRun: false,
    });
    const secondGoverned = await prisma.icd10DiagnosisTerminology.count({
      where: { releaseVersion: P21_FIXTURE_RELEASE, provenance: "MEDORA_GOVERNED", labelRegister: "CLINICIAN_PREFERRED" },
    });
    expect(secondGoverned).toBe(178);
    expect(secondGoverned).toBe(firstGoverned);
    expect(plan.rejected.every((row) => row.reason === "CODE_NOT_IN_TARGET_RELEASE" || row.reason === "IDENTITY_MISMATCH")).toBe(
      true,
    );

    const r1085Terms = await prisma.icd10DiagnosisTerminology.findMany({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85", locale: "es" },
    });
    expect(r1085Terms.some((row) => row.provenance === "LICENSED_VENDOR")).toBe(true);
    expect(r1085Terms.some((row) => row.provenance === "MEDORA_GOVERNED" && row.isEffective)).toBe(true);
    expect(r1085Terms.filter((row) => row.isEffective).length).toBe(1);
    const governed = r1085Terms.find((row) => row.provenance === "MEDORA_GOVERNED");
    expect(governed?.sourceId).toBe(ICD10_GOVERNED_SOURCE_ID);
    expect(governed?.terminologyVersion).toBe(ICD10_GOVERNED_TERMINOLOGY_VERSION);
    expect(governed?.sourcePriority).toBe(ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED);
    expect(governed?.labelRegister).toBe("CLINICIAN_PREFERRED");
    expect(governed?.status).toBe("APPROVED");

    const catalog = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85" },
    });
    const display = resolveIcd10DiagnosisDisplay({
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "es",
      catalog,
      terminologyRows: r1085Terms,
    });
    expect(display.displayName).toBe("Dolor abdominal en varios sitios");
    expect(display.displayName).not.toBe("Vendor label");
    expect(display.displayName).not.toBe(catalog.shortDescription);

    const a421 = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "A42.1" },
    });
    const a421Display = resolveIcd10SearchHitDisplay({
      locale: "es",
      searchHit: { code: a421.code, shortDescription: a421.shortDescription },
      catalog: a421,
      terminologyRows: [],
    });
    expect(a421Display.display.displayName).toBe("A42.1");
    expect(a421Display.display.exactness).toBe("UNLOCALIZED_CODE");
    expect(a421Display.display.displayName).not.toBe(a421.shortDescription);

    const match = buildIcd10CatalogSearchMatch("dolor abdominal");
    expect(match).not.toBeNull();
    const hits = await prisma.$queryRaw<Icd10CatalogSearchRow[]>(buildIcd10CatalogSearchSelectSql(match!, 30));
    const r1085Hit = hits.find((row) => row.code === "R10.85");
    expect(r1085Hit).toBeDefined();
    expect(r1085Hit?.shortDescription).toContain("P21 fixture");
    expect(r1085Hit?.shortDescription).not.toBe("Dolor abdominal en varios sitios");
    expect(r1085Hit?.shortDescription).not.toBe("dolor abdominal");
    expect(hits.filter((row) => row.code === "R10.85")).toHaveLength(1);

    const searchDisplay = resolveIcd10SearchHitDisplay({
      locale: "es",
      searchHit: { code: r1085Hit!.code, shortDescription: r1085Hit!.shortDescription },
      catalog,
      terminologyRows: r1085Terms,
      matchedAliasText: "dolor abdominal",
    });
    expect(searchDisplay.searchMatchText).toBe("dolor abdominal");
    expect(searchDisplay.display.displayName).toBe("Dolor abdominal en varios sitios");
    expect(searchDisplay.display.displayName).not.toBe(r1085Hit!.shortDescription);

    const frHitMatch = buildIcd10CatalogSearchMatch("Douleur abdominale à plusieurs sites");
    const frHits = await prisma.$queryRaw<Icd10CatalogSearchRow[]>(buildIcd10CatalogSearchSelectSql(frHitMatch!, 30));
    const frR1085 = frHits.find((row) => row.code === "R10.85");
    expect(frR1085?.shortDescription).toContain("P21 fixture");
    const frTerms = await prisma.icd10DiagnosisTerminology.findMany({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85", locale: "fr" },
    });
    const frDisplay = resolveIcd10SearchHitDisplay({
      locale: "fr",
      searchHit: { code: frR1085!.code, shortDescription: frR1085!.shortDescription },
      catalog,
      terminologyRows: frTerms,
    });
    expect(frDisplay.display.displayName).toBe("Douleur abdominale à plusieurs sites");
    expect(frDisplay.display.displayName).not.toBe(frR1085!.shortDescription);

    for (const code of ["A42.1", "I77.811", "R14.0", "G43.D1", "G43.D0"] as const) {
      const row = await prisma.icd10DiagnosisCode.findFirstOrThrow({
        where: { releaseVersion: P21_FIXTURE_RELEASE, code },
      });
      const terms = await prisma.icd10DiagnosisTerminology.findMany({
        where: { releaseVersion: P21_FIXTURE_RELEASE, code, locale: "es" },
      });
      const golden = resolveIcd10DiagnosisDisplay({
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        code: row.code,
        locale: "es",
        catalog: row,
        terminologyRows: terms,
      });
      expect(golden.displayName).toBe(code);
      expect(golden.exactness).toBe("UNLOCALIZED_CODE");
      expect(golden.displayName).not.toBe(row.shortDescription);
    }

    const l0390 = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "L03.90" },
    });
    const l03CategoryTerms = await prisma.icd10DiagnosisTerminology.findMany({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "L03", locale: "fr" },
    });
    const l03FamilyTerms = await prisma.icd10DiagnosisTerminology.findMany({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: { in: ["L03", "L03.90"] }, locale: "fr" },
    });
    const l0390FromCategoryOnly = resolveIcd10DiagnosisDisplay({
      codeSystem: l0390.codeSystem,
      releaseVersion: l0390.releaseVersion,
      code: l0390.code,
      locale: "fr",
      catalog: l0390,
      terminologyRows: l03CategoryTerms,
    });
    expect(l0390FromCategoryOnly.displayName).toBe("L03.90");
    expect(l0390FromCategoryOnly.exactness).toBe("UNLOCALIZED_CODE");
    const l0390Exact = resolveIcd10DiagnosisDisplay({
      codeSystem: l0390.codeSystem,
      releaseVersion: l0390.releaseVersion,
      code: l0390.code,
      locale: "fr",
      catalog: l0390,
      terminologyRows: l03FamilyTerms,
    });
    expect(l0390Exact.displayName).toBe("Cellulite, non précisée");
    expect(l0390Exact.displayName).not.toBe("Cellulite");

    const r110 = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R11.0" },
    });
    const r11Terms = await prisma.icd10DiagnosisTerminology.findMany({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: { startsWith: "R11" }, locale: "es" },
    });
    const r110Display = resolveIcd10DiagnosisDisplay({
      codeSystem: r110.codeSystem,
      releaseVersion: r110.releaseVersion,
      code: r110.code,
      locale: "es",
      catalog: r110,
      terminologyRows: r11Terms,
    });
    expect(r110Display.displayName).toBe("R11.0");
    expect(r110Display.exactness).toBe("UNLOCALIZED_CODE");

    const counts = await collectIcd10MultilingualCertification(prisma, { releaseVersion: P21_FIXTURE_RELEASE });
    const gates = evaluateIcd10MultilingualCertification(counts);
    expect(gates.SAFE_ARCHITECTURE).toBe(true);
    expect(gates.FULL_TRILINGUAL_COVERAGE).toBe(false);
    expect(icd10MultilingualCertificationExitCode("safety", gates)).toBe(0);
    expect(icd10MultilingualCertificationExitCode("coverage", gates)).toBe(2);

    const fy2025 = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { id: fixture.fy2025R1085Id, releaseVersion: P21_PRIOR_RELEASE },
    });
    await expect(
      prisma.icd10DiagnosisTerminology.create({
        data: {
          icd10CatalogId: fy2025.id,
          codeSystem: ICD10_CM_CODE_SYSTEM,
          releaseVersion: P21_FIXTURE_RELEASE,
          code: "R10.85",
          normalizedCode: "R1085",
          locale: "es",
          preferredLabel: "wrong release",
          labelRegister: "CLINICIAN_PREFERRED",
          provenance: "MEDORA_GOVERNED",
          exactness: "EXACT_GOVERNED",
          sourceId: "P21.CROSS.RELEASE",
          terminologyVersion: "P21.CROSS.RELEASE",
          status: "APPROVED",
          isEffective: false,
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.icd10DiagnosisTerminology.create({
        data: {
          icd10CatalogId: catalog.id,
          codeSystem: "ICD-10",
          releaseVersion: catalog.releaseVersion,
          code: catalog.code,
          normalizedCode: catalog.normalizedCode,
          locale: "es",
          preferredLabel: "wrong system",
          labelRegister: "CLINICIAN_PREFERRED",
          provenance: "OFFICIAL_SOURCE",
          exactness: "EXACT_SOURCE",
          sourceId: "P21.CROSS.SYSTEM",
          terminologyVersion: "P21.CROSS.SYSTEM",
          status: "APPROVED",
          isEffective: false,
        },
      }),
    ).rejects.toThrow();
  });

  it("preserves two licensed vendors and atomically promotes/supersedes Medora override", async () => {
    await seedIcd10P21Fixture(prisma);
    const catalog = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85" },
    });
    const identity = {
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "es" as const,
    };
    await prisma.icd10DiagnosisTerminology.create({
      data: {
        icd10CatalogId: catalog.id,
        ...identity,
        normalizedCode: catalog.normalizedCode,
        preferredLabel: "IMO label",
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "LICENSED_VENDOR",
        exactness: "EXACT_SOURCE",
        sourceId: "IMO_CONTRACT_A",
        terminologyVersion: "IMO.2026.1",
        sourcePriority: 40,
        status: "APPROVED",
        isEffective: false,
      },
    });
    await prisma.icd10DiagnosisTerminology.create({
      data: {
        icd10CatalogId: catalog.id,
        ...identity,
        normalizedCode: catalog.normalizedCode,
        preferredLabel: "Other vendor label",
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "LICENSED_VENDOR",
        exactness: "EXACT_SOURCE",
        sourceId: "OTHER_VENDOR_B",
        terminologyVersion: "OTHER.2026.1",
        sourcePriority: 60,
        status: "APPROVED",
        isEffective: false,
      },
    });
    await expect(
      prisma.icd10DiagnosisTerminology.create({
        data: {
          icd10CatalogId: catalog.id,
          ...identity,
          normalizedCode: catalog.normalizedCode,
          preferredLabel: "IMO duplicate",
          labelRegister: "CLINICIAN_PREFERRED",
          provenance: "LICENSED_VENDOR",
          exactness: "EXACT_SOURCE",
          sourceId: "IMO_CONTRACT_A",
          terminologyVersion: "IMO.2026.1",
          sourcePriority: 40,
          status: "APPROVED",
          isEffective: false,
        },
      }),
    ).rejects.toThrow();

    await recomputeIcd10EffectiveClinicianLabel(prisma, identity);
    let rows = await prisma.icd10DiagnosisTerminology.findMany({ where: identity });
    expect(rows.filter((row) => row.provenance === "LICENSED_VENDOR")).toHaveLength(2);
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.sourceId).toBe("IMO_CONTRACT_A");

    await seedGovernedIcd10Terminology(prisma, { releaseVersion: P21_FIXTURE_RELEASE, dryRun: false });
    rows = await prisma.icd10DiagnosisTerminology.findMany({ where: identity });
    expect(rows.some((row) => row.sourceId === "IMO_CONTRACT_A")).toBe(true);
    expect(rows.some((row) => row.sourceId === "OTHER_VENDOR_B")).toBe(true);
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.sourceId).toBe(ICD10_GOVERNED_SOURCE_ID);
    expect(rows.find((row) => row.sourceId === "IMO_CONTRACT_A")?.isEffective).toBe(false);

    await prisma.icd10DiagnosisTerminology.updateMany({
      where: { ...identity, sourceId: ICD10_GOVERNED_SOURCE_ID },
      data: { status: "SUPERSEDED" },
    });
    await recomputeIcd10EffectiveClinicianLabel(prisma, identity);
    rows = await prisma.icd10DiagnosisTerminology.findMany({ where: identity });
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.sourceId).toBe("IMO_CONTRACT_A");
    expect(rows.find((row) => row.sourceId === ICD10_GOVERNED_SOURCE_ID)?.status).toBe("SUPERSEDED");
    expect(rows.find((row) => row.sourceId === ICD10_GOVERNED_SOURCE_ID)?.isEffective).toBe(false);
  });

  it("preserves same-source terminology versions and promotes by explicit sourcePriority", async () => {
    await seedIcd10P21Fixture(prisma);
    const catalog = await prisma.icd10DiagnosisCode.findFirstOrThrow({
      where: { releaseVersion: P21_FIXTURE_RELEASE, code: "R10.85" },
    });
    const identity = {
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "es" as const,
    };
    const baseVendor = {
      icd10CatalogId: catalog.id,
      ...identity,
      normalizedCode: catalog.normalizedCode,
      preferredLabel: "Vendor 2026.1",
      labelRegister: "CLINICIAN_PREFERRED" as const,
      provenance: "LICENSED_VENDOR" as const,
      exactness: "EXACT_SOURCE" as const,
      sourceId: "TEST_VENDOR",
      status: "APPROVED" as const,
    };
    await prisma.icd10DiagnosisTerminology.create({
      data: { ...baseVendor, terminologyVersion: "2026.1", sourcePriority: 50, isEffective: false },
    });
    await recomputeIcd10EffectiveClinicianLabel(prisma, identity);
    expect((await prisma.icd10DiagnosisTerminology.findMany({ where: identity })).find((row) => row.isEffective)?.terminologyVersion).toBe(
      "2026.1",
    );

    await prisma.icd10DiagnosisTerminology.create({
      data: {
        ...baseVendor,
        preferredLabel: "Vendor 2026.2",
        terminologyVersion: "2026.2",
        sourcePriority: 40,
        isEffective: false,
      },
    });
    await recomputeIcd10EffectiveClinicianLabel(prisma, identity);
    let rows = await prisma.icd10DiagnosisTerminology.findMany({ where: { ...identity, sourceId: "TEST_VENDOR" } });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.terminologyVersion).sort()).toEqual(["2026.1", "2026.2"]);
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.terminologyVersion).toBe("2026.2");

    await seedGovernedIcd10Terminology(prisma, { releaseVersion: P21_FIXTURE_RELEASE, dryRun: false });
    rows = await prisma.icd10DiagnosisTerminology.findMany({ where: identity });
    expect(rows.filter((row) => row.sourceId === "TEST_VENDOR")).toHaveLength(2);
    expect(rows.some((row) => row.sourceId === ICD10_GOVERNED_SOURCE_ID)).toBe(true);
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.sourceId).toBe(ICD10_GOVERNED_SOURCE_ID);

    await prisma.icd10DiagnosisTerminology.updateMany({
      where: { ...identity, sourceId: ICD10_GOVERNED_SOURCE_ID },
      data: { status: "SUPERSEDED" },
    });
    await recomputeIcd10EffectiveClinicianLabel(prisma, identity);
    rows = await prisma.icd10DiagnosisTerminology.findMany({ where: identity });
    expect(rows.filter((row) => row.isEffective)).toHaveLength(1);
    expect(rows.find((row) => row.isEffective)?.sourceId).toBe("TEST_VENDOR");
    expect(rows.find((row) => row.isEffective)?.terminologyVersion).toBe("2026.2");
    expect(rows.filter((row) => row.sourceId === "TEST_VENDOR")).toHaveLength(2);
    expect(rows.find((row) => row.sourceId === ICD10_GOVERNED_SOURCE_ID)?.status).toBe("SUPERSEDED");
  });
});
