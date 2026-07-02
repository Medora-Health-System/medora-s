import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import { getErPrintPacketHtml } from "./erPrintPacket";
import { getErClinicalRecordPrintPacketHtml } from "./erClinicalRecordPrintPacket";

const webSrcRoot = join(import.meta.dirname, "../..");
const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function buildPrintRecord() {
  return buildEncounterClinicalRecord({
    locale: "en",
    encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
    providerAssessment: {
      documentationStatus: "SIGNED",
      signedAt: "2026-06-23T10:00:00.000Z",
      signedByDisplayName: "Dr Provider",
      sections: [
        { label: "HPI", text: "Chest pain." },
        { label: "Assessment", text: "Stable." },
      ],
    },
    providerAssessmentSaveHistory: [
      {
        id: "save-1",
        savedAt: "2026-06-23T09:00:00.000Z",
        performerDisplayName: "Dr Provider",
        sections: [{ label: "Assessment", text: "Earlier draft — should not duplicate in V2 print." }],
      },
    ],
    orders: [
      {
        id: "order-lab",
        type: "LAB",
        orderedByDisplayName: "Dr Orderer",
        createdAt: "2026-06-23T09:00:00.000Z",
        items: [
          {
            id: LAB_ITEM_ID,
            displayLabel: "CBC",
            status: "COMPLETED",
            result: {
              resultText: "WNL",
              verifiedAt: "2026-06-23T11:00:00.000Z",
              enteredByDisplayName: "Lab Tech",
              acknowledgedByDisplayName: "Dr Reviewer",
              acknowledgedByProviderAt: "2026-06-23T11:30:00.000Z",
            },
          },
        ],
      },
    ],
    medicationAdministrations: [
      {
        id: "mar-1",
        medicationName: "Aspirin",
        marAction: "ADMINISTERED",
        administeredAt: "2026-06-23T09:15:00.000Z",
        administeredByDisplayName: "RN MAR",
      },
    ],
  });
}

const basePatient = {
  firstName: "Jean",
  lastName: "Patient",
  dob: "1990-01-01",
  sex: "M",
} as const;

const baseEncounter = {
  createdAt: "2026-06-23T08:00:00.000Z",
  dischargeSummaryJson: null,
  nursingAssessment: {},
} as const;

describe("erClinicalRecordPrintPacket (Phase 5)", () => {
  it("V2 print packet includes attribution lines", () => {
    const record = buildPrintRecord();
    const html = getErClinicalRecordPrintPacketHtml({
      patient: basePatient,
      encounter: baseEncounter,
      facilityName: "Clinic Test",
      language: "en",
      record,
    });
    expect(html).toContain("Signed by");
    expect(html).toContain("Dr Provider");
    expect(html).toContain("Resulted by");
    expect(html).toContain("Lab Tech");
    expect(html).toContain("Reviewed by");
    expect(html).toContain("Dr Reviewer");
    expect(html).toContain("Administered by");
    expect(html).toContain("RN MAR");
  });

  it("V2 print packet excludes duplicate provider history narrative", () => {
    const record = buildPrintRecord();
    const html = getErClinicalRecordPrintPacketHtml({
      patient: basePatient,
      encounter: baseEncounter,
      language: "en",
      record,
    });
    expect(html).toContain("Stable.");
    expect(html).not.toContain("Earlier draft — should not duplicate in V2 print.");
  });

  it("getErPrintPacketHtml routes to V2 when flag and record are set", () => {
    const record = buildPrintRecord();
    const html = getErPrintPacketHtml({
      patient: basePatient,
      encounter: baseEncounter,
      triageSnapshot: null,
      language: "en",
      clinicalRecord: record,
      useClinicalRecordV2: true,
    });
    expect(html).toContain("Signed by");
    expect(html).toContain("Dr Provider");
    expect(html).not.toContain("Earlier draft — should not duplicate in V2 print.");
  });

  it("legacy print packet still works when V2 flag is off", () => {
    const record = buildPrintRecord();
    const html = getErPrintPacketHtml({
      patient: basePatient,
      encounter: baseEncounter,
      triageSnapshot: null,
      language: "en",
      clinicalRecord: record,
      useClinicalRecordV2: false,
    });
    expect(html).toContain("ER packet");
    expect(html).not.toContain("Signed by Dr Provider");
  });

  it("print modules do not import lifecycle engine", () => {
    const printPacket = readSrc("features/emergency/erPrintPacket.ts");
    const v2Print = readSrc("features/emergency/erClinicalRecordPrintPacket.ts");
    expect(printPacket).not.toMatch(/from\s+["'].*lifecycle/i);
    expect(v2Print).not.toMatch(/from\s+["'].*lifecycle/i);
  });

  it("closure surface wires clinical record into print when V2 enabled", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("composeEncounterClinicalRecordFromEmergencySummary");
    expect(closure).toContain("isSummaryClinicalRecordV2Enabled");
    expect(closure).toContain("clinicalRecord");
    expect(closure).toContain("useClinicalRecordV2");
  });
});
