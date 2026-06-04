import { describe, expect, it } from "vitest";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import {
  assertEnterpriseWave4EdHospitalFormularyManifest,
  countWave4GovernanceMarkers,
  validateEnterpriseWave4EdHospitalFormularyManifest,
  validateWave4DoubleRnPolicy,
  validateWave4HydromorphoneDoubleRnPolicy,
} from "./enterpriseWave4EdHospitalFormularyValidation.js";
import {
  WAVE4_ONDANSETRON_IV_CATALOG_CODE,
  validateWave4ClinicalReviewQueue,
  validateWave4MarAdministrationTypePolicy,
} from "./wave4AdministrationTypeRemediation.js";
import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_REQUIRED_SEARCH_PAIRS,
  validateWave4SearchPair,
} from "./enterpriseWave4EdHospitalSearchValidation.js";
import { assertEnterpriseWave4EdHospitalBillingManifest } from "./enterpriseWave4EdHospitalBillingValidation.js";

describe("M1.7C — Enterprise Wave 4 ED/Hospital formulary manifest", () => {
  it("manifest passes strict localization and billing validation", () => {
    expect(validateEnterpriseWave4EdHospitalFormularyManifest()).toEqual([]);
    expect(() => assertEnterpriseWave4EdHospitalFormularyManifest()).not.toThrow();
    expect(() => assertEnterpriseWave4EdHospitalBillingManifest()).not.toThrow();
  });

  it("meets Wave 4 size target (150–250)", () => {
    expect(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length).toBeGreaterThanOrEqual(150);
    expect(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length).toBeLessThanOrEqual(250);
  });

  it("reports governance specialty counts by ED domain", () => {
    const counts = countWave4GovernanceMarkers();
    expect(counts.highAlertCount).toBeGreaterThan(0);
    expect(counts.byBucket.RSI).toBeGreaterThan(0);
    expect(counts.byBucket.SEPSIS_ANTIBIOTICS).toBeGreaterThan(0);
    expect(counts.rsiParalyticCount).toBeGreaterThan(0);
    expect(counts.vasopressorCount).toBeGreaterThan(0);
  });

  it("hydromorphone IV push has no double RN (M1.7B.2 regression)", () => {
    expect(validateWave4HydromorphoneDoubleRnPolicy()).toEqual([]);
  });

  it("double RN policy unchanged — approved categories only", () => {
    expect(validateWave4DoubleRnPolicy()).toEqual([]);
  });

  it("all entries inactive-ready (no auto-activation flags in manifest)", () => {
    for (const entry of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
      expect(entry.isEssential).not.toBe(true);
    }
  });

  it("required ED search pairs resolve from manifest search terms", () => {
    const catalogs = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.map((e) => ({
      catalogCode: e.catalogCode,
      genericName: e.genericName,
      aliases: e.aliases,
      searchTerms: e.searchTerms,
      searchText: e.searchTerms.join(" "),
    }));
    const failures = ENTERPRISE_WAVE4_ED_HOSPITAL_REQUIRED_SEARCH_PAIRS.filter(
      (pair) => !validateWave4SearchPair(catalogs, pair).pass
    );
    expect(failures).toEqual([]);
  });

  it("M1.7C.6 — MAR administration-type policy passes (no INJECTION/SUBCUTANEOUS)", () => {
    expect(validateWave4MarAdministrationTypePolicy(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST)).toEqual([]);
    expect(validateWave4ClinicalReviewQueue(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST)).toEqual([]);
    const ond = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.find(
      (e) => e.catalogCode === WAVE4_ONDANSETRON_IV_CATALOG_CODE
    );
    expect(ond?.administrationType).toBe("PUSH");
  });
});
