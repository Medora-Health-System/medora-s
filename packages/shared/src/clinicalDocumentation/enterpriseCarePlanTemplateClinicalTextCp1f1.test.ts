/**
 * MEDUI.CP.1F.1 — Care Plan template clinical text resolution tests.
 */

import { describe, expect, it } from "vitest";
import {
  activateCarePlanFromTemplate,
  getCarePlanTemplate,
  listActiveCarePlanTemplates,
  previewCarePlanTemplate,
} from "./enterpriseInterdisciplinaryCarePlansD4b6.js";
import {
  CANONICAL_CARE_PLAN_TEMPLATE_I18N_KEYS,
  isCanonicalCarePlanTemplateI18nKey,
  resolveCarePlanClinicalNarrative,
  resolveCarePlanClinicalNarrativeForClinician,
  resolveCarePlanTemplateI18nKey,
  resolveEnterpriseCarePlanTemplateClinicalText,
} from "./enterpriseCarePlanTemplateClinicalTextCp1f1.js";
import { projectEncounterCarePlanMedicalRecord } from "./encounterCarePlanMedicalRecordProjectionCp1b.js";

const KEY_PREFIX = "enterpriseInterdisciplinaryCarePlansD4b6.templates.";

describe("MEDUI.CP.1F.1 Care Plan clinical text resolution", () => {
  const active = listActiveCarePlanTemplates();

  it("resolves impaired mobility template fields to clinician-readable text", () => {
    const template = getCarePlanTemplate("impaired_mobility");
    expect(template).toBeTruthy();
    const resolved = resolveEnterpriseCarePlanTemplateClinicalText({
      template: template!,
      locale: "en",
    });
    expect(resolved.title).toBe("Impaired mobility");
    const goal = resolved.components.find((c) => c.componentId === "mob_goal");
    expect(goal?.body).toContain("safe mobility");
    expect(goal?.body).not.toContain(KEY_PREFIX);
    expect(isCanonicalCarePlanTemplateI18nKey(goal?.body ?? "")).toBe(false);
  });

  it("resolves all active templates without returning their own i18n keys", () => {
    for (const tpl of active) {
      for (const locale of ["en", "fr"] as const) {
        const resolved = resolveEnterpriseCarePlanTemplateClinicalText({ template: tpl, locale });
        expect(resolved.title).not.toBe(tpl.titleKey);
        expect(resolved.title.length).toBeGreaterThan(0);
        expect(isCanonicalCarePlanTemplateI18nKey(resolved.title)).toBe(false);
        for (const c of resolved.components) {
          expect(c.title).not.toBe(c.componentId);
          expect(isCanonicalCarePlanTemplateI18nKey(c.title)).toBe(false);
          expect(isCanonicalCarePlanTemplateI18nKey(c.body)).toBe(false);
          if (c.body) expect(c.body).not.toContain(".goalBody");
        }
      }
    }
  });

  it("activates patient plan with clinical narrative snapshots, not localization keys", () => {
    const result = activateCarePlanFromTemplate({
      planId: "cp1f1-plan",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      templateId: "impaired_mobility",
      activatedByUserId: "rn-a",
      activatedAt: "2026-08-25T20:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
      clinicalLocale: "fr",
    });
    expect(result.accepted).toBe(true);
    expect(result.plan?.title).not.toContain(KEY_PREFIX);
    for (const c of result.plan?.components ?? []) {
      expect(isCanonicalCarePlanTemplateI18nKey(c.title)).toBe(false);
      expect(isCanonicalCarePlanTemplateI18nKey(c.body)).toBe(false);
    }
    const template = getCarePlanTemplate("impaired_mobility")!;
    expect(template.titleKey).toContain(KEY_PREFIX);
  });

  it("preserves source template immutability after activation with resolved text", () => {
    const before = JSON.stringify(getCarePlanTemplate("fall_risk"));
    activateCarePlanFromTemplate({
      planId: "cp1f1-fall",
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      templateId: "fall_risk",
      activatedByUserId: "rn-a",
      activatedAt: "2026-08-25T20:00:00.000Z",
      careSetting: "INPATIENT",
      roleProfile: "NURSE_CARE_PLAN_AUTHOR",
    });
    expect(JSON.stringify(getCarePlanTemplate("fall_risk"))).toBe(before);
  });

  it("projects recognized legacy template keys read-only without mutating unknown narrative", () => {
    const legacyKey =
      "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goalBody";
    const unknown = "Patient will walk twice daily with assist.";
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "plan-legacy",
          title: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.title",
          templateId: "impaired_mobility",
          status: "ACTIVE",
          components: [
            {
              componentType: "GOAL",
              title: legacyKey,
              text: legacyKey,
              createdAt: "2026-08-25T12:00:00.000Z",
            },
            {
              componentType: "GOAL",
              title: "Custom goal",
              text: unknown,
              createdAt: "2026-08-25T12:00:00.000Z",
            },
          ],
        },
      ],
    });
    const goals = projection.currentPlans[0]?.goals ?? [];
    expect(goals[0]?.text).not.toBe(legacyKey);
    expect(goals[0]?.text.length).toBeGreaterThan(10);
    expect(goals[1]?.text).toBe(unknown);
  });

  it("preview catalog metadata remains template-based without persisting keys", () => {
    const preview = previewCarePlanTemplate("impaired_mobility");
    expect(preview.found).toBe(true);
    expect(preview.template?.components.some((c) => c.bodyKey.includes(KEY_PREFIX))).toBe(true);
    const resolved = resolveEnterpriseCarePlanTemplateClinicalText({
      template: preview.template!,
      locale: "en",
    });
    expect(resolved.components.every((c) => !c.body.includes(KEY_PREFIX))).toBe(true);
  });

  it("allowlists only canonical template localization keys", () => {
    expect(CANONICAL_CARE_PLAN_TEMPLATE_I18N_KEYS.size).toBeGreaterThan(100);
    expect(
      isCanonicalCarePlanTemplateI18nKey(
        "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goalBody"
      )
    ).toBe(true);
    expect(isCanonicalCarePlanTemplateI18nKey("Patient will ambulate safely.")).toBe(false);
    expect(
      isCanonicalCarePlanTemplateI18nKey("some.random.key.with.periods.but.not.canonical")
    ).toBe(false);
  });

  it("resolves FR clinical text independently from EN", () => {
    const key = "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goalBody";
    const en = resolveCarePlanTemplateI18nKey(key, "en");
    const fr = resolveCarePlanTemplateI18nKey(key, "fr");
    expect(en).toBeTruthy();
    expect(fr).toBeTruthy();
    expect(en).not.toBe(fr);
    expect(resolveCarePlanClinicalNarrative("Clinician free-text correction.", "fr")).toBe(
      "Clinician free-text correction."
    );
  });

  it("CP.1F.2 correction prefill resolves recognized template keys to clinical text", () => {
    const key =
      "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goalBody";
    const prefill = resolveCarePlanClinicalNarrativeForClinician(key, "en");
    expect(prefill).toContain("safe mobility");
    expect(isCanonicalCarePlanTemplateI18nKey(prefill)).toBe(false);
    expect(prefill).not.toContain(KEY_PREFIX);
  });

  it("CP.1F.2 correction prefill preserves ordinary clinician narrative", () => {
    const narrative = "Patient will walk twice daily with assist of one.";
    expect(resolveCarePlanClinicalNarrativeForClinician(narrative, "fr")).toBe(narrative);
  });

  it("CP.1F.2 History field kinds resolve clinical narrative for impaired mobility", () => {
    const template = getCarePlanTemplate("impaired_mobility")!;
    const kinds = ["goalBody", "outcomeBody", "interventionBody", "monitoringBody", "educationBody"];
    for (const leaf of kinds) {
      const key = `enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.${leaf}`;
      const resolved = resolveCarePlanClinicalNarrativeForClinician(key, "en");
      expect(resolved.length).toBeGreaterThan(8);
      expect(isCanonicalCarePlanTemplateI18nKey(resolved)).toBe(false);
      expect(resolved).not.toContain(".goalBody");
    }
    expect(template.components.some((c) => c.bodyKey.includes("goalBody"))).toBe(true);
  });

  it("CP.1F.2 clinician display never returns raw canonical keys as fallback", () => {
    const bogusButCanonicalLooking = resolveCarePlanClinicalNarrativeForClinician(
      "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.goalBody",
      "en"
    );
    expect(bogusButCanonicalLooking).not.toContain(KEY_PREFIX);
  });

  it("CP.1F.2 Summary projection of exact keys contains no template key clinical text", () => {
    const key =
      "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.goalBody";
    const projection = projectEncounterCarePlanMedicalRecord({
      plans: [
        {
          id: "plan-hist",
          title: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.title",
          templateId: "impaired_mobility",
          status: "ACTIVE",
          components: [
            {
              componentType: "GOAL",
              title: key,
              text: key,
              sourceTemplateComponentId: "mob_goal",
              createdAt: "2026-08-25T12:00:00.000Z",
            },
            {
              componentType: "INTERVENTION",
              title:
                "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.interventionBody",
              text:
                "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.interventionBody",
              sourceTemplateComponentId: "mob_intervention",
              monitoringJson: undefined,
              educationJson: undefined,
              createdAt: "2026-08-25T12:00:00.000Z",
            },
          ],
        },
      ],
    });
    const clinical = JSON.stringify([
      projection.currentPlans[0]?.goals,
      projection.currentPlans[0]?.interventions,
    ]);
    expect(clinical).not.toContain(KEY_PREFIX);
    expect(clinical).not.toContain(".goalBody");
  });
});
