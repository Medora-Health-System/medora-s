import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import {
  CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE,
  countAuditWorkflowEntriesInClinicalSections,
  countPrimaryProviderNotes,
  encounterClinicalRecordHasPrimaryContent,
  summarizeClinicalRecordForDisplay,
} from "./encounterClinicalRecordSummaryViewModel";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG_ITEM_ID = "550e8400-e29b-41d4-a716-446655440012";

describe("encounterClinicalRecordSummaryView (Phase 3B)", () => {
  it("renders projection counts from EncounterClinicalRecord", () => {
    const record = buildEncounterClinicalRecord({
      locale: "en",
      encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
      chiefComplaintLines: ["Chest pain"],
      providerAssessment: {
        documentationStatus: "SIGNED",
        signedAt: "2026-06-23T10:00:00.000Z",
        signedByDisplayName: "Dr Example",
        sections: [{ label: "Assessment", text: "Stable." }],
      },
      providerAssessmentSaveHistory: [
        {
          id: "save-1",
          savedAt: "2026-06-23T09:00:00.000Z",
          performerDisplayName: "Dr Example",
          sections: [{ label: "Assessment", text: "Earlier save." }],
        },
      ],
      orders: [
        {
          id: "order-lab",
          type: "LAB",
          items: [
            {
              id: LAB_ITEM_ID,
              displayLabel: "CBC",
              status: "COMPLETED",
              result: {
                resultText: "WNL",
                verifiedAt: "2026-06-23T11:00:00.000Z",
              },
            },
          ],
        },
        {
          id: "order-img",
          type: "IMAGING",
          items: [
            {
              id: IMG_ITEM_ID,
              displayLabel: "CXR",
              result: {
                resultText: "No acute process",
                verifiedAt: "2026-06-23T11:30:00.000Z",
              },
            },
          ],
        },
      ],
    });

    const summary = summarizeClinicalRecordForDisplay(record);
    expect(encounterClinicalRecordHasPrimaryContent(record)).toBe(true);
    expect(countPrimaryProviderNotes(record)).toBe(1);
    expect(summary.providerHistoryCount).toBe(1);
    expect(summary.labResultCount).toBe(1);
    expect(summary.imagingResultCount).toBe(1);
    expect(summary.orderCount).toBe(2);
  });

  it("shows one primary provider note with history separate", () => {
    const record = buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID },
      providerAssessment: {
        documentationStatus: "SIGNED",
        signedAt: "2026-06-23T10:00:00.000Z",
        sections: [{ label: "A", text: "Signed note" }],
      },
      providerAssessmentSaveHistory: [
        {
          id: "h1",
          savedAt: "2026-06-23T09:00:00.000Z",
          sections: [{ label: "A", text: "Old save" }],
        },
        {
          id: "h2",
          savedAt: "2026-06-23T09:30:00.000Z",
          sections: [{ label: "A", text: "Newer save" }],
        },
      ],
    });
    expect(countPrimaryProviderNotes(record)).toBe(1);
    expect(record.providerAssessmentHistory).toHaveLength(2);
  });

  it("treats empty record as safe with no primary content", () => {
    const record = buildEncounterClinicalRecord({ encounter: { id: ENCOUNTER_ID } });
    expect(encounterClinicalRecordHasPrimaryContent(record)).toBe(false);
    expect(summarizeClinicalRecordForDisplay(record).providerNoteCount).toBe(0);
  });

  it("does not count acknowledged lifecycle statuses as primary order rows", () => {
    const record = buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID },
      orders: [
        {
          id: "o1",
          type: "LAB",
          items: [
            {
              id: "i1",
              displayLabel: "Ack only",
              status: "ACKNOWLEDGED",
            },
          ],
        },
        {
          id: "o2",
          type: "LAB",
          items: [
            {
              id: "i2",
              displayLabel: "Completed lab",
              status: "COMPLETED",
            },
          ],
        },
      ],
    });
    expect(record.orders).toHaveLength(2);
    expect(countAuditWorkflowEntriesInClinicalSections(record)).toBe(1);
  });

  it("caps clinical timeline display threshold at configured collapse limit", () => {
    expect(CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE).toBe(10);
  });

  it("summary view keeps provider version history collapsed by default", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain("CollapsibleBlock");
    expect(view).toContain('useState(false)');
    expect(view).toContain("versionHistoryShow");
  });

  it("summary view keeps audit timeline collapsed by default", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain('const [auditOpen, setAuditOpen] = useState(false)');
    expect(view).toContain("encounterClinicalRecordSummary.auditTitle");
    expect(view).not.toContain("EncounterResultsTab");
  });

  it("summary view wraps long text safely", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain("overflowWrap: \"anywhere\"");
    expect(view).toContain("wordBreak: \"break-word\"");
  });

  it("summary view does not import lifecycle engine modules", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).not.toMatch(/from ["'].*lifecycle/i);
    expect(view).not.toContain("EncounterResultsTab");
  });

  it("panel keeps legacy summary behind feature flag", () => {
    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    expect(panel).toContain("shouldUseClinicalRecordSummaryV2");
    expect(panel).toContain("isSummaryClinicalRecordV2Enabled");
    expect(panel).toContain("EncounterClinicalRecordSummaryView");
    expect(panel).toContain("EncounterResultsTab");
    expect(panel).toMatch(/if \(clinicalRecordV2Enabled\)/);
  });

  it("V2 panel path does not embed EncounterResultsTab", () => {
    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    const v2Block = panel.slice(
      panel.indexOf("if (clinicalRecordV2Enabled)"),
      panel.indexOf("const gridStyle")
    );
    expect(v2Block).toContain("EncounterClinicalRecordSummaryView");
    expect(v2Block).not.toContain("EncounterResultsTab");
  });

  it("closure readiness remains outside summary view in closure surface", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("DispositionReadinessBanner");
    expect(closure).toContain("EdEncounterCertificationReview");
    expect(closure).toContain("EmergencyVisitSummaryPanel");
  });

  it("summary view accepts closure readiness slot without changing closure modules", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain("closureReadinessSlot");
  });

  it("mirrors encounterClinicalRecordSummary i18n keys in en and fr", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("encounterClinicalRecordSummary:");
    expect(fr).toContain("encounterClinicalRecordSummary:");
    expect(en).toContain("auditTitle:");
    expect(fr).toContain("auditTitle:");
    expect(en).toContain("versionHistoryShow:");
    expect(fr).toContain("versionHistoryShow:");
  });
});
