/**
 * MEDUI.LAB.REF.2A — clinical-data integrity certification (shared pure proofs).
 * Blocks certification on SOURCE_MISMATCH or unexplained OVERLAPPING_INTERVALS.
 */

import { describe, expect, it } from "vitest";
import {
  LAB_REF_MAYO_CURATED_INTERVALS,
  LAB_REF_MAYO_CURATION_STATS,
  LAB_REF_MAYO_UNRESOLVED_POPULATIONS,
} from "./labReferenceMayoCbcBmpCmpIntervals.js";
import {
  computeHLFromResolvedInterval,
  normalizeLabUnit,
  resolveLabCriticalValue,
  resolveLabReferenceInterval,
  type LabIntervalCandidate,
} from "./labReferenceIntervalAuthority.js";
import { applyLabReferenceSnapshotToObservation } from "./labReferenceIntervalAuthority.js";

type Seed = (typeof LAB_REF_MAYO_CURATED_INTERVALS)[number];

function asCandidate(seed: Seed, id: string): LabIntervalCandidate {
  return {
    id,
    specimen: seed.specimen,
    unit: seed.unit,
    ageMinYears: seed.ageMinYears,
    ageMaxYears: seed.ageMaxYears,
    sexApplicability: seed.sexApplicability,
    pregnancyApplicability: seed.pregnancyApplicability,
    methodOrAnalyzer: seed.methodOrAnalyzer,
    low: seed.low,
    high: seed.high,
    textualInterval: seed.textualInterval,
    loincCode: seed.loincCode,
    sourceName: seed.sourceName,
    sourceIdentifier: seed.sourceIdentifier,
    sourceUrl: seed.sourceUrl,
    sourceVersion: seed.sourceVersion,
    effectiveFrom: seed.effectiveFrom,
    effectiveTo: null,
    status: "ACTIVE",
  };
}

function dimensionOverlap(a: Seed, b: Seed): boolean {
  if (a.analyteCode !== b.analyteCode) return false;
  if (a.specimen !== b.specimen) return false;
  if (a.unit !== b.unit) return false;
  if ((a.methodOrAnalyzer ?? "") !== (b.methodOrAnalyzer ?? "")) return false;
  const sexOk =
    a.sexApplicability === "ANY" ||
    b.sexApplicability === "ANY" ||
    a.sexApplicability === b.sexApplicability;
  if (!sexOk) return false;
  const pregOk =
    a.pregnancyApplicability === "ANY" ||
    b.pregnancyApplicability === "ANY" ||
    a.pregnancyApplicability === b.pregnancyApplicability;
  if (!pregOk) return false;
  const aMin = a.ageMinYears ?? 0;
  const bMin = b.ageMinYears ?? 0;
  const aMax = a.ageMaxYears ?? Number.POSITIVE_INFINITY;
  const bMax = b.ageMaxYears ?? Number.POSITIVE_INFINITY;
  return aMin < bMax && bMin < aMax;
}

/** Authoritative Mayo spot-check table (from Mayo CBC 9109 / BMAMA 113630 / component catalogs). */
const MAYO_SOURCE_SPOT_CHECKS: Array<{
  analyteCode: string;
  sex: "MALE" | "FEMALE";
  ageYears: number;
  low: number;
  high: number;
  unit: string;
  sourceUrlIncludes: string;
}> = [
  {
    analyteCode: "HEMOGLOBIN",
    sex: "MALE",
    ageYears: 40,
    low: 13.2,
    high: 16.6,
    unit: "g/dL",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "HEMOGLOBIN",
    sex: "FEMALE",
    ageYears: 40,
    low: 11.6,
    high: 15.0,
    unit: "g/dL",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "HEMOGLOBIN",
    sex: "MALE",
    ageYears: 8,
    low: 11.5,
    high: 14.3,
    unit: "g/dL",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "WBC",
    sex: "MALE",
    ageYears: 40,
    low: 3.4,
    high: 9.6,
    unit: "10^9/L",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "RBC",
    sex: "MALE",
    ageYears: 40,
    low: 4.35,
    high: 5.65,
    unit: "10^12/L",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "PLATELET",
    sex: "FEMALE",
    ageYears: 40,
    low: 157,
    high: 371,
    unit: "10^9/L",
    sourceUrlIncludes: "9109",
  },
  {
    analyteCode: "SODIUM",
    sex: "MALE",
    ageYears: 40,
    low: 135,
    high: 145,
    unit: "mmol/L",
    sourceUrlIncludes: "113630",
  },
  {
    analyteCode: "BUN",
    sex: "MALE",
    ageYears: 40,
    low: 8,
    high: 24,
    unit: "mg/dL",
    sourceUrlIncludes: "113630",
  },
  {
    analyteCode: "BUN",
    sex: "FEMALE",
    ageYears: 40,
    low: 6,
    high: 21,
    unit: "mg/dL",
    sourceUrlIncludes: "113630",
  },
  {
    analyteCode: "TOTAL_BILIRUBIN",
    sex: "MALE",
    ageYears: 40,
    low: 0.0,
    high: 1.2,
    unit: "mg/dL",
    sourceUrlIncludes: "mayocliniclabs.com",
  },
];

describe("MEDUI.LAB.REF.2A curated row inventory", () => {
  it("CURATED_ROWS = 294 with complete attribution fields", () => {
    expect(LAB_REF_MAYO_CURATED_INTERVALS.length).toBe(294);
    expect(LAB_REF_MAYO_CURATION_STATS.intervalCount).toBe(294);
    for (const row of LAB_REF_MAYO_CURATED_INTERVALS) {
      expect(row.analyteCode).toBeTruthy();
      expect(row.sourceIdentifier).toBeTruthy();
      expect(row.sourceUrl).toMatch(/^https:\/\/www\.mayocliniclabs\.com\//);
      expect(row.sourceName).toBe("Mayo Clinic Laboratories");
      expect(row.sourceVersion).toBeTruthy();
      expect(row.specimen).toBeTruthy();
      expect(row.unit).toBeTruthy();
      expect(row.effectiveFrom).toBeTruthy();
      // low/high may be one-sided (eGFR) but not both null without textual
      if (row.low == null && row.high == null) {
        expect(row.textualInterval).toBeTruthy();
      }
    }
  });
});

describe("MEDUI.LAB.REF.2A SOURCE_MATCHED / SOURCE_MISMATCH", () => {
  it("authoritative Mayo spot-checks all match (SOURCE_MISMATCH must be 0)", () => {
    const mismatches: string[] = [];
    for (const c of MAYO_SOURCE_SPOT_CHECKS) {
      const hits = LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => {
        if (r.analyteCode !== c.analyteCode) return false;
        if (r.sexApplicability !== "ANY" && r.sexApplicability !== c.sex) return false;
        const min = r.ageMinYears ?? 0;
        const max = r.ageMaxYears ?? Number.POSITIVE_INFINITY;
        return c.ageYears >= min && c.ageYears < max;
      });
      if (hits.length !== 1) {
        mismatches.push(`${c.analyteCode} ${c.sex} age=${c.ageYears}: hits=${hits.length}`);
        continue;
      }
      const h = hits[0]!;
      if (h.low !== c.low || h.high !== c.high || h.unit !== c.unit) {
        mismatches.push(
          `${c.analyteCode}: expected ${c.low}-${c.high} ${c.unit}, got ${h.low}-${h.high} ${h.unit}`
        );
      }
      if (!h.sourceUrl.includes(c.sourceUrlIncludes)) {
        mismatches.push(`${c.analyteCode}: URL missing ${c.sourceUrlIncludes}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("MEDUI.LAB.REF.2A OVERLAPPING_INTERVALS", () => {
  it("zero unexplained overlapping canonical interval pairs", () => {
    const overlaps: string[] = [];
    for (let i = 0; i < LAB_REF_MAYO_CURATED_INTERVALS.length; i++) {
      for (let j = i + 1; j < LAB_REF_MAYO_CURATED_INTERVALS.length; j++) {
        const a = LAB_REF_MAYO_CURATED_INTERVALS[i]!;
        const b = LAB_REF_MAYO_CURATED_INTERVALS[j]!;
        if (dimensionOverlap(a, b)) {
          overlaps.push(`${a.sourceIdentifier} ∩ ${b.sourceIdentifier}`);
        }
      }
    }
    expect(overlaps).toEqual([]);
  });
});

describe("MEDUI.LAB.REF.2A UNRESOLVED_BANDS", () => {
  it("documents not-established populations and keeps them unmatched", () => {
    expect(LAB_REF_MAYO_UNRESOLVED_POPULATIONS.length).toBeGreaterThanOrEqual(10);
    const cases = [
      { analyteCode: "SODIUM", ageYears: 0.5, sex: "MALE" as const },
      { analyteCode: "GLUCOSE", ageYears: 0.4, sex: "FEMALE" as const },
      { analyteCode: "BUN", ageYears: 0.5, sex: "MALE" as const },
      { analyteCode: "TOTAL_BILIRUBIN", ageYears: 3 / 365.25, sex: "MALE" as const },
      { analyteCode: "EGFR", ageYears: 10, sex: "MALE" as const },
    ];
    for (const c of cases) {
      const hits = LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => {
        if (r.analyteCode !== c.analyteCode) return false;
        if (r.sexApplicability !== "ANY" && r.sexApplicability !== c.sex) return false;
        const min = r.ageMinYears ?? 0;
        const max = r.ageMaxYears ?? Number.POSITIVE_INFINITY;
        return c.ageYears >= min && c.ageYears < max;
      });
      expect(hits, `${c.analyteCode} age=${c.ageYears}`).toHaveLength(0);
    }
  });
});

describe("MEDUI.LAB.REF.2A units — no silent conversion", () => {
  it("does not equate ×10³/µL with ×10⁹/L or mmol/L with mEq/L", () => {
    expect(normalizeLabUnit("10^9/L")).toBe("10^9/l");
    expect(normalizeLabUnit("x10(9)/L")).toBe("10^9/l");
    expect(normalizeLabUnit("x10^3/uL")).not.toBe(normalizeLabUnit("10^9/L"));
    expect(normalizeLabUnit("mmol/L")).toBe("mmol/l");
    expect(normalizeLabUnit("mEq/L")).toBe("meq/l");
    expect(normalizeLabUnit("mmol/L")).not.toBe(normalizeLabUnit("mEq/L"));
    expect(normalizeLabUnit("mg/dL")).not.toBe(normalizeLabUnit("mmol/L"));
  });

  it("incompatible unit → UNRESOLVED against Mayo hemoglobin", () => {
    const canonical = LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => r.analyteCode === "HEMOGLOBIN").map(
      (r, i) => asCandidate(r, `h-${i}`)
    );
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/L",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("UNRESOLVED");
  });
});

describe("MEDUI.LAB.REF.2A Mayo method audit (CBC 9109 Sysmex XN-9000)", () => {
  const collectedAt = new Date("2024-06-01");
  const canonical = LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => r.analyteCode === "HEMOGLOBIN").map(
    (r, i) => asCandidate(r, `h-${i}`)
  );

  it("matching method → resolves", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("CANONICAL");
    expect(r.low).toBe(13.2);
  });

  it("incompatible method → unresolved", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "OTHER_ANALYZER",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("facility override for another method wins", () => {
    const facility: LabIntervalCandidate = {
      id: "fac-other",
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      ageMinYears: 18,
      ageMaxYears: null,
      sexApplicability: "MALE",
      pregnancyApplicability: "ANY",
      methodOrAnalyzer: "OTHER_ANALYZER",
      low: 12,
      high: 15,
      textualInterval: null,
      loincCode: "718-7",
      sourceName: "Facility validated",
      sourceIdentifier: "FAC.TEST.HGB",
      sourceUrl: null,
      sourceVersion: null,
      effectiveFrom: "2020-01-01",
      effectiveTo: null,
      status: "ACTIVE",
    };
    const r = resolveLabReferenceInterval({
      facilityId: "fac-A",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "OTHER_ANALYZER",
      collectedAt,
      facilityIntervals: [facility],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("FACILITY");
    expect(r.low).toBe(12);
  });
});

describe("MEDUI.LAB.REF.2A H/L boundary + critical independence", () => {
  const resolved = {
    authority: "CANONICAL" as const,
    intervalId: "int-1",
    low: 13.2,
    high: 16.6,
    textualInterval: null,
    unit: "g/dL",
    loincCode: "718-7",
    specimen: "WHOLE_BLOOD_EDTA",
    methodOrAnalyzer: "Sysmex_XN_9000",
    sourceName: "Mayo Clinic Laboratories",
    sourceIdentifier: "MAYO.CBC.9109.HGB.M.adult",
    sourceUrl: "https://www.mayocliniclabs.com/test-catalog/overview/9109",
    sourceVersion: "v",
  };

  it("exact low/high → normal (not L/H); below → L; above → H", () => {
    expect(computeHLFromResolvedInterval("13.2", resolved)).toBeNull();
    expect(computeHLFromResolvedInterval("16.6", resolved)).toBeNull();
    expect(computeHLFromResolvedInterval("13.19", resolved)).toBe("L");
    expect(computeHLFromResolvedInterval("16.61", resolved)).toBe("H");
  });

  it("extreme H/L is not critical without LabCriticalValuePolicy", () => {
    const critical = resolveLabCriticalValue({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt: new Date("2024-06-01"),
      patientValue: "3",
      policies: [],
    });
    expect(critical.status).toBeNull();
    expect(computeHLFromResolvedInterval("3", resolved)).toBe("L");
  });
});

describe("MEDUI.LAB.REF.2A snapshot durability (pure)", () => {
  it("locked snapshot survives later registry mutation", () => {
    const first = applyLabReferenceSnapshotToObservation({
      observation: { code: "HGB", name: "Hemoglobin", value: "10", unit: "g/dL" },
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: {
        authority: "CANONICAL",
        intervalId: "int-original",
        low: 13.2,
        high: 16.6,
        textualInterval: null,
        unit: "g/dL",
        loincCode: "718-7",
        specimen: "WHOLE_BLOOD_EDTA",
        methodOrAnalyzer: "Sysmex_XN_9000",
        sourceName: "Mayo Clinic Laboratories",
        sourceIdentifier: "MAYO.CBC.9109.HGB.M.adult",
        sourceUrl: "https://www.mayocliniclabs.com/test-catalog/overview/9109",
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
    });
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
        referenceSnapshot?: { locked?: boolean; intervalId?: string | null };
      },
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: {
        authority: "CANONICAL",
        intervalId: "int-CHANGED",
        low: 1,
        high: 2,
        textualInterval: null,
        unit: "g/dL",
        loincCode: "718-7",
        specimen: "WHOLE_BLOOD_EDTA",
        methodOrAnalyzer: "Sysmex_XN_9000",
        sourceName: "CHANGED",
        sourceIdentifier: "CHANGED",
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
    expect((second.referenceSnapshot as { intervalId?: string }).intervalId).toBe("int-original");
    expect(second.referenceLow).toBe(13.2);
  });
});

describe("MEDUI.LAB.REF.2A facility isolation (resolver inputs)", () => {
  it("Facility A override Y; Facility B (no override) uses canonical X", () => {
    const collectedAt = new Date("2024-06-01");
    const canonical = LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => r.analyteCode === "SODIUM").map(
      (r, i) => asCandidate(r, `na-${i}`)
    );
    const facilityA: LabIntervalCandidate = {
      id: "facA-na",
      specimen: "SERUM",
      unit: "mmol/L",
      ageMinYears: 1,
      ageMaxYears: null,
      sexApplicability: "ANY",
      pregnancyApplicability: "ANY",
      methodOrAnalyzer: null,
      low: 130,
      high: 140,
      textualInterval: null,
      loincCode: "2951-2",
      sourceName: "Facility A validated",
      sourceIdentifier: "FAC.A.NA",
      sourceUrl: null,
      sourceVersion: null,
      effectiveFrom: "2020-01-01",
      effectiveTo: null,
      status: "ACTIVE",
    };
    const rA = resolveLabReferenceInterval({
      facilityId: "fac-A",
      canonicalAnalyteId: "na",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "mmol/L",
      collectedAt,
      facilityIntervals: [facilityA],
      canonicalIntervals: canonical,
    });
    const rB = resolveLabReferenceInterval({
      facilityId: "fac-B",
      canonicalAnalyteId: "na",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "SERUM",
      unit: "mmol/L",
      collectedAt,
      facilityIntervals: [], // Facility B never receives Facility A rows
      canonicalIntervals: canonical,
    });
    expect(rA.authority).toBe("FACILITY");
    expect(rA.low).toBe(130);
    expect(rB.authority).toBe("CANONICAL");
    expect(rB.low).toBe(135);
  });
});
