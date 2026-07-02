import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import {
  buildEnterpriseClinicalChartLayout,
  ENTERPRISE_CLINICAL_CHART_SECTION_ORDER,
  extractHpiFromProviderAssessment,
  extractProviderAssessmentSectionsExcludingHpi,
  filterPhysicianClinicalTimeline,
  groupOrdersByCategory,
  PHYSICIAN_CLINICAL_MILESTONES,
  validateEnterpriseLayoutNoDuplicates,
} from "./enterpriseClinicalChartLayout";

const webSrcRoot = join(import.meta.dirname, "../..");
const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG_ITEM_ID = "550e8400-e29b-41d4-a716-446655440012";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function buildRichRecord() {
  return buildEncounterClinicalRecord({
    locale: "en",
    encounter: {
      id: ENCOUNTER_ID,
      status: "OPEN",
      createdAt: "2026-06-23T08:00:00.000Z",
      diagnoses: [
        {
          id: "dx-primary",
          displayLabel: "Chest pain",
          isPrimary: true,
          diagnosisType: "ENCOUNTER",
        },
        {
          id: "dx-secondary",
          displayLabel: "Hypertension",
          isPrimary: false,
          diagnosisType: "ENCOUNTER",
        },
        {
          id: "dx-chronic",
          displayLabel: "Type 2 diabetes",
          isPrimary: false,
          diagnosisType: "CHRONIC_PROBLEM",
        },
      ],
    },
    patient: {
      displayName: "Jean Patient",
      mrn: "MRN-001",
      sex: "MALE",
      dateOfBirth: "1990-01-15",
    },
    attendingProviderDisplayName: "Dr Example",
    chiefComplaintLines: ["Chest pain since 2 hours"],
    presentationLines: [
      "ESI: 3",
      "Mode d'arrivée: ambulance",
      "Allergies: pénicilline — réaction sévère",
      "Douleur: 8/10",
    ],
    providerAssessment: {
      documentationStatus: "SIGNED",
      signedAt: "2026-06-23T10:00:00.000Z",
      signedByDisplayName: "Dr Example",
      sections: [
        { label: "HPI", text: "Acute chest pain radiating to left arm." },
        { label: "Assessment", text: "Stable, rule out ACS." },
      ],
    },
    providerAssessmentSaveHistory: [
      {
        id: "save-1",
        savedAt: "2026-06-23T09:00:00.000Z",
        sections: [{ label: "HPI", text: "Earlier draft." }],
      },
    ],
    nursingAssessmentInitial: {
      id: "nurse-initial",
      savedAt: "2026-06-23T08:30:00.000Z",
      performerDisplayName: "RN One",
      structuredLines: ["Patient alert and oriented."],
    },
    nursingReassessmentHistory: [
      {
        id: "reassess-2",
        savedAt: "2026-06-23T10:00:00.000Z",
        performerDisplayName: "RN Three",
        structuredLines: ["Latest reassessment."],
      },
      {
        id: "reassess-1",
        savedAt: "2026-06-23T09:30:00.000Z",
        performerDisplayName: "RN Two",
        structuredLines: ["Pain reassessed."],
      },
    ],
    orders: [
      {
        id: "order-lab",
        type: "LAB",
        priority: "ROUTINE",
        items: [
          {
            id: LAB_ITEM_ID,
            displayLabel: "CBC",
            status: "COMPLETED",
            result: { resultText: "WNL", verifiedAt: "2026-06-23T11:00:00.000Z" },
          },
          {
            id: LAB_ITEM_ID,
            displayLabel: "CBC duplicate",
            status: "ACKNOWLEDGED",
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
              criticalValue: true,
            },
          },
        ],
      },
      {
        id: "order-med",
        type: "MEDICATION",
        priority: "STAT",
        items: [{ id: "med-1", displayLabel: "Aspirin 325mg", status: "ACTIVE" }],
      },
    ],
    medicationAdministrations: [
      {
        id: "mar-1",
        medicationName: "Aspirin",
        dose: "325mg",
        route: "PO",
        action: "Given",
        administeredAt: "2026-06-23T09:15:00.000Z",
      },
    ],
    procedures: [{ id: "proc-1", label: "IV access", clinicalSummary: "PIV placed", documentedAt: "2026-06-23T09:00:00.000Z" }],
    disposition: { dischargeMode: "HOME", summaryLines: ["Discharged home with follow-up."] },
    auditSourceRows: [
      {
        sourceKind: "ORDER_EVENT",
        sourceId: "oe-ack",
        storedEventType: "ACKNOWLEDGED",
        documentedAtIso: "2026-06-23T09:05:00.000Z",
        summaryEn: "Acknowledged",
      },
      {
        sourceKind: "METADATA",
        sourceId: "arrival",
        storedEventType: "ARRIVAL",
        documentedAtIso: "2026-06-23T08:00:00.000Z",
        summaryEn: "Patient arrived",
      },
    ],
  });
}

describe("summaryLayoutEnterprise (Phase 4)", () => {
  it("defines enterprise section order with audit timeline last", () => {
    expect(ENTERPRISE_CLINICAL_CHART_SECTION_ORDER[0]).toBe("encounterOverview");
    expect(ENTERPRISE_CLINICAL_CHART_SECTION_ORDER.at(-1)).toBe("auditTimeline");
    expect(ENTERPRISE_CLINICAL_CHART_SECTION_ORDER).toHaveLength(15);
  });

  it("shows one primary provider assessment and excludes HPI from assessment body", () => {
    const record = buildRichRecord();
    const layout = buildEnterpriseClinicalChartLayout(record);
    const dup = validateEnterpriseLayoutNoDuplicates(layout);

    expect(dup.providerAssessmentCount).toBe(1);
    expect(layout.hpiLines).toContain("Acute chest pain radiating to left arm.");
    expect(extractHpiFromProviderAssessment(record.providerAssessment)).toHaveLength(1);
    const bodySections = extractProviderAssessmentSectionsExcludingHpi(record.providerAssessment);
    expect(bodySections.map((s) => s.label)).toEqual(["Assessment"]);
    expect(bodySections.some((s) => s.label === "HPI")).toBe(false);
  });

  it("shows one nursing assessment with history separate", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildRichRecord());
    const dup = validateEnterpriseLayoutNoDuplicates(layout);
    expect(dup.nursingAssessmentCount).toBe(1);
    expect(layout.nursingAssessmentHistory).toHaveLength(1);
  });

  it("deduplicates orders and groups by category", () => {
    const record = buildRichRecord();
    const grouped = groupOrdersByCategory(record.orders);
    expect(grouped.laboratory).toHaveLength(1);
    expect(grouped.imaging).toHaveLength(1);
    expect(grouped.medications).toHaveLength(1);

    const layout = buildEnterpriseClinicalChartLayout(record);
    const dup = validateEnterpriseLayoutNoDuplicates(layout);
    expect(new Set(dup.orderItemIds).size).toBe(dup.orderItemIds.length);
  });

  it("deduplicates laboratory and imaging results", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildRichRecord());
    const dup = validateEnterpriseLayoutNoDuplicates(layout);
    expect(layout.laboratoryResults).toHaveLength(1);
    expect(layout.imagingResults).toHaveLength(1);
    expect(new Set(dup.labOrderItemIds).size).toBe(1);
    expect(new Set(dup.imagingOrderItemIds).size).toBe(1);
  });

  it("groups diagnoses into primary, secondary, and chronic", () => {
    const layout = buildEnterpriseClinicalChartLayout(buildRichRecord());
    expect(layout.groupedDiagnoses.primary).toHaveLength(1);
    expect(layout.groupedDiagnoses.secondary).toHaveLength(1);
    expect(layout.groupedDiagnoses.chronic).toHaveLength(1);
  });

  it("filters clinical timeline to physician milestones only", () => {
    const record = buildRichRecord();
    const filtered = filterPhysicianClinicalTimeline(record.clinicalTimeline);
    expect(filtered.every((e) => PHYSICIAN_CLINICAL_MILESTONES.has(e.milestone))).toBe(true);
    expect(filtered.some((e) => e.milestone === "TRIAGE_COMPLETE")).toBe(false);
  });

  it("view renders enterprise section i18n keys in correct order", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    const overviewIdx = view.indexOf("overviewTitle");
    const chiefIdx = view.indexOf("chiefComplaintTitle");
    const hpiIdx = view.indexOf("hpiTitle");
    const triageIdx = view.indexOf("triageSummaryTitle");
    const providerIdx = view.indexOf("providerAssessmentTitle");
    const nursingIdx = view.indexOf("nursingTitle");
    const ordersIdx = view.indexOf("activeOrdersTitle");
    const resultsIdx = view.indexOf("resultsTitle");
    const marIdx = view.indexOf("marTitle");
    const procIdx = view.indexOf("completedProceduresTitle");
    const dxIdx = view.indexOf("diagnosesTitle");
    const timelineIdx = view.indexOf("clinicalTimelineTitle");
    const dispIdx = view.indexOf("dispositionTitle");
    const sigIdx = view.indexOf("electronicSignaturesTitle");
    const auditIdx = view.indexOf("auditTitle");

    expect(overviewIdx).toBeLessThan(chiefIdx);
    expect(chiefIdx).toBeLessThan(hpiIdx);
    expect(hpiIdx).toBeLessThan(triageIdx);
    expect(triageIdx).toBeLessThan(providerIdx);
    expect(providerIdx).toBeLessThan(nursingIdx);
    expect(nursingIdx).toBeLessThan(ordersIdx);
    expect(ordersIdx).toBeLessThan(resultsIdx);
    expect(resultsIdx).toBeLessThan(marIdx);
    expect(marIdx).toBeLessThan(procIdx);
    expect(procIdx).toBeLessThan(dxIdx);
    expect(dxIdx).toBeLessThan(timelineIdx);
    expect(timelineIdx).toBeLessThan(dispIdx);
    expect(dispIdx).toBeLessThan(sigIdx);
    expect(sigIdx).toBeLessThan(auditIdx);
  });

  it("keeps audit timeline collapsed by default", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain('const [auditOpen, setAuditOpen] = useState(false)');
  });

  it("uses responsive layout styles without horizontal overflow", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain("buildEnterpriseClinicalChartLayout");
    expect(view).toContain("overflowWrap: \"anywhere\"");
    expect(view).toContain("tableWrapStyle");
    expect(view).toContain("minWidth: 0");
    expect(view).toContain("tableLayout: \"fixed\"");
  });
});
