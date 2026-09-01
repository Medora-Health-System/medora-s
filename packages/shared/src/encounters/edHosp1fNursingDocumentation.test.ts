import { describe, expect, it } from "vitest";
import {
  applyEdNursingTemplateToDraft,
  canCompleteEdNursingHandoff,
  composeEdNursingNarrative,
  composeEdNursingSignedBody,
  edNursingAmaIsDistinctFromElopement,
  edNursingDefaultTemplates,
  edNursingHandoffApplies,
  edNursingHandoffCompleteRequiresDocumentation,
  edNursingHandoffStatusFromErHandoff,
  edNursingTemplateBody,
  emptyEdNursingDraft,
  insertEdNursingStatement,
  isEdNursingLateEntry,
  mergeEdNursingDocumentationV1,
  projectEdHandoffChartFacts,
  readEdNursingDocumentationV1,
  removeEdNursingStatement,
  upsertEdNursingDraft,
} from "./edHosp1fNursingDocumentation.js";
import { mergeErHandoffV1IntoNursingAssessment, readErHandoffV1FromNursingAssessment } from "../erHandoffV1.js";
import { isStructuredReceivingNurseValue, encodeReceivingNurse } from "./edHosp1fStructuredDeparture.js";

describe("ED.HOSP.1F nursing documentation + handoff", () => {
  it("selects templates without signing or claiming events", () => {
    const draft = emptyEdNursingDraft({ kind: "HANDOFF", authorUserId: "u1" });
    const next = applyEdNursingTemplateToDraft(draft, "OBS_STANDARD_HANDOFF", "en");
    expect(next.templateId).toBe("OBS_STANDARD_HANDOFF");
    expect(next.templateBody).toContain("Report given to receiving RN");
    expect(next.templateBody).not.toMatch(/stable condition/i);
    expect(next.freeText).toBe("");
  });

  it("handoff and AMA/elopement templates do not claim secondary events by selection alone", () => {
    const handoffIds = [
      "OBS_STANDARD_HANDOFF",
      "ADM_STANDARD_HANDOFF",
      "ICU_CRITICAL_HANDOFF",
      "TRANSFER_STANDARD_HANDOFF",
      "TRANSFER_ALS_HANDOFF",
    ] as const;
    for (const id of handoffIds) {
      const en = edNursingTemplateBody(id, "en");
      const fr = edNursingTemplateBody(id, "fr");
      expect(en).toMatch(/Report given/i);
      expect(en).not.toMatch(/opportunity to ask|verbalized receipt|medications administered|blood products administered|provider notified/i);
      expect(fr).not.toMatch(/occasion de poser|médicaments administrés|produits sanguins|a été informé/i);
    }
    expect(edNursingTemplateBody("AMA_STANDARD", "en")).not.toMatch(/provider notified/i);
    expect(edNursingTemplateBody("AMA_STANDARD", "fr")).not.toMatch(/a été informé/i);
    expect(edNursingTemplateBody("ELOPEMENT_STANDARD", "en")).not.toMatch(/provider notified|charge nurse notified/i);
    expect(edNursingTemplateBody("ELOPEMENT_STANDARD", "fr")).not.toMatch(/ont été informés/i);
  });

  it("general templates do not claim meds, blood, critical results, or provider notification by selection alone", () => {
    const claimIds = [
      "GENERAL_MEDICATION_RESPONSE",
      "GENERAL_PROVIDER_NOTIFICATION",
      "GENERAL_CRITICAL_RESULT",
      "GENERAL_IV_FLUIDS",
      "GENERAL_BLOOD_STARTED",
      "GENERAL_BLOOD_COMPLETED",
    ] as const;
    for (const id of claimIds) {
      const en = edNursingTemplateBody(id, "en");
      const fr = edNursingTemplateBody(id, "fr");
      expect(en).toMatch(/Confirm /);
      expect(en).not.toMatch(
        /following medication administration|Provider notified|Critical result received|IV fluids infusing|administration initiated|administration completed/i
      );
      expect(fr).not.toMatch(
        /après administration médicamenteuse|Médecin informé|Résultat critique reçu|Solutés IV en cours|Administration de produit sanguin commencée|Administration de produit sanguin terminée/i
      );
    }
  });

  it("inserts quick statements without duplicates and allows removal", () => {
    const once = insertEdNursingStatement([], "IV_FLUIDS");
    const twice = insertEdNursingStatement(once, "IV_FLUIDS");
    expect(once).toEqual(["IV_FLUIDS"]);
    expect(twice).toEqual(["IV_FLUIDS"]);
    expect(removeEdNursingStatement(twice, "IV_FLUIDS")).toEqual([]);
  });

  it("composes free note, template, and statements together", () => {
    const text = composeEdNursingNarrative({
      templateBody: edNursingTemplateBody("GENERAL_REASSESSMENT", "en"),
      statementIds: ["CRITICAL_RESULT"],
      freeText: "Nurse added custom narrative.",
      locale: "en",
    });
    expect(text).toContain("Patient reassessed");
    expect(text).toContain("Critical result received");
    expect(text).toContain("Nurse added custom narrative.");
  });

  it("preserves event time separately from audit timestamps on sign body", () => {
    const signedAt = "2026-08-31T21:42:00.000Z";
    const eventAt = "2026-08-31T21:20:00.000Z";
    const body = composeEdNursingSignedBody({
      narrative: "Patient reassessed.",
      eventAt,
      locale: "en",
    });
    expect(body).toContain("Event time:");
    expect(body).toContain("Patient reassessed.");
    expect(isEdNursingLateEntry(eventAt, signedAt)).toBe(true);
    expect(isEdNursingLateEntry(signedAt, signedAt)).toBe(false);
  });

  it("persists unsigned drafts in nursingAssessment JSON without creating a legal note", () => {
    const draft = emptyEdNursingDraft({ kind: "NURSING", authorUserId: "u1" });
    draft.freeText = "Draft only";
    const store = upsertEdNursingDraft({}, draft);
    const na = mergeEdNursingDocumentationV1({}, store);
    const round = readEdNursingDocumentationV1(na);
    expect(round.drafts?.[0]?.freeText).toBe("Draft only");
    expect(JSON.stringify(na)).not.toContain("EncounterNote");
  });

  it("internal vs external receiving nurse completion gates", () => {
    expect(
      canCompleteEdNursingHandoff({
        receivingKind: "INTERNAL",
        receivingNurseName: "Patrice Nurse",
        receivingNurseUserId: "11111111-1111-4111-8111-111111111111",
        method: "BEDSIDE",
      }).ok
    ).toBe(true);
    expect(
      canCompleteEdNursingHandoff({
        receivingKind: "EXTERNAL",
        receivingNurseName: "Michelle Brown, RN",
        receivingFacilityName: "Baylor University Medical Center",
        receivingUnit: "Cardiac ICU",
        method: "TELEPHONE",
      }).ok
    ).toBe(true);
    expect(
      canCompleteEdNursingHandoff({
        receivingKind: "EXTERNAL",
        receivingNurseName: "Michelle Brown, RN",
        method: "TELEPHONE",
      }).ok
    ).toBe(false);
  });

  it("persists external receiving nurse and facility on erHandoffV1 without a user id", () => {
    const na = mergeErHandoffV1IntoNursingAssessment({}, {
      reportGiven: true,
      receivingNurseName: "Michelle Brown, RN",
      receivingFacilityName: "Baylor University Medical Center",
      receivingUnit: "Cardiac ICU",
      receivingKind: "EXTERNAL",
      handoffMethod: "TELEPHONE",
      documentationNoteId: "22222222-2222-4222-8111-222222222222",
      handoffStatus: "COMPLETED",
    });
    const read = readErHandoffV1FromNursingAssessment(na);
    expect(read.receivingNurseName).toBe("Michelle Brown, RN");
    expect(read.receivingFacilityName).toBe("Baylor University Medical Center");
    expect(read.receivingUnit).toBe("Cardiac ICU");
    expect(read.receivingNurseUserId).toBeUndefined();
  });

  it("Observation/Admission/Transfer handoff completion requires documentation, not destination", () => {
    expect(edNursingHandoffApplies("OBSERVATION")).toBe(true);
    expect(edNursingHandoffApplies("ADMISSION")).toBe(true);
    expect(edNursingHandoffApplies("TRANSFER")).toBe(true);
    expect(
      edNursingHandoffCompleteRequiresDocumentation({
        destinationPresent: true,
        reportGiven: false,
        documentationNoteId: null,
      })
    ).toBe(false);
    expect(
      edNursingHandoffCompleteRequiresDocumentation({
        destinationPresent: true,
        reportGiven: true,
        documentationNoteId: "note-1",
      })
    ).toBe(true);
    expect(edNursingHandoffStatusFromErHandoff({ reportGiven: true, documentationNoteId: "n1" })).toBe(
      "COMPLETED"
    );
  });

  it("AMA and Elopement templates remain distinct and do not require receiving RN", () => {
    expect(edNursingAmaIsDistinctFromElopement()).toBe(true);
    expect(edNursingHandoffApplies("AMA")).toBe(false);
    expect(edNursingHandoffApplies("ELOPEMENT")).toBe(false);
    expect(edNursingDefaultTemplates("NURSING", "AMA")[0]).toBe("AMA_STANDARD");
    expect(edNursingDefaultTemplates("NURSING", "ELOPEMENT")[0]).toBe("ELOPEMENT_STANDARD");
    expect(edNursingTemplateBody("AMA_STANDARD", "en")).toMatch(/against medical advice/i);
    expect(edNursingTemplateBody("ELOPEMENT_STANDARD", "en")).toMatch(/absent from assigned/i);
    expect(edNursingTemplateBody("AMA_STANDARD", "en")).not.toEqual(
      edNursingTemplateBody("ELOPEMENT_STANDARD", "en")
    );
  });

  it("does not infer medication administered, blood transfused, or diagnostics completed", () => {
    const facts = projectEdHandoffChartFacts({
      medicationOrders: [{ status: "ORDERED", displayName: "ceftriaxone" }],
      bloodOrders: [{ status: "ORDERED", displayName: "PRBC" }],
      pendingDiagnosticOrders: [{ status: "PENDING", category: "LAB" }],
      documentedMedicationsAdministered: null,
      documentedBloodAdministered: null,
    });
    expect(facts.medicationsAdministered).toBeUndefined();
    expect(facts.bloodAdministered).toBeUndefined();
    expect(facts.pendingLabs).toBeUndefined();
  });

  it("French system templates exist and nurse-authored narrative is not auto-translated", () => {
    expect(edNursingTemplateBody("OBS_STANDARD_HANDOFF", "fr")).toContain("Rapport donné");
    const authored = "Patient remains tachypneic after albuterol.";
    const composed = composeEdNursingNarrative({
      templateBody: edNursingTemplateBody("GENERAL_REASSESSMENT", "fr"),
      freeText: authored,
      locale: "fr",
    });
    expect(composed).toContain(authored);
    expect(composed).toContain("Patient réévalué");
  });

  it("HANDOFF receiving nurse encoding is structured", () => {
    const v = encodeReceivingNurse({
      source: "HANDOFF",
      userId: "11111111-1111-4111-8111-111111111111",
      displayName: "Patrice Nurse",
    });
    expect(isStructuredReceivingNurseValue(v)).toBe(true);
  });
});
