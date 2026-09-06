import { describe, expect, it } from "vitest";
import {
  ICD10_CIE10ES_ARTIFACT_SHA256,
  ICD10_CIE10ES_SOURCE_ID,
  ICD10_CIE10ES_TERMINOLOGY_VERSION,
} from "./icd10TerminologyTypes.js";
import {
  buildCie10esFy2026AllowSet,
  buildCie10esLicensedArtifactRecords,
  ICD10_CIE10ES_EXPECTED_HEADER_EXCLUSIONS,
} from "./cie10esFy2026AllowSet.js";

describe("FY2026 CIE-10-ES allow set", () => {
  const us = [
    { code: "R11.0", normalizedCode: "R110", label: "Nausea", selectable: true },
    { code: "R11", normalizedCode: "R11", label: "Nausea and vomiting", selectable: false },
    { code: "L03.90", normalizedCode: "L0390", label: "Cellulitis, unspecified", selectable: true },
    { code: "L03", normalizedCode: "L03", label: "Cellulitis", selectable: false },
    { code: "G35", normalizedCode: "G35", label: "Multiple sclerosis", selectable: false },
    { code: "G35.A", normalizedCode: "G35A", label: "Relapsing-remitting multiple sclerosis", selectable: true },
    { code: "R10.85", normalizedCode: "R1085", label: "Abdominal pain of multiple sites", selectable: true },
  ];

  it("allows only exact selectable U.S. codes with Spanish finales labels", () => {
    const result = buildCie10esFy2026AllowSet({
      usRows: us,
      esFinales: [
        { code: "R11.0", normalizedCode: "R110", label: "Náuseas", terminal: true },
        { code: "R11", normalizedCode: "R11", label: "Náuseas y vómitos", terminal: true },
        { code: "L03", normalizedCode: "L03", label: "Celulitis", terminal: true },
        { code: "G35", normalizedCode: "G35", label: "Esclerosis múltiple", terminal: true },
        { code: "S30.1XXA", normalizedCode: "S301XXA", label: "Contusión de pared abdominal", terminal: true },
        { code: "R11.0", normalizedCode: "R110", label: "Náuseas", terminal: true },
      ],
      sourceSha256: ICD10_CIE10ES_ARTIFACT_SHA256,
      expectedUsSelectable: 4,
    });
    expect(result.allowed.map((row) => row.code)).toEqual(["R11.0"]);
    expect(result.headerExcluded.sort()).toEqual(["G35", "L03", "R11"]);
    expect(result.sourceOnlyExcluded).toEqual(["S301XXA"]);
    expect(result.missingUsSelectable.map((row) => row.code).sort()).toEqual(["G35.A", "L03.90", "R10.85"]);
    expect(result.allowed[0]?.label).toBe("Náuseas");
    expect(result.gate.CATEGORY_INHERITANCE).toBe(0);
    expect(result.gate.CROSS_LANGUAGE_FALLBACK).toBe(0);
  });

  it("does not let G35 header supply G35.A or L03 supply L03.90", () => {
    const result = buildCie10esFy2026AllowSet({
      usRows: us,
      esFinales: [
        { code: "G35", normalizedCode: "G35", label: "Esclerosis múltiple", terminal: true },
        { code: "L03", normalizedCode: "L03", label: "Celulitis", terminal: true },
      ],
      sourceSha256: ICD10_CIE10ES_ARTIFACT_SHA256,
      expectedUsSelectable: 4,
    });
    expect(result.allowed).toEqual([]);
    expect(result.headerExcluded).toEqual(expect.arrayContaining(["G35", "L03"]));
    expect(result.missingUsSelectable.map((row) => row.code)).toEqual(expect.arrayContaining(["G35.A", "L03.90"]));
  });

  it("fails the admission gate on checksum mismatch and never emits English labels", () => {
    const result = buildCie10esFy2026AllowSet({
      usRows: us,
      esFinales: [{ code: "R11.0", normalizedCode: "R110", label: "Náuseas", terminal: true }],
      sourceSha256: "0".repeat(64),
      expectedUsSelectable: 4,
    });
    expect(result.gate.SOURCE_SHA256_MATCH).toBe("NO");
    expect(result.gate.PASS).toBe(false);
    const records = buildCie10esLicensedArtifactRecords(result.allowed);
    expect(records[0]).toMatchObject({
      locale: "es",
      sourceId: ICD10_CIE10ES_SOURCE_ID,
      terminologyVersion: ICD10_CIE10ES_TERMINOLOGY_VERSION,
      provenance: "OFFICIAL_SOURCE",
      labelRegister: "CLINICIAN_PREFERRED",
    });
    expect(ICD10_CIE10ES_EXPECTED_HEADER_EXCLUSIONS).toHaveLength(16);
  });
});
