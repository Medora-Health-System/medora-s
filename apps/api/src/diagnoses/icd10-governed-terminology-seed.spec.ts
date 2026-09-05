import {
  buildGovernedIcd10TerminologySeedPlan,
  evaluateIcd10MultilingualCertification,
  GOVERNED_ICD10_CLINICIAN_LABELS,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  inspectGovernedIcd10ClinicianLabels,
  mapIcd10ExactnessToDisplayResolution,
  resolveIcd10DiagnosisDisplay,
} from "@medora/shared";

describe("MEDUI.TRILANG.DX.P2.1 governed overlay import", () => {
  it("uses the shared 89-code module as source of truth", () => {
    const inspection = inspectGovernedIcd10ClinicianLabels();
    expect(inspection.frCount).toBe(89);
    expect(inspection.esCount).toBe(89);
    expect(inspection.duplicateCodes).toEqual([]);
    expect(inspection.missingPairCodes).toEqual([]);
    expect(inspection.emptyLabels).toEqual([]);
    expect(inspection.invalidLocale).toEqual([]);
    expect(GOVERNED_ICD10_CLINICIAN_LABELS.fr.R1085).toBe("Douleur abdominale à plusieurs sites");
    expect(GOVERNED_ICD10_CLINICIAN_LABELS.es.R1085).toBe("Dolor abdominal en varios sitios");
  });

  it("stamps governed sourceId and terminologyVersion on accepted rows", () => {
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map([
        [
          "R1085",
          {
            id: "cat-r1085",
            code: "R10.85",
            normalizedCode: "R1085",
            codeSystem: "ICD-10-CM",
            releaseVersion: "FY2026",
          },
        ],
      ]),
      expectedReleaseVersion: "FY2026",
    });
    expect(plan.acceptedTerminology.length).toBe(2);
    expect(plan.acceptedTerminology.every((row) => row.sourceId === "MEDORA_DX_GOVERNED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.terminologyVersion === ICD10_GOVERNED_TERMINOLOGY_VERSION)).toBe(
      true,
    );
    expect(plan.acceptedTerminology.every((row) => row.provenance === "MEDORA_GOVERNED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.labelRegister === "CLINICIAN_PREFERRED")).toBe(true);
    expect(plan.acceptedTerminology.every((row) => row.status === "APPROVED")).toBe(true);
  });

  it("rejects overlay codes that are absent from the target release", () => {
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map(),
      expectedReleaseVersion: "FY2026",
    });
    expect(plan.detectedFr).toBe(89);
    expect(plan.detectedEs).toBe(89);
    expect(plan.acceptedTerminology).toHaveLength(0);
    expect(plan.rejected).toHaveLength(178);
    expect(plan.rejected.every((row) => row.reason === "CODE_NOT_IN_TARGET_RELEASE")).toBe(true);
    expect(plan.terminologyVersion).toBe(ICD10_GOVERNED_TERMINOLOGY_VERSION);
  });

  it("does not import category/header rows as clinician preferred display", () => {
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map([
        [
          "L03",
          {
            id: "cat-l03",
            code: "L03",
            normalizedCode: "L03",
            codeSystem: "ICD-10-CM",
            releaseVersion: "FY2026",
            isSelectable: false,
            isBillable: false,
          },
        ],
        [
          "L0390",
          {
            id: "cat-l0390",
            code: "L03.90",
            normalizedCode: "L0390",
            codeSystem: "ICD-10-CM",
            releaseVersion: "FY2026",
            isSelectable: true,
            isBillable: true,
          },
        ],
      ]),
      expectedReleaseVersion: "FY2026",
    });
    expect(plan.acceptedTerminology.every((row) => row.code === "L03.90" || row.normalizedCode === "L0390")).toBe(true);
    expect(plan.acceptedTerminology.some((row) => row.normalizedCode === "L03")).toBe(false);
    expect(
      plan.rejected.filter((row) => row.normalizedCode === "L03").every((row) => row.reason === "NOT_SELECTABLE_CATEGORY_HEADER"),
    ).toBe(true);
  });

  it("resolves R10.85 FR/ES exact governed labels when the FY2026 catalog identity exists", () => {
    const catalog = {
      id: "cat-r1085",
      code: "R10.85",
      normalizedCode: "R1085",
      codeSystem: "ICD-10-CM" as const,
      releaseVersion: "FY2026",
      shortDescription: "Abdominal pain, unspecified site",
      longDescription: "Abdominal pain, unspecified site",
    };
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map([["R1085", catalog]]),
      expectedReleaseVersion: "FY2026",
    });
    const frRow = plan.acceptedTerminology.find((row) => row.locale === "fr")!;
    const esRow = plan.acceptedTerminology.find((row) => row.locale === "es")!;
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "fr",
      catalog,
      terminologyRows: [frRow],
    });
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "es",
      catalog,
      terminologyRows: [esRow],
    });
    expect(fr.displayName).toBe("Douleur abdominale à plusieurs sites");
    expect(es.displayName).toBe("Dolor abdominal en varios sitios");
    expect(mapIcd10ExactnessToDisplayResolution(fr.exactness)).toBe("EXACT_GOVERNED_LABEL");
    expect(mapIcd10ExactnessToDisplayResolution(es.exactness)).toBe("EXACT_GOVERNED_LABEL");
  });
});

describe("MEDUI.TRILANG.DX.P2.1 certification gates", () => {
  const incomplete = {
    release: "FY2026",
    totalSearchable: 74719,
    enExact: 74719,
    frExact: 89,
    esExact: 89,
    missingEn: 0,
    missingFr: 74630,
    missingEs: 74630,
    codeOnlyEn: 0,
    codeOnlyFr: 74630,
    codeOnlyEs: 74630,
    categorySubstitutions: 0,
    invalidTerminologyCodes: 0,
    orphanTerminology: 0,
    duplicateActivePreferredLabels: 0,
    duplicateEffectiveClinicianLabels: 0,
    crossLanguageFallback: 0,
    aliasUsedAsDisplay: 0,
    consumerUsedAsClinician: 0,
    canonicalCodeMutations: 0,
    expectedBillableRows: 74719,
  };

  it("lets SAFE_ARCHITECTURE pass while FULL_TRILINGUAL_COVERAGE stays fail", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(gates.SAFE_ARCHITECTURE).toBe(true);
    expect(gates.FULL_TRILINGUAL_COVERAGE).toBe(false);
  });

  it("does not treat identical FR/ES cognates of English catalog text as cross-language fallback", () => {
    const catalog = {
      id: "cat-r002",
      code: "R00.2",
      normalizedCode: "R002",
      codeSystem: "ICD-10-CM" as const,
      releaseVersion: "FY2026",
      shortDescription: "Palpitations",
      longDescription: "Palpitations",
    };
    const plan = buildGovernedIcd10TerminologySeedPlan({
      catalogByNormalizedCode: new Map([["R002", catalog]]),
      expectedReleaseVersion: "FY2026",
    });
    const frRow = plan.acceptedTerminology.find((row) => row.locale === "fr")!;
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      locale: "fr",
      catalog,
      terminologyRows: [frRow],
    });
    expect(fr.displayName).toBe("Palpitations");
    expect(fr.exactness).toBe("EXACT_GOVERNED");
    expect(fr.provenance).toBe("MEDORA_GOVERNED");
    expect(fr.exactness).not.toBe("EXACT_SOURCE");
  });

  it("fails SAFE_ARCHITECTURE on category substitution or alias-as-display", () => {
    expect(evaluateIcd10MultilingualCertification({ ...incomplete, categorySubstitutions: 1 }).SAFE_ARCHITECTURE).toBe(
      false,
    );
    expect(evaluateIcd10MultilingualCertification({ ...incomplete, aliasUsedAsDisplay: 1 }).SAFE_ARCHITECTURE).toBe(
      false,
    );
  });
});
