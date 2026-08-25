/**
 * MEDUI.CP.1F addendum — enterprise Care Plan template catalog expansion tests.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CARE_PLAN_SUGGESTION_TEMPLATE_IDS,
} from "./encounterCarePlanSuggestionsCp1d.js";
import {
  activateCarePlanFromTemplate,
  assertTemplateUnchangedAfterActivation,
  ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG,
  getCarePlanTemplate,
  listActiveCarePlanTemplates,
  previewCarePlanTemplate,
  searchCarePlanTemplates,
} from "./enterpriseInterdisciplinaryCarePlansD4b6.js";
import {
  CARE_PLAN_LEGACY_STARTER_TEMPLATE_IDS,
  CARE_PLAN_TEMPLATE_CATEGORIES,
} from "./enterpriseCarePlanTemplateLibraryCp1f.js";

const REQUIRED_KINDS = [
  "FOCUS",
  "GOAL",
  "OUTCOME",
  "INTERVENTION",
  "MONITORING",
  "EDUCATION",
] as const;

describe("MEDUI.CP.1F Care Plan template catalog expansion", () => {
  const active = listActiveCarePlanTemplates();

  it("keeps template IDs unique across the canonical catalog", () => {
    const ids = ENTERPRISE_CARE_PLAN_TEMPLATE_CATALOG.map((t) => t.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps active catalog in the curated 40–60 band with valid required fields", () => {
    expect(active.length).toBeGreaterThanOrEqual(40);
    expect(active.length).toBeLessThanOrEqual(60);
    for (const tpl of active) {
      expect(tpl.governanceStatus).toBe("ACTIVE");
      expect(tpl.selectedInD4b6).toBe(true);
      expect(tpl.sourceImmutableOnActivation).toBe(true);
      expect(tpl.autoActivateFromDiagnosisAlone).toBe(false);
      expect(tpl.titleKey.length).toBeGreaterThan(0);
      expect(tpl.descriptionKey.length).toBeGreaterThan(0);
      expect(tpl.category).toBeTruthy();
      expect(CARE_PLAN_TEMPLATE_CATEGORIES).toContain(tpl.category);
      expect(tpl.components.length).toBeGreaterThanOrEqual(6);
      const kinds = new Set(tpl.components.map((c) => c.kind));
      for (const kind of REQUIRED_KINDS) {
        expect(kinds.has(kind)).toBe(true);
      }
      for (const c of tpl.components) {
        expect(c.isRecommendationNotOrder).toBe(true);
        expect(c.titleKey.length).toBeGreaterThan(0);
        expect(c.bodyKey.length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves common clinical search aliases without duplicate synonym templates", () => {
    const cases: Array<[string, string]> = [
      ["CHF", "chf"],
      ["COPD", "copd_exacerbation"],
      ["decubitus", "pressure_injury_risk"],
      ["AMS", "altered_mental_status"],
      ["CVA", "stroke_supportive"],
      ["DM", "diabetes_support"],
      ["diabetes", "diabetes_support"],
      ["AKI", "aki_support"],
      ["N/V", "nausea_vomiting"],
      ["skin", "pressure_injury_risk"],
    ];
    for (const [q, expectedId] of cases) {
      const hits = searchCarePlanTemplates(q);
      expect(hits.some((t) => t.templateId === expectedId)).toBe(true);
    }
  });

  it("filters by clinical category without a second catalog engine", () => {
    const respiratory = searchCarePlanTemplates("", "RESPIRATORY");
    expect(respiratory.length).toBeGreaterThan(0);
    expect(respiratory.every((t) => t.category === "RESPIRATORY")).toBe(true);
    const all = searchCarePlanTemplates("", "ALL");
    expect(all.length).toBe(active.length);
  });

  it("provides EN/FR clinician labels for every active template key leaf", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = join(here, "../../../../");
    const enSrc = readFileSync(
      join(repoRoot, "packages/shared/src/clinicalDocumentation/enterpriseCarePlanTemplateClinicalText.en.ts"),
      "utf8"
    );
    const frSrc = readFileSync(
      join(repoRoot, "packages/shared/src/clinicalDocumentation/enterpriseCarePlanTemplateClinicalText.fr.ts"),
      "utf8"
    );
    for (const tpl of active) {
      const titleLeaf = tpl.titleKey.split(".").pop();
      const descLeaf = tpl.descriptionKey.split(".").pop();
      // titleKey ends with .title under templates.<camel>
      const camel = tpl.titleKey.replace(
        /^enterpriseInterdisciplinaryCarePlansD4b6\.templates\./,
        ""
      ).replace(/\.title$/, "");
      expect(enSrc).toContain(`${camel}:`);
      expect(frSrc).toContain(`${camel}:`);
      expect(titleLeaf).toBe("title");
      expect(descLeaf).toBe("description");
      expect(enSrc).toContain("title:");
      expect(frSrc).toContain("title:");
    }
  });

  it("preview is read-only and causes zero writes / no patient plan", () => {
    const before = JSON.stringify(getCarePlanTemplate("impaired_gas_exchange"));
    const preview = previewCarePlanTemplate("impaired_gas_exchange");
    expect(preview.found).toBe(true);
    expect(preview.bedsideActivatable).toBe(true);
    expect(preview.doesNotAutoActivateFromDiagnosis).toBe(true);
    expect(preview.sourceImmutable).toBe(true);
    expect(JSON.stringify(getCarePlanTemplate("impaired_gas_exchange"))).toBe(before);
    expect(preview.template?.autoActivateFromDiagnosisAlone).toBe(false);
  });

  it("activation creates one patient-specific plan and leaves source unchanged after personalization", () => {
    const before = getCarePlanTemplate("impaired_gas_exchange")!;
    const snapshot = JSON.stringify(before);
    const result = activateCarePlanFromTemplate({
      planId: "cp1f-plan-1",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      templateId: "impaired_gas_exchange",
      activatedByUserId: "nurse-42",
      activatedAt: "2026-08-25T18:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      customizations: [
        {
          sourceTemplateComponentId: "impaired_gas_exchange_goal",
          body: "Patient-specific SpO2 goal personalized",
        },
      ],
    });
    expect(result.accepted).toBe(true);
    expect(result.plan?.activatedByUserId).toBe("nurse-42");
    expect(result.plan?.sourceTemplateId).toBe("impaired_gas_exchange");
    expect(result.plan?.sourceTemplateNotMutated).toBe(true);
    expect(result.plan?.doesNotCreateProviderOrders).toBe(true);
    expect(result.plan?.doesNotAlterMar).toBe(true);
    expect(result.plan?.isNotDiagnosis).toBe(true);
    expect(result.plan?.doesNotMutateProblemList).toBe(true);
    expect(result.plan?.doesNotAuthorizeDischarge).toBe(true);
    expect(
      result.plan?.components.some((c) => c.body === "Patient-specific SpO2 goal personalized")
    ).toBe(true);
    const after = getCarePlanTemplate("impaired_gas_exchange")!;
    expect(assertTemplateUnchangedAfterActivation(before, after)).toBe(true);
    expect(JSON.stringify(after)).toBe(snapshot);
  });

  it("preserves immutable authorship attribution on activation", () => {
    const result = activateCarePlanFromTemplate({
      planId: "cp1f-plan-2",
      encounterId: "e2",
      patientId: "p2",
      facilityId: "f1",
      templateId: "fall_risk",
      activatedByUserId: "rn-author-9",
      activatedAt: "2026-08-25T18:05:00.000Z",
      careSetting: "OBSERVATION",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    });
    expect(result.accepted).toBe(true);
    expect(result.plan?.activatedByUserId).toBe("rn-author-9");
    expect(result.plan?.activatedAt).toBe("2026-08-25T18:05:00.000Z");
  });

  it("keeps existing eight starter templates backward compatible", () => {
    for (const id of CARE_PLAN_LEGACY_STARTER_TEMPLATE_IDS) {
      const tpl = getCarePlanTemplate(id);
      expect(tpl).toBeTruthy();
      expect(tpl?.governanceStatus).toBe("ACTIVE");
      expect(tpl?.selectedInD4b6).toBe(true);
      expect(tpl?.category).toBeTruthy();
      expect(active.some((t) => t.templateId === id)).toBe(true);
    }
  });

  it("keeps CP.1D suggestions resolving to the same canonical template IDs only", () => {
    expect([...CARE_PLAN_SUGGESTION_TEMPLATE_IDS]).toEqual([
      "fall_risk",
      "impaired_mobility",
      "pressure_injury_risk",
      "aspiration_risk",
    ]);
    for (const id of CARE_PLAN_SUGGESTION_TEMPLATE_IDS) {
      expect(getCarePlanTemplate(id)?.governanceStatus).toBe("ACTIVE");
    }
    // Catalog expansion ≠ CDS expansion
    expect(CARE_PLAN_SUGGESTION_TEMPLATE_IDS).not.toContain("copd_exacerbation");
    expect(CARE_PLAN_SUGGESTION_TEMPLATE_IDS).not.toContain("sepsis_supportive");
  });

  it("does not surface governance jargon as clinician-facing active template titles", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = join(here, "../../../../");
    const enSrc = readFileSync(
      join(repoRoot, "packages/shared/src/clinicalDocumentation/enterpriseCarePlanTemplateClinicalText.en.ts"),
      "utf8"
    );
    const frSrc = readFileSync(
      join(repoRoot, "packages/shared/src/clinicalDocumentation/enterpriseCarePlanTemplateClinicalText.fr.ts"),
      "utf8"
    );
    for (const tpl of active) {
      const camel = tpl.titleKey
        .replace(/^enterpriseInterdisciplinaryCarePlansD4b6\.templates\./, "")
        .replace(/\.title$/, "");
      for (const src of [enSrc, frSrc]) {
        expect(src).toContain(`${camel}:`);
        const titleMatch = src.match(new RegExp(`${camel}:\\s*\\{[\\s\\S]*?title:\\s*"([^"]*)"`, "m"));
        expect(titleMatch, `missing title for ${camel}`).toBeTruthy();
        const title = titleMatch![1];
        expect(title.toLowerCase()).not.toContain("d4b");
        expect(title.toLowerCase()).not.toContain("certification");
        expect(title.toLowerCase()).not.toContain("json");
        expect(title).not.toBe(tpl.templateId);
      }
    }
    const catalogUi = readFileSync(
      join(
        repoRoot,
        "apps/web/src/features/clinical-documentation/EnterpriseInterdisciplinaryCarePlansD4b6.tsx"
      ),
      "utf8"
    );
    expect(catalogUi).toContain("t(tpl.titleKey)");
    expect(catalogUi).toContain("t(tpl.descriptionKey)");
    expect(catalogUi).not.toMatch(/<strong[^>]*>\{\s*tpl\.templateId\s*\}<\/strong>/);
  });
});
