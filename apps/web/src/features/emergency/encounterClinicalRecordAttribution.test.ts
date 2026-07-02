import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import { buildEnterpriseClinicalChartLayout } from "./enterpriseClinicalChartLayout";
import {
  formatClinicalRecordAttributionPart,
  joinAttributionParts,
} from "./clinicalRecordAttributionDisplay";

const webSrcRoot = join(import.meta.dirname, "../..");
const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG_ITEM_ID = "550e8400-e29b-41d4-a716-446655440012";
const MAR_ID = "550e8400-e29b-41d4-a716-446655440013";
const PROC_ID = "550e8400-e29b-41d4-a716-446655440014";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function t(key: string): string {
  const map: Record<string, string> = {
    "encounterClinicalRecordSummary.attrDocumentedBy": "Documented by",
    "encounterClinicalRecordSummary.attrSignedBy": "Signed by",
    "encounterClinicalRecordSummary.attrSavedBy": "Saved by",
    "encounterClinicalRecordSummary.attrOrderedBy": "Ordered by",
    "encounterClinicalRecordSummary.attrResultedBy": "Resulted by",
    "encounterClinicalRecordSummary.attrReviewedBy": "Reviewed by",
    "encounterClinicalRecordSummary.attrAdministeredBy": "Administered by",
    "encounterClinicalRecordSummary.attrPerformedBy": "Performed by",
    "encounterClinicalRecordSummary.attrNotRecorded": "Not recorded",
  };
  return map[key] ?? key;
}

function buildAttributedRecord() {
  return buildEncounterClinicalRecord({
    locale: "en",
    encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
    triageDocumentation: {
      documentedByDisplayName: "RN Triage",
      documentedByRole: "RN",
      documentedAt: "2026-06-23T08:15:00.000Z",
    },
    providerAssessment: {
      documentationStatus: "SIGNED",
      signedAt: "2026-06-23T10:00:00.000Z",
      signedByDisplayName: "Dr Provider",
      savedAt: "2026-06-23T09:30:00.000Z",
      savedByDisplayName: "Dr Provider",
      sections: [{ label: "Assessment", text: "Stable patient." }],
    },
    providerAssessmentSaveHistory: [
      {
        id: "save-1",
        savedAt: "2026-06-23T09:00:00.000Z",
        performerDisplayName: "Dr Provider",
        sections: [{ label: "Assessment", text: "Earlier save." }],
      },
    ],
    nursingAssessmentInitial: {
      id: "nurse-initial",
      savedAt: "2026-06-23T08:30:00.000Z",
      documentedAt: "2026-06-23T08:30:00.000Z",
      performerDisplayName: "RN One",
      performerRoleTitle: "RN",
      structuredLines: ["Patient alert."],
    },
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
      {
        id: "order-img",
        type: "IMAGING",
        orderedByDisplayName: "Dr Rad",
        createdAt: "2026-06-23T09:15:00.000Z",
        items: [
          {
            id: IMG_ITEM_ID,
            displayLabel: "CXR",
            result: {
              resultText: "Clear",
              verifiedAt: "2026-06-23T12:00:00.000Z",
              enteredByDisplayName: "Rad Tech",
              acknowledgedByDisplayName: "Dr Rad Review",
              acknowledgedByProviderAt: "2026-06-23T12:30:00.000Z",
            },
          },
        ],
      },
    ],
    medicationAdministrations: [
      {
        id: MAR_ID,
        medicationName: "Aspirin",
        marAction: "ADMINISTERED",
        administeredAt: "2026-06-23T09:15:00.000Z",
        administeredByDisplayName: "RN MAR",
      },
    ],
    procedures: [
      {
        id: PROC_ID,
        label: "IV access",
        clinicalSummary: "PIV placed",
        documentedAt: "2026-06-23T09:00:00.000Z",
        documentedByDisplayName: "Dr Proc",
        performedByDisplayName: "RN Proc",
      },
    ],
  });
}

describe("encounterClinicalRecordAttribution (Phase 5)", () => {
  it("summary view includes AttributionLine for clinical sections", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain("AttributionLine");
    expect(view).toContain("formatClinicalRecordAttributionPart");
    expect(view).toContain("joinAttributionParts");
  });

  it("provider section attribution includes documented and signed by", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const parts = joinAttributionParts([
      formatClinicalRecordAttributionPart("savedBy", layout.providerAssessment?.savedBy, t, "en"),
      formatClinicalRecordAttributionPart("signedBy", layout.providerAssessment?.signedBy, t, "en"),
    ]);
    expect(parts).toContain("Saved by Dr Provider");
    expect(parts).toContain("Signed by Dr Provider");
  });

  it("nursing section shows documented by and date/time", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const line = formatClinicalRecordAttributionPart(
      "documentedBy",
      {
        name: layout.nursingAssessment?.performerDisplayName ?? null,
        role: layout.nursingAssessment?.performerRoleTitle ?? null,
        at: layout.nursingAssessment?.documentedAt ?? layout.nursingAssessment?.savedAt ?? null,
        initials: null,
      },
      t,
      "en"
    );
    expect(line).toContain("Documented by RN One (RN)");
  });

  it("lab row shows resulted by and reviewed by", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const lab = layout.laboratoryResults[0];
    const line = joinAttributionParts([
      formatClinicalRecordAttributionPart("orderedBy", lab?.orderedBy, t, "en"),
      formatClinicalRecordAttributionPart("resultedBy", lab?.resultedBy, t, "en"),
      formatClinicalRecordAttributionPart("reviewedBy", lab?.reviewedBy, t, "en"),
    ]);
    expect(line).toContain("Ordered by Dr Orderer");
    expect(line).toContain("Resulted by Lab Tech");
    expect(line).toContain("Reviewed by Dr Reviewer");
  });

  it("imaging row shows resulted by and reviewed by", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const img = layout.imagingResults[0];
    const line = joinAttributionParts([
      formatClinicalRecordAttributionPart("resultedBy", img?.resultedBy, t, "en"),
      formatClinicalRecordAttributionPart("reviewedBy", img?.reviewedBy, t, "en"),
    ]);
    expect(line).toContain("Resulted by Rad Tech");
    expect(line).toContain("Reviewed by Dr Rad Review");
  });

  it("MAR row shows administered by and time", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const mar = layout.medicationAdministration[0];
    const line = formatClinicalRecordAttributionPart("administeredBy", mar?.administeredBy, t, "en");
    expect(line).toContain("Administered by RN MAR");
    expect(line).toMatch(/6\/23\/26|23\/06\/2026/);
  });

  it("procedure row shows performed and documented by", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    const proc = layout.completedProcedures[0];
    const line = joinAttributionParts([
      formatClinicalRecordAttributionPart("performedBy", proc?.performedBy, t, "en"),
      formatClinicalRecordAttributionPart("documentedBy", proc?.documentedBy, t, "en"),
    ]);
    expect(line).toContain("Performed by RN Proc");
    expect(line).toContain("Documented by Dr Proc");
  });

  it("version history exposes author and time via layout", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildAttributedRecord());
    expect(layout.providerAssessmentHistory[0]?.performerDisplayName).toBe("Dr Provider");
    expect(layout.providerAssessmentHistory[0]?.savedAt).toBeTruthy();
  });

  it("missing attribution renders safe empty state", () => {
    const empty = formatClinicalRecordAttributionPart("documentedBy", null, t, "en");
    expect(empty).toBeNull();
    const partial = formatClinicalRecordAttributionPart(
      "documentedBy",
      { name: null, initials: null, role: null, at: "2026-06-23T10:00:00.000Z" },
      t,
      "en"
    );
    expect(partial).toContain("Not recorded");
  });
});
