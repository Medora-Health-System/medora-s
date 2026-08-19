import { describe, expect, it } from "vitest";
import { validatePayloadForCard } from "../clinicalDocumentation/observationDocumentationPayloads.js";
import {
  NURSING_ADMISSION_WRITE_THROUGH_CERTIFICATION_ID,
  buildNursingAdmissionWriteThrough,
  sectionNeedsAuthoritativeEdocWriteThrough,
} from "./nursingAdmissionAuthoritativeWriteThroughInp2b2b.js";
import { emptyMedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { projectNursingSectionCompletion } from "./nursingAdmissionDomainIntegrationD4a25a.js";

describe("MEDUI.INP.2B.2B nursing admission write-through", () => {
  it("certifies write-through without fabricating a second clinical engine", () => {
    expect(NURSING_ADMISSION_WRITE_THROUGH_CERTIFICATION_ID).toBe("MEDUI.INP.2B.2B");
    expect(sectionNeedsAuthoritativeEdocWriteThrough("PAIN")).toBe(true);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("FALL_SAFETY")).toBe(true);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("SKIN_WOUND")).toBe(true);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("BELONGINGS_VALUABLES")).toBe(true);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("EDUCATION_COMMUNICATION")).toBe(true);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("FUNCTIONAL_MOBILITY")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("NUTRITION")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("ELIMINATION")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("PSYCHOSOCIAL")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("HOME_MEDICATIONS")).toBe(false);
    expect(sectionNeedsAuthoritativeEdocWriteThrough("LINES_DRAINS_DEVICES")).toBe(false);
  });

  it("maps pain absence onto the existing initial pain EDOC card", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "PAIN",
      answers: { painPresent: "NO", rapidPainPresence: "NO_PAIN" },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.skip) throw new Error("expected pain write-through");
    expect(plan.cardId).toBe("pain_initial_assessment");
    expect(plan.domain).toBe("PAIN_EDOC13");
    expect(validatePayloadForCard(plan.cardId, plan.payload).ok).toBe(true);
    expect(plan.payload.painScore).toBe(0);
  });

  it("maps fall precautions onto safety_precautions_documentation, not Morse invention", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "FALL_SAFETY",
      answers: {
        fallPriorMonths: "NO",
        rapidFallPrecautions: ["BED_ALARM", "CALL_LIGHT", "NONSKID"],
      },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.skip) throw new Error("expected fall write-through");
    expect(plan.cardId).toBe("safety_precautions_documentation");
    expect(plan.payload.bedAlarmActive).toBe(true);
    expect(validatePayloadForCard(plan.cardId, plan.payload).ok).toBe(true);
  });

  it("maps intact skin onto skin_integrity_assessment", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "SKIN_WOUND",
      answers: { rapidSkinStatus: "INTACT", pressureInjury: "NO", openWound: "NO" },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.skip) throw new Error("expected skin write-through");
    expect(plan.cardId).toBe("skin_integrity_assessment");
    expect(plan.payload.skinStatus).toBe("INTACT");
    expect(validatePayloadForCard(plan.cardId, plan.payload).ok).toBe(true);
  });

  it("refuses to invent an intact skin EDOC when the screen is not assessed", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "SKIN_WOUND",
      answers: { rapidSkinStatus: "NOT_ASSESSED" },
    });
    expect(plan.ok).toBe(false);
  });

  it("maps belongings presence onto belongings_inventory", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "BELONGINGS_VALUABLES",
      answers: {
        rapidBelongingsPresent: "YES",
        inventoryReviewed: "YES",
        valuablesPresent: "NO",
      },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.skip) throw new Error("expected belongings write-through");
    expect(plan.cardId).toBe("belongings_inventory");
    expect(validatePayloadForCard(plan.cardId, plan.payload).ok).toBe(true);
  });

  it("maps teach-back onto patient_education_session", () => {
    const plan = buildNursingAdmissionWriteThrough({
      sectionId: "EDUCATION_COMMUNICATION",
      answers: { teachBack: "YES" },
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.skip) throw new Error("expected education write-through");
    expect(plan.cardId).toBe("patient_education_session");
    expect(validatePayloadForCard(plan.cardId, plan.payload).ok).toBe(true);
  });

  it("does not require an EDOC UUID for functional, nutrition, elimination, or psychosocial completion", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    for (const sectionId of ["FUNCTIONAL_MOBILITY", "NUTRITION", "ELIMINATION", "PSYCHOSOCIAL"] as const) {
      const projection = projectNursingSectionCompletion({
        doc: {
          ...doc,
          sections: {
            ...doc.sections,
            [sectionId]: {
              sectionId,
              completionState: "COMPLETE",
              expectedVersion: 1,
              answers: { rapidMobility: "INDEPENDENT", rapidNutritionOk: "YES", rapidEliminationOk: "YES" },
            },
          },
        },
        sectionId,
      });
      expect(projection.requiresDomainRecord).toBe(false);
      expect(projection.projectedState).toBe("COMPLETE");
    }
  });
});
