import { describe, expect, it } from "vitest";
import { CLINICAL_DOCUMENTATION_CARDS } from "./clinicalDocumentationRegistry.js";
import { cardHasRegisteredPayloadValidator } from "./clinicalDocumentationPayloadGovernance.js";
import {
  EDOC_BASIC_STRUCTURED_CARD_ID,
  buildClinicalDocumentationFallbackSummaryLines,
  ensureClinicalDocumentationLegalDisplaySummary,
  mapClinicalDocumentationEntryForLegalChart,
  selectClinicalDocumentationPayloadSummary,
} from "./clinicalDocumentationEntry.js";
import {
  NG_OG_TUBE_MONITORING_CARD_ID,
  summarizeDeviceLineTubeDrainMonitoringPayload,
} from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
import { PROCEDURE_TIMEOUT_CARD_ID } from "./proceduralSafetyThrombolyticPayloads.js";
import { PATIENT_EDUCATION_SESSION_CARD_ID } from "./patientEducationDischargeTeachingDocumentationPayloads.js";

const NG_OG_PAYLOAD = {
  assessmentTime: "2026-05-28T14:00:00.000Z",
  tubeType: "NG",
  placementVerified: "YES",
  markingAtNares: "22 cm",
  suctionActive: "NO",
  drainagePresent: "YES",
  drainageAppearance: "CLEAR",
  providerNotified: "NO",
} as const;

describe("clinicalDocumentationLegalDisplay (EDOC.LEGAL.1)", () => {
  it("ensureClinicalDocumentationLegalDisplaySummary never returns empty for unknown cardId", () => {
    const lines = ensureClinicalDocumentationLegalDisplaySummary(
      "legacy_unknown_card_xyz",
      { fieldA: "x", fieldB: 1 },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.key === "Documentation type")).toBe(true);
    expect(lines.some((l) => l.key === "Structured payload saved" && l.value === "Yes")).toBe(true);
    expect(lines.some((l) => l.key === "Payload fields" && l.value === "2")).toBe(true);
  });

  it("English fallback is English", () => {
    const lines = buildClinicalDocumentationFallbackSummaryLines("hidden_legacy_card", {}, "en");
    expect(lines.some((l) => l.key === "Documentation type")).toBe(true);
    expect(lines.some((l) => l.key === "Données structurées enregistrées")).toBe(false);
  });

  it("French fallback is French", () => {
    const lines = buildClinicalDocumentationFallbackSummaryLines("hidden_legacy_card", {}, "fr");
    expect(lines.some((l) => l.key === "Type de documentation")).toBe(true);
    expect(lines.some((l) => l.key === "Structured payload saved")).toBe(false);
  });

  it("hidden/deprecated card fallback uses cardId title resolution", () => {
    const lines = ensureClinicalDocumentationLegalDisplaySummary(
      "resp_oxygen_therapy",
      { note: "legacy" },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]?.value).toBeTruthy();
  });

  it("NG/OG summary includes tube type and monitoring fields", () => {
    const en = summarizeDeviceLineTubeDrainMonitoringPayload(
      NG_OG_TUBE_MONITORING_CARD_ID,
      NG_OG_PAYLOAD,
      "en"
    );
    expect(en.some((l) => l.key === "Tube type" && l.value === "NG")).toBe(true);
    expect(en.some((l) => l.key === "Placement verified")).toBe(true);
    expect(en.some((l) => l.key === "Suction active")).toBe(true);
    expect(en.some((l) => l.key === "Drainage appearance")).toBe(true);
    expect(en.some((l) => l.key === "Provider notified")).toBe(true);

    const fr = summarizeDeviceLineTubeDrainMonitoringPayload(
      NG_OG_TUBE_MONITORING_CARD_ID,
      NG_OG_PAYLOAD,
      "fr"
    );
    expect(fr.some((l) => l.key === "Type de sonde")).toBe(true);
  });

  it("mapClinicalDocumentationEntryForLegalChart always includes non-empty summaries", () => {
    const mapped = mapClinicalDocumentationEntryForLegalChart({
      id: "edoc-ng",
      encounterId: "enc1",
      patientId: "pat1",
      category: "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      cardId: NG_OG_TUBE_MONITORING_CARD_ID,
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane",
      authorRoleSnapshot: "RN",
      createdAt: "2026-05-28T12:00:00.000Z",
      payloadJson: NG_OG_PAYLOAD,
      voidedAt: null,
    });
    expect(mapped.patientId).toBe("pat1");
    expect(mapped.payloadSummaryEn.length).toBeGreaterThan(0);
    expect(mapped.payloadSummaryFr.length).toBeGreaterThan(0);
    expect(mapped.payloadSummary).toEqual(mapped.payloadSummaryEn);
    expect(mapped.payloadSummaryEn.some((l) => l.key === "Tube type")).toBe(true);
  });

  it("selectClinicalDocumentationPayloadSummary uses fallback when card summary route missing", () => {
    const lines = selectClinicalDocumentationPayloadSummary(
      {
        cardId: "legacy_foundation_only_card",
        payloadJson: { customField: "value" },
      },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => l.key === "Payload fields")).toBe(true);
  });

  it("AVAILABLE cards have validator or basic structured allowance", () => {
    const available = CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.implementationStatus === "AVAILABLE");
    for (const card of available) {
      const allowedGeneric = card.id === EDOC_BASIC_STRUCTURED_CARD_ID;
      const hasValidator = cardHasRegisteredPayloadValidator(card.id);
      expect(allowedGeneric || hasValidator).toBe(true);
    }
  });

  it("representative high-risk cards produce legal display metadata", () => {
    const samples: Array<{ cardId: string; category: string; payload: Record<string, unknown> }> = [
      { cardId: NG_OG_TUBE_MONITORING_CARD_ID, category: "DEVICE_LINE_TUBE_DRAIN_MONITORING", payload: NG_OG_PAYLOAD },
      { cardId: PROCEDURE_TIMEOUT_CARD_ID, category: "PROCEDURE_MONITORING", payload: { orphan: true } },
      {
        cardId: PATIENT_EDUCATION_SESSION_CARD_ID,
        category: "PATIENT_EDUCATION_AND_DISCHARGE_TEACHING",
        payload: { orphan: true },
      },
    ];
    for (const sample of samples) {
      const mapped = mapClinicalDocumentationEntryForLegalChart({
        id: `edoc-${sample.cardId}`,
        encounterId: "enc1",
        patientId: "pat1",
        category: sample.category,
        cardId: sample.cardId,
        authorUserId: "u1",
        authorDisplayNameSnapshot: "Jane",
        authorRoleSnapshot: "RN",
        createdAt: "2026-05-28T12:00:00.000Z",
        payloadJson: sample.payload,
        voidedAt: null,
      });
      expect(mapped.cardTitleEn.length).toBeGreaterThan(0);
      expect(mapped.category).toBe(sample.category);
      expect(mapped.authorRoleTitle).toBe("RN");
      expect(mapped.payloadSummaryEn.length).toBeGreaterThan(0);
      expect(mapped.payloadSummaryFr.length).toBeGreaterThan(0);
    }
  });
});
