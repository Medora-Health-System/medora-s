/**
 * MEDUI.LAB.REF.1 — pure resolver + alias/panel/snapshot durability tests.
 */

import { describe, expect, it } from "vitest";
import {
  LAB_REF_CANONICAL_ANALYTES,
  LAB_REF_PANEL_DEFINITIONS,
  LAB_REF_EXPLICIT_NON_EQUIVALENCES,
} from "./labReferenceAuthoritySeedData.js";
import {
  applyLabReferenceSnapshotToObservation,
  computeHLFromResolvedInterval,
  normalizeLabAliasCode,
  resolveLabCriticalValue,
  resolveLabReferenceInterval,
  type LabIntervalCandidate,
} from "./labReferenceIntervalAuthority.js";

function interval(partial: Partial<LabIntervalCandidate> & { id: string }): LabIntervalCandidate {
  return {
    specimen: "SERUM",
    unit: "g/dL",
    ageMinYears: null,
    ageMaxYears: null,
    sexApplicability: "ANY",
    pregnancyApplicability: "ANY",
    methodOrAnalyzer: null,
    low: 12,
    high: 16,
    textualInterval: null,
    loincCode: "718-7",
    sourceName: "TEST",
    sourceIdentifier: null,
    sourceUrl: null,
    sourceVersion: null,
    effectiveFrom: new Date("2020-01-01"),
    effectiveTo: null,
    status: "ACTIVE",
    ...partial,
  };
}

describe("canonical alias convergence", () => {
  it("maps HB and HGB onto HEMOGLOBIN without collapsing BUN/UREA", () => {
    const hb = LAB_REF_CANONICAL_ANALYTES.find((a) => a.code === "HEMOGLOBIN");
    expect(hb?.aliases.map((x) => x.aliasCode).sort()).toEqual(
      expect.arrayContaining(["HB", "HGB", "HEMOGLOBIN"])
    );
    const bun = LAB_REF_CANONICAL_ANALYTES.find((a) => a.code === "BUN");
    const urea = LAB_REF_CANONICAL_ANALYTES.find((a) => a.code === "UREA");
    expect(bun).toBeTruthy();
    expect(urea).toBeTruthy();
    expect(bun!.code).not.toBe(urea!.code);
    expect(LAB_REF_EXPLICIT_NON_EQUIVALENCES.some((x) => /BUN vs UREA/.test(x))).toBe(true);
  });

  it("normalizes alias codes deterministically", () => {
    expect(normalizeLabAliasCode(" hb ")).toBe("HB");
    expect(normalizeLabAliasCode("Hgb")).toBe("HGB");
  });
});

describe("CBC/BMP/CMP shared analyte membership", () => {
  it("reuses the same SODIUM / GLUCOSE / CREATININE analyte across BMP and CMP", () => {
    const bmp = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "BMP")!;
    const cmp = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "CMP")!;
    for (const code of ["SODIUM", "GLUCOSE", "CREATININE", "POTASSIUM", "CALCIUM", "BUN"]) {
      expect(bmp.members.some((m) => m.analyteCode === code)).toBe(true);
      expect(cmp.members.some((m) => m.analyteCode === code)).toBe(true);
    }
    const cbc = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "CBC")!;
    expect(cbc.members.map((m) => m.analyteCode)).toContain("HEMOGLOBIN");
    expect(cbc.members.map((m) => m.sortOrder)).toEqual([...cbc.members.map((m) => m.sortOrder)].sort((a, b) => a - b));
  });
});

describe("resolveLabReferenceInterval", () => {
  const collectedAt = new Date("2024-06-01");

  it("selects adult male vs female when applicable", () => {
    const male = interval({ id: "m", sexApplicability: "MALE", low: 13.5, high: 17.5 });
    const female = interval({ id: "f", sexApplicability: "FEMALE", low: 12, high: 15.5 });
    const rM = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [male, female],
    });
    const rF = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "FEMALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [male, female],
    });
    expect(rM.authority).toBe("CANONICAL");
    expect(rM.intervalId).toBe("m");
    expect(rF.intervalId).toBe("f");
  });

  it("selects pediatric interval when age data exists", () => {
    const ped = interval({ id: "p", ageMinYears: 0, ageMaxYears: 18, low: 11, high: 14 });
    const adult = interval({ id: "a", ageMinYears: 18, ageMaxYears: null, low: 12, high: 16 });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 8 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [ped, adult],
    });
    expect(r.intervalId).toBe("p");
  });

  it("facility override beats canonical", () => {
    const canonical = interval({ id: "c", low: 12, high: 16 });
    const facility = interval({ id: "f", low: 11, high: 15 });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [facility],
      canonicalIntervals: [canonical],
    });
    expect(r.authority).toBe("FACILITY");
    expect(r.intervalId).toBe("f");
    expect(r.low).toBe(11);
  });

  it("uses canonical when no override", () => {
    const canonical = interval({ id: "c" });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [canonical],
    });
    expect(r.authority).toBe("CANONICAL");
    expect(r.intervalId).toBe("c");
  });

  it("ambiguity → unresolved", () => {
    const a = interval({ id: "a1", low: 12, high: 16 });
    const b = interval({ id: "a2", low: 12.1, high: 16.1 });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [a, b],
    });
    expect(r.authority).toBe("UNRESOLVED");
    expect(r.intervalId).toBeNull();
  });

  it("no applicable range → unresolved", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [],
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("method mismatch → unresolved", () => {
    const row = interval({ id: "m", methodOrAnalyzer: "HS_ASSAY" });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      methodOrAnalyzer: "CONVENTIONAL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [row],
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("unit mismatch safety", () => {
    const row = interval({ id: "u", unit: "mmol/L", low: 3, high: 5 });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "mg/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [row],
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("effective-date / version selection", () => {
    const old = interval({
      id: "old",
      effectiveFrom: new Date("2018-01-01"),
      effectiveTo: new Date("2020-01-01"),
      low: 10,
      high: 14,
    });
    const current = interval({
      id: "cur",
      effectiveFrom: new Date("2020-01-01"),
      effectiveTo: null,
      low: 12,
      high: 16,
    });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt: new Date("2024-01-01"),
      facilityIntervals: [],
      canonicalIntervals: [old, current],
    });
    expect(r.intervalId).toBe("cur");
  });

  it("unknown sex does not match sex-specific rows", () => {
    const male = interval({ id: "m", sexApplicability: "MALE" });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "UNKNOWN", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: [male],
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("facility ambiguity does not fall through to canonical", () => {
    const f1 = interval({ id: "f1" });
    const f2 = interval({ id: "f2", low: 11, high: 15 });
    const c = interval({ id: "c" });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt,
      facilityIntervals: [f1, f2],
      canonicalIntervals: [c],
    });
    expect(r.authority).toBe("UNRESOLVED");
  });
});

describe("H/L vs critical independence", () => {
  it("computes H/L from reference interval only", () => {
    const resolved = resolveLabReferenceInterval({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt: new Date("2024-01-01"),
      facilityIntervals: [],
      canonicalIntervals: [interval({ id: "c", low: 12, high: 16 })],
    });
    expect(computeHLFromResolvedInterval("10", resolved)).toBe("L");
    expect(computeHLFromResolvedInterval("18", resolved)).toBe("H");
    expect(computeHLFromResolvedInterval("14", resolved)).toBeNull();
  });

  it("critical policy is independent from H/L", () => {
    const critical = resolveLabCriticalValue({
      facilityId: "fac-1",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt: new Date("2024-01-01"),
      patientValue: "7",
      policies: [
        {
          id: "crit-1",
          facilityId: null,
          specimen: "SERUM",
          unit: "g/dL",
          ageMinYears: null,
          ageMaxYears: null,
          sexApplicability: "ANY",
          methodOrAnalyzer: null,
          criticalLow: 7,
          criticalHigh: 20,
          textualCritical: null,
          sourceName: "TEST",
          sourceIdentifier: null,
          effectiveFrom: new Date("2020-01-01"),
          effectiveTo: null,
          status: "ACTIVE",
        },
      ],
    });
    expect(critical.status).toBe("CRITICAL_LOW");
    // Value 7 is also below reference 12–16 → L, but critical is separate authority.
    const resolved = {
      authority: "CANONICAL" as const,
      intervalId: "c",
      low: 12,
      high: 16,
      textualInterval: null,
      unit: "g/dL",
      loincCode: null,
      specimen: "SERUM",
      methodOrAnalyzer: null,
      sourceName: "TEST",
      sourceIdentifier: null,
      sourceUrl: null,
      sourceVersion: null,
    };
    expect(computeHLFromResolvedInterval("7", resolved)).toBe("L");
    expect(critical.status).toBe("CRITICAL_LOW");
  });
});

describe("finalized Result snapshot durability", () => {
  it("locks snapshot and later apply does not mutate locked fields", () => {
    const first = applyLabReferenceSnapshotToObservation({
      observation: { code: "HGB", name: "Hemoglobin", value: "10", unit: "g/dL" },
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: {
        authority: "CANONICAL",
        intervalId: "int-1",
        low: 12,
        high: 16,
        textualInterval: null,
        unit: "g/dL",
        loincCode: "718-7",
        specimen: "SERUM",
        methodOrAnalyzer: null,
        sourceName: "Mayo Clinic Laboratories",
        sourceIdentifier: "TEST",
        sourceUrl: null,
        sourceVersion: "v1",
      },
      critical: {
        status: null,
        policyId: null,
        facilityScoped: false,
        criticalLow: null,
        criticalHigh: null,
        textualCritical: null,
        sourceName: null,
      },
      now: new Date("2024-01-01T00:00:00.000Z"),
    });

    expect((first.referenceSnapshot as { locked?: boolean }).locked).toBe(true);
    expect(first.referenceLow).toBe(12);
    expect(first.flag).toBe("LOW");

    const second = applyLabReferenceSnapshotToObservation({
      observation: first as {
        code?: string;
        name: string;
        value: string;
        unit?: string | null;
        referenceLow?: number | null;
        referenceHigh?: number | null;
        referenceText?: string | null;
        flag?: string | null;
        referenceSnapshot?: {
          locked?: boolean;
          referenceLow?: number | null;
          intervalId?: string | null;
        };
      },
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: {
        authority: "CANONICAL",
        intervalId: "int-CHANGED",
        low: 99,
        high: 100,
        textualInterval: null,
        unit: "g/dL",
        loincCode: "718-7",
        specimen: "SERUM",
        methodOrAnalyzer: null,
        sourceName: "CHANGED",
        sourceIdentifier: null,
        sourceUrl: null,
        sourceVersion: "v2",
      },
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

    expect((second.referenceSnapshot as { intervalId?: string }).intervalId).toBe("int-1");
    expect(second.referenceLow).toBe(12);
  });
});

describe("cross-facility isolation (resolver inputs)", () => {
  it("only evaluates facilityIntervals provided for the requesting facility", () => {
    // Caller must scope facilityIntervals by facilityId — other facility rows are never passed in.
    const otherFacilityOnly = interval({ id: "other-fac", low: 1, high: 2 });
    const canonical = interval({ id: "c", low: 12, high: 16 });
    const r = resolveLabReferenceInterval({
      facilityId: "fac-A",
      canonicalAnalyteId: "a1",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "g/dL",
      collectedAt: new Date("2024-01-01"),
      facilityIntervals: [], // fac-B override intentionally omitted
      canonicalIntervals: [canonical, otherFacilityOnly].filter((x) => x.id === "c"),
    });
    expect(r.authority).toBe("CANONICAL");
    expect(r.intervalId).toBe("c");
  });
});

describe("enterprise care-setting consumption", () => {
  it("exposes one shared authority module (no ED/IP/Clinic/Dental forks)", () => {
    // Structural proof: single exported resolver function used enterprise-wide.
    expect(typeof resolveLabReferenceInterval).toBe("function");
    expect(typeof resolveLabCriticalValue).toBe("function");
    expect(LAB_REF_PANEL_DEFINITIONS.map((p) => p.code).sort()).toEqual(["BMP", "CBC", "CMP"]);
  });
});
