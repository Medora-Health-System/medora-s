import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  mapClinicalDocumentationEntryForLegalChart,
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  NG_OG_TUBE_MONITORING_CARD_ID,
} from "@medora/shared";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";
import type { ErPrintClinicalDocumentationEntry } from "@/features/emergency/erClinicalDocumentationPrintSection";

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

const MORSE_PAYLOAD = {
  assessmentTime: "2026-05-28T14:00:00.000Z",
  historyOfFalling: "NO",
  secondaryDiagnosis: "NO",
  ambulatoryAid: "NONE",
  ivTherapy: "NO",
  gait: "WEAK",
  mentalStatus: "ORIENTED",
  calculatedScore: 10,
  riskLevel: "LOW",
  providerNotified: false,
} as const;

const BLOOD_PRODUCT_REASSESSMENT_PAYLOAD = {
  assessmentTime: "2026-05-28T14:00:00.000Z",
  temperature: "37.2",
  heartRate: 90,
  respRate: 18,
  bloodPressure: "120/80",
  spo2: 96,
  symptomsPresent: false,
  symptomChecklist: [],
  providerNotified: false,
  continuedAdministration: true,
} as const;

function mappedEntry(
  cardId: string,
  category: string,
  payload: Record<string, unknown>,
  id: string
): ErPrintClinicalDocumentationEntry {
  return mapClinicalDocumentationEntryForLegalChart({
    id,
    encounterId: "enc-1",
    patientId: "pat-1",
    category,
    cardId,
    authorUserId: "u1",
    authorDisplayNameSnapshot: "Marie Infirmière",
    authorRoleSnapshot: "RN",
    createdAt: "2026-05-28T14:00:00.000Z",
    payloadJson: payload,
    voidedAt: null,
  });
}

function basePrintParams(
  overrides: Partial<Parameters<typeof getErPrintPacketHtml>[0]> = {}
): Parameters<typeof getErPrintPacketHtml>[0] {
  return {
    patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
    encounter: {
      createdAt: "2026-05-18T08:00:00.000Z",
      dischargeSummaryJson: null,
      nursingAssessment: {},
    },
    triageSnapshot: null,
    language: "en",
    ...overrides,
  };
}

describe("ERPACKET.1 — ER packet title and clinical documentation completeness", () => {
  it("default ER packet h1 is not Discharge packet", () => {
    const html = getErPrintPacketHtml(basePrintParams());
    expect(html).toContain("<h1");
    expect(html).toContain("ER packet");
    expect(html).not.toMatch(/<h1[^>]*>Discharge packet<\/h1>/);
  });

  it("default ER packet HTML title is Emergency encounter packet", () => {
    const html = getErPrintPacketHtml(basePrintParams());
    expect(html).toContain("<title>Emergency encounter packet</title>");
    expect(html).not.toContain("<title>ED discharge packet</title>");
  });

  it("French default ER packet uses Dossier urgences header", () => {
    const html = getErPrintPacketHtml(basePrintParams({ language: "fr" }));
    expect(html).toContain("Dossier urgences");
    expect(html).not.toContain("Dossier de sortie</h1>");
  });

  it("saved clinical documentation entries appear in ER packet", () => {
    const entry = mappedEntry(
      NG_OG_TUBE_MONITORING_CARD_ID,
      "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      NG_OG_PAYLOAD,
      "edoc-ng"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({ clinicalDocumentationEntries: [entry] })
    );
    expect(html).toContain("Clinical documentation");
    expect(html).toContain("NG / OG Tube Monitoring");
    expect(html).toContain("Marie Infirmière");
    expect(html).toContain("Tube type");
    expect(html).toContain("NG");
  });

  it("NG / OG Tube Monitoring appears when saved", () => {
    const entry = mappedEntry(
      NG_OG_TUBE_MONITORING_CARD_ID,
      "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      NG_OG_PAYLOAD,
      "edoc-ng-only"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({ clinicalDocumentationEntries: [entry] })
    );
    expect(html).toContain("NG / OG Tube Monitoring");
    expect(html).toContain("Placement verified");
  });

  it("Morse Fall Risk Assessment appears when saved", () => {
    const entry = mappedEntry(
      MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
      "FALL_RISK_AND_SAFETY",
      MORSE_PAYLOAD,
      "edoc-morse"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({ clinicalDocumentationEntries: [entry] })
    );
    expect(html).toContain("Morse Fall Risk Assessment");
    expect(html).toContain("Risk level");
    expect(html).toContain("Low (0–24)");
    expect(html).toContain("Morse score");
  });

  it("Blood product monitoring appears when saved", () => {
    const entry = mappedEntry(
      BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
      "BLOOD_PRODUCT_DOCUMENTATION",
      BLOOD_PRODUCT_REASSESSMENT_PAYLOAD,
      "edoc-blood"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({ clinicalDocumentationEntries: [entry] })
    );
    expect(html).toContain("Blood Product Reassessment (15-Minute Check)");
    expect(html).toContain("Temperature");
    expect(html).toContain("37.2");
  });

  it("medication orders still appear alongside clinical documentation", () => {
    const entry = mappedEntry(
      NG_OG_TUBE_MONITORING_CARD_ID,
      "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      NG_OG_PAYLOAD,
      "edoc-with-orders"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({
        clinicalDocumentationEntries: [entry],
        medicationOrderRows: [
          {
            id: "oi-1",
            medicationName: "Acetaminophen",
            dose: "500 mg",
            route: "PO",
            instructions: "PRN",
            orderedBy: "Dr Alice",
            orderedAt: "May 18, 2026",
            status: "ACTIVE",
          },
        ],
      })
    );
    expect(html).toContain("Medication orders");
    expect(html).toContain("Acetaminophen");
    expect(html).toContain("NG / OG Tube Monitoring");
  });

  it("empty discharge summary does not block clinical documentation from printing", () => {
    const entry = mappedEntry(
      MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
      "FALL_RISK_AND_SAFETY",
      MORSE_PAYLOAD,
      "edoc-no-discharge"
    );
    const html = getErPrintPacketHtml(
      basePrintParams({
        encounter: {
          createdAt: "2026-05-18T08:00:00.000Z",
          dischargeSummaryJson: null,
          nursingAssessment: {},
        },
        clinicalDocumentationEntries: [entry],
      })
    );
    expect(html).toContain("No structured discharge summary");
    expect(html).toContain("Morse Fall Risk Assessment");
    expect(html).toContain("Clinical documentation");
  });

  it("escapes unsafe text in clinical documentation output", () => {
    const entry = mappedEntry(
      NG_OG_TUBE_MONITORING_CARD_ID,
      "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      NG_OG_PAYLOAD,
      "edoc-xss"
    );
    const unsafe = '<script>alert("xss")</script>';
    const html = getErPrintPacketHtml(
      basePrintParams({
        clinicalDocumentationEntries: [
          {
            ...entry,
            authorDisplayName: unsafe,
            payloadJson: { ...NG_OG_PAYLOAD, markingAtNares: unsafe },
          },
        ],
      })
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert");
  });
});

describe("ERPACKET.1 — print wiring includes encounter clinical documentation entries", () => {
  const webSrcRoot = join(import.meta.dirname, "..", "..");

  it("ER print composer accepts clinicalDocumentationEntries", () => {
    const source = readFileSync(
      join(webSrcRoot, "features/emergency/erPrintPacket.ts"),
      "utf8"
    );
    expect(source).toContain("clinicalDocumentationEntries");
    expect(source).toContain("appendClinicalDocumentationEntriesBlock");
    expect(source).toContain("printOutput.erPacket.h1ErPacket");
    expect(source).toContain("printOutput.erPacket.htmlTitleErPacket");
  });

  it("Print ER packet handler passes encounter clinicalDocumentationEntries", () => {
    const source = readFileSync(
      join(webSrcRoot, "features/emergency/EmergencyErSummaryClosureSurface.tsx"),
      "utf8"
    );
    expect(source).toContain("clinicalDocumentationEntries: encounter.clinicalDocumentationEntries");
  });
});
