import { describe, expect, it } from "vitest";
import {
  WAVE4_ONDANSETRON_IV_CATALOG_CODE,
  inferWave4AdministrationType,
  resolveWave4CatalogAdministrationType,
  validateWave4MarAdministrationTypePolicy,
  validateWave4OndansetronAdministrationType,
} from "./wave4AdministrationTypeRemediation.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";

describe("wave4AdministrationTypeRemediation (M1.7C.6)", () => {
  it("infers PUSH for intraveineuse injectable (never INJECTION)", () => {
    expect(
      inferWave4AdministrationType(
        {
          catalogCode: "TEST_IV_PUSH",
          explicitAdministrationType: "INJECTION",
          route: "intraveineuse",
          dosageForm: "injectable",
        },
        {},
        {}
      )
    ).toBe("PUSH");
  });

  it("inherits prior-wave PUSH over unsafe explicit INJECTION", () => {
    expect(
      inferWave4AdministrationType(
        {
          catalogCode: WAVE4_ONDANSETRON_IV_CATALOG_CODE,
          explicitAdministrationType: "INJECTION",
          route: "intraveineuse",
          dosageForm: "injectable",
        },
        {},
        { [WAVE4_ONDANSETRON_IV_CATALOG_CODE]: "PUSH" }
      )
    ).toBe("PUSH");
  });

  it("inherits prior-wave INFUSION for amiodarone push amp", () => {
    expect(
      inferWave4AdministrationType(
        {
          catalogCode: "AMIODARONE_150MG_3ML_IV",
          explicitAdministrationType: "INJECTION",
          route: "intraveineuse",
          dosageForm: "injectable",
        },
        { AMIODARONE_150MG_3ML_IV: "INFUSION" },
        {}
      )
    ).toBe("INFUSION");
  });

  it("infers IM for intramusculaire route", () => {
    expect(
      inferWave4AdministrationType(
        {
          catalogCode: "TEST_IM",
          route: "intramusculaire",
          dosageForm: "injectable",
        },
        {},
        {}
      )
    ).toBe("IM");
  });

  it("normalizes SUBCUTANEOUS to SQ via route inference", () => {
    expect(
      inferWave4AdministrationType(
        {
          catalogCode: "TEST_SQ",
          route: "sous-cutanée",
          dosageForm: "injectable",
        },
        {},
        {}
      )
    ).toBe("SQ");
  });

  it("seed guard keeps existing PUSH over incoming INJECTION", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "PUSH",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intraveineuse",
      catalogCode: WAVE4_ONDANSETRON_IV_CATALOG_CODE,
    });
    expect(result.value).toBe("PUSH");
    expect(result.keptExisting).toBe(true);
    expect(result.conflict).toContain("kept existing PUSH");
  });

  it("seed guard keeps existing IM over incoming INJECTION", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "IM",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intramusculaire",
      catalogCode: "TEST_IM_GUARD",
    });
    expect(result.value).toBe("IM");
    expect(result.keptExisting).toBe(true);
  });

  it("seed guard keeps existing INFUSION over incoming INJECTION", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: "INFUSION",
      incomingAdministrationType: "INJECTION",
      mode: "ENRICH",
      route: "intraveineuse",
      catalogCode: "TEST_INFUSION_GUARD",
    });
    expect(result.value).toBe("INFUSION");
    expect(result.keptExisting).toBe(true);
  });

  it("seed guard normalizes incoming SUBCUTANEOUS to SQ on CREATE", () => {
    const result = resolveWave4CatalogAdministrationType({
      existingAdministrationType: null,
      incomingAdministrationType: "SUBCUTANEOUS",
      mode: "CREATE",
      route: "sous-cutanée",
      catalogCode: "TEST_SQ_CREATE",
    });
    expect(result.value).toBe("SQ");
  });

  it("ondansetron validation requires PUSH", () => {
    expect(validateWave4OndansetronAdministrationType("PUSH")).toEqual([]);
    expect(validateWave4OndansetronAdministrationType("INJECTION").length).toBe(1);
  });

  it("generated manifest has no INJECTION or SUBCUTANEOUS", () => {
    expect(validateWave4MarAdministrationTypePolicy(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST)).toEqual([]);
    const ond = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.find(
      (e) => e.catalogCode === WAVE4_ONDANSETRON_IV_CATALOG_CODE
    );
    expect(ond?.administrationType).toBe("PUSH");
  });

  it("remediation counts match M1.7C.6 targets", () => {
    const counts = { PUSH: 0, IM: 0, SQ: 0, INFUSION: 0, INHALATION: 0, ORAL: 0 };
    for (const e of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
      const admin = (e.administrationType ?? "").toUpperCase();
      if (admin in counts) counts[admin as keyof typeof counts] += 1;
    }
    expect(counts.PUSH).toBe(67);
    expect(counts.IM).toBe(8);
    expect(counts.SQ).toBe(7);
    expect(counts.INHALATION).toBe(11);
    expect(counts.INFUSION).toBe(114);
  });
});
