/**
 * MEDUI.LAB.REF.2A — DB-backed integrity: panel sharing, seed idempotency, critical empty,
 * snapshot durability against registry mutation (local non-PHI).
 */

import { PrismaClient } from "@prisma/client";
import { seedLabReferenceAuthority } from "../../prisma/helpers/seed-lab-reference-authority";
import {
  applyLabReferenceSnapshotToObservation,
  resolveLabReferenceInterval,
} from "@medora/shared";

const prisma = new PrismaClient();

const SHARED_BMP_CMP = [
  "SODIUM",
  "POTASSIUM",
  "CHLORIDE",
  "CO2_BICARBONATE",
  "GLUCOSE",
  "BUN",
  "CREATININE",
  "CALCIUM",
] as const;

describe("MEDUI.LAB.REF.2A DB integrity", () => {
  jest.setTimeout(120_000);

  it("seed is idempotent (run twice — no duplicates)", async () => {
    const first = await seedLabReferenceAuthority(prisma);
    const second = await seedLabReferenceAuthority(prisma);

    expect(second.analytesUpserted).toBe(first.analytesUpserted);
    expect(second.intervalsCreated).toBe(first.intervalsCreated);
    expect(second.aliasesUpserted).toBe(first.aliasesUpserted);
    expect(second.membersUpserted).toBe(first.membersUpserted);

    const authorityAnalytes = await prisma.canonicalLabAnalyte.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const authorityAnalyteIds = authorityAnalytes.map((a) => a.id);

    const aliases = await prisma.canonicalLabAnalyteAlias.count({
      where: { canonicalLabAnalyteId: { in: authorityAnalyteIds } },
    });
    const intervals = await prisma.labReferenceInterval.count({
      where: {
        OR: [
          { sourceIdentifier: { startsWith: "MAYO.CBC." } },
          { sourceIdentifier: { startsWith: "MAYO.BMAMA." } },
          { sourceIdentifier: { startsWith: "MAYO.CMP." } },
        ],
      },
    });
    const panels = await prisma.labPanelDefinition.count({
      where: { code: { in: ["CBC", "BMP", "CMP"] } },
    });
    const members = await prisma.labPanelMember.count({
      where: { panel: { code: { in: ["CBC", "BMP", "CMP"] } } },
    });
    const critical = await prisma.labCriticalValuePolicy.count();

    const aliasCodes = await prisma.canonicalLabAnalyteAlias.groupBy({
      by: ["aliasCode"],
      _count: true,
      where: { canonicalLabAnalyteId: { in: authorityAnalyteIds } },
    });
    expect(aliasCodes.every((a) => a._count === 1)).toBe(true);

    const sourceIds = await prisma.labReferenceInterval.groupBy({
      by: ["sourceIdentifier"],
      _count: true,
      where: {
        OR: [
          { sourceIdentifier: { startsWith: "MAYO.CBC." } },
          { sourceIdentifier: { startsWith: "MAYO.BMAMA." } },
          { sourceIdentifier: { startsWith: "MAYO.CMP." } },
        ],
      },
    });
    expect(sourceIds.every((s) => s._count === 1)).toBe(true);

    expect(authorityAnalytes.length).toBe(first.analytesUpserted);
    expect(aliases).toBe(first.aliasesUpserted);
    expect(intervals).toBe(first.intervalsCreated);
    expect(panels).toBe(3);
    expect(members).toBe(first.membersUpserted);
    expect(critical).toBe(0);
  });

  it("BMP and CMP share the SAME CanonicalLabAnalyte.id for electrolytes/metabolites", async () => {
    const bmp = await prisma.labPanelDefinition.findUnique({
      where: { code: "BMP" },
      include: { members: { include: { analyte: true } } },
    });
    const cmp = await prisma.labPanelDefinition.findUnique({
      where: { code: "CMP" },
      include: { members: { include: { analyte: true } } },
    });
    expect(bmp).toBeTruthy();
    expect(cmp).toBeTruthy();

    for (const code of SHARED_BMP_CMP) {
      const bmpMember = bmp!.members.find((m) => m.analyte.code === code);
      const cmpMember = cmp!.members.find((m) => m.analyte.code === code);
      expect(bmpMember).toBeTruthy();
      expect(cmpMember).toBeTruthy();
      expect(bmpMember!.canonicalLabAnalyteId).toBe(cmpMember!.canonicalLabAnalyteId);
      expect(bmpMember!.analyte.id).toBe(cmpMember!.analyte.id);
    }

    // Interval sets are by analyte, not duplicated per panel
    const sodium = await prisma.canonicalLabAnalyte.findUnique({ where: { code: "SODIUM" } });
    const sodiumIntervals = await prisma.labReferenceInterval.count({
      where: { canonicalLabAnalyteId: sodium!.id },
    });
    expect(sodiumIntervals).toBeGreaterThan(0);
  });

  it("LabCriticalValuePolicy remains empty in seed", async () => {
    expect(await prisma.labCriticalValuePolicy.count()).toBe(0);
  });

  it("historical snapshot durability: registry edit does not alter locked observation", async () => {
    const hgb = await prisma.canonicalLabAnalyte.findUnique({ where: { code: "HEMOGLOBIN" } });
    expect(hgb).toBeTruthy();
    const intervals = await prisma.labReferenceInterval.findMany({
      where: { canonicalLabAnalyteId: hgb!.id, status: "ACTIVE" },
    });
    const resolved = resolveLabReferenceInterval({
      facilityId: "fac-test",
      canonicalAnalyteId: hgb!.id,
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: intervals.map((r) => ({
        id: r.id,
        specimen: r.specimen,
        unit: r.unit,
        ageMinYears: r.ageMinYears,
        ageMaxYears: r.ageMaxYears,
        sexApplicability: r.sexApplicability as "ANY" | "MALE" | "FEMALE",
        pregnancyApplicability: r.pregnancyApplicability as "ANY",
        methodOrAnalyzer: r.methodOrAnalyzer,
        low: r.low,
        high: r.high,
        textualInterval: r.textualInterval,
        loincCode: r.loincCode,
        sourceName: r.sourceName,
        sourceIdentifier: r.sourceIdentifier,
        sourceUrl: r.sourceUrl,
        sourceVersion: r.sourceVersion,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        status: r.status,
      })),
    });
    expect(resolved.authority).toBe("CANONICAL");
    expect(resolved.intervalId).toBeTruthy();

    const snap = applyLabReferenceSnapshotToObservation({
      observation: { code: "HGB", name: "Hemoglobin", value: "10.0", unit: "g/dL" },
      canonicalAnalyteId: hgb!.id,
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved,
      critical: {
        status: null,
        policyId: null,
        facilityScoped: false,
        criticalLow: null,
        criticalHigh: null,
        textualCritical: null,
        sourceName: null,
      },
    });

    const originalLow = snap.referenceLow;
    const originalIntervalId = (snap.referenceSnapshot as { intervalId?: string }).intervalId;

    // Mutate registry locally then restore
    const targetId = resolved.intervalId!;
    const before = await prisma.labReferenceInterval.findUnique({ where: { id: targetId } });
    expect(before).toBeTruthy();
    await prisma.labReferenceInterval.update({
      where: { id: targetId },
      data: { low: 1, high: 2, sourceName: "MUTATED_FOR_TEST" },
    });

    const afterMutation = applyLabReferenceSnapshotToObservation({
      observation: snap as {
        code?: string;
        name: string;
        value: string;
        unit?: string | null;
        referenceLow?: number | null;
        referenceHigh?: number | null;
        referenceText?: string | null;
        flag?: string | null;
        referenceSnapshot?: { locked?: boolean; intervalId?: string | null };
      },
      canonicalAnalyteId: hgb!.id,
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: { ...resolved, low: 1, high: 2, intervalId: "SHOULD_NOT_APPLY", sourceName: "MUTATED" },
      critical: {
        status: null,
        policyId: null,
        facilityScoped: false,
        criticalLow: null,
        criticalHigh: null,
        textualCritical: null,
        sourceName: null,
      },
      preserveLocked: true,
    });

    expect(afterMutation.referenceLow).toBe(originalLow);
    expect((afterMutation.referenceSnapshot as { intervalId?: string }).intervalId).toBe(
      originalIntervalId
    );

    // Restore registry
    await prisma.labReferenceInterval.update({
      where: { id: targetId },
      data: {
        low: before!.low,
        high: before!.high,
        sourceName: before!.sourceName,
      },
    });
  });

  it("adult male/female/pediatric CBC resolve from DB; infant sodium unresolved", async () => {
    const hgb = await prisma.canonicalLabAnalyte.findUnique({ where: { code: "HEMOGLOBIN" } });
    const na = await prisma.canonicalLabAnalyte.findUnique({ where: { code: "SODIUM" } });
    const hgbRows = await prisma.labReferenceInterval.findMany({
      where: { canonicalLabAnalyteId: hgb!.id },
    });
    const naRows = await prisma.labReferenceInterval.findMany({
      where: { canonicalLabAnalyteId: na!.id },
    });
    const map = (rows: typeof hgbRows) =>
      rows.map((r) => ({
        id: r.id,
        specimen: r.specimen,
        unit: r.unit,
        ageMinYears: r.ageMinYears,
        ageMaxYears: r.ageMaxYears,
        sexApplicability: r.sexApplicability as "ANY" | "MALE" | "FEMALE",
        pregnancyApplicability: r.pregnancyApplicability as "ANY",
        methodOrAnalyzer: r.methodOrAnalyzer,
        low: r.low,
        high: r.high,
        textualInterval: r.textualInterval,
        loincCode: r.loincCode,
        sourceName: r.sourceName,
        sourceIdentifier: r.sourceIdentifier,
        sourceUrl: r.sourceUrl,
        sourceVersion: r.sourceVersion,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        status: r.status,
      }));

    const male = resolveLabReferenceInterval({
      facilityId: "f",
      canonicalAnalyteId: hgb!.id,
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: map(hgbRows),
    });
    const female = resolveLabReferenceInterval({
      facilityId: "f",
      canonicalAnalyteId: hgb!.id,
      patientDemographics: { sex: "FEMALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: map(hgbRows),
    });
    const ped = resolveLabReferenceInterval({
      facilityId: "f",
      canonicalAnalyteId: hgb!.id,
      patientDemographics: { sex: "MALE", ageYears: 8 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: map(hgbRows),
    });
    const infantNa = resolveLabReferenceInterval({
      facilityId: "f",
      canonicalAnalyteId: na!.id,
      patientDemographics: { sex: "MALE", ageYears: 0.5 },
      specimen: "SERUM",
      unit: "mmol/L",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: map(naRows),
    });

    expect(male.low).toBe(13.2);
    expect(female.low).toBe(11.6);
    expect(ped.low).toBe(11.5);
    expect(infantNa.authority).toBe("UNRESOLVED");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
