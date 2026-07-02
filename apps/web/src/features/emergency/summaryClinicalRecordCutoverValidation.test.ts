import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import { shouldUseClinicalRecordSummaryV2 } from "./summaryClinicalRecordRuntimeSafety";
import { isSummaryClinicalRecordV2Enabled } from "./summaryClinicalRecordFeatureFlag";
import { composeEncounterClinicalRecordFromEmergencySummary } from "./useEncounterClinicalRecord";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const webSrcRoot = join(import.meta.dirname, "../..");
const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function emptyModel(): EmergencyVisitSummaryModel {
  return {
    motifPresentation: null,
    triageResume: null,
    triageCarryForward: null,
    initialNursingAssessment: null,
    resumeInfirmier: null,
    providerDocumentation: null,
    evaluationMedicale: null,
    resultats: null,
    disposition: null,
    handoff: null,
    emtala: null,
    timeline: [],
    nursingReassessmentHistory: [],
    nursingReassessmentLatestId: null,
    nursingDischargeDocumentation: null,
    providerDischargeDocumentation: null,
    providerMseHistory: [],
    providerMseLatestId: null,
    handoffHistory: [],
    handoffLatestId: null,
    dischargeSummaryHistory: [],
    dischargeSummaryLatestId: null,
    admissionSummaryHistory: [],
    admissionSummaryLatestId: null,
    dispositionSupplementHistory: [],
    dispositionSupplementLatestId: null,
    triageAssessmentHistory: [],
    triageAssessmentLatestId: null,
  };
}

describe("summaryClinicalRecordRuntimeSafety (Phase 3C)", () => {
  const record = buildEncounterClinicalRecord({ encounter: { id: ENCOUNTER_ID } });

  it("uses legacy when feature flag is off", () => {
    expect(
      shouldUseClinicalRecordSummaryV2({
        flagEnabled: false,
        record,
        projectionFailed: false,
      })
    ).toBe(false);
  });

  it("uses V2 when flag is on and projection succeeds", () => {
    expect(
      shouldUseClinicalRecordSummaryV2({
        flagEnabled: true,
        record,
        projectionFailed: false,
      })
    ).toBe(true);
  });

  it("falls back to legacy when projection fails", () => {
    expect(
      shouldUseClinicalRecordSummaryV2({
        flagEnabled: true,
        record: null,
        projectionFailed: true,
      })
    ).toBe(false);
  });

  it("falls back to legacy when record is null even if flag is on", () => {
    expect(
      shouldUseClinicalRecordSummaryV2({
        flagEnabled: true,
        record: null,
        projectionFailed: false,
      })
    ).toBe(false);
  });
});

describe("summaryClinicalRecordCutoverValidation (Phase 3C)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.stubGlobal("window", undefined);
  });

  it("feature flag off implies legacy panel path", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "");
    expect(isSummaryClinicalRecordV2Enabled()).toBe(false);

    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    expect(panel).toContain("shouldUseClinicalRecordSummaryV2");
    expect(panel).toContain("EncounterResultsTab");
    expect(panel).toMatch(/if \(clinicalRecordV2Enabled\)/);
  });

  it("feature flag on routes to clinical record summary view", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "true");
    expect(isSummaryClinicalRecordV2Enabled()).toBe(true);

    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    const v2Block = panel.slice(
      panel.indexOf("if (clinicalRecordV2Enabled)"),
      panel.indexOf("const gridStyle")
    );
    expect(v2Block).toContain("EncounterClinicalRecordSummaryView");
  });

  it("projection failure returns projectionFailed and null record", async () => {
    const adapter = await import("./encounterClinicalRecordAdapter");
    vi.spyOn(adapter, "buildEncounterClinicalRecordInputFromEmergencySummary").mockImplementation(() => {
      throw new Error("projection fault");
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");

    const result = composeEncounterClinicalRecordFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
    });

    expect(result.projectionFailed).toBe(true);
    expect(result.record).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("ignores dev localStorage override in production", () => {
    vi.stubEnv("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2", "");
    vi.stubEnv("NODE_ENV", "production");
    const getItem = vi.fn().mockReturnValue("true");
    vi.stubGlobal("window", {
      localStorage: { getItem },
    } as unknown as Window & typeof globalThis);
    expect(isSummaryClinicalRecordV2Enabled()).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });

  it("audit timeline is collapsed by default and wrapped in error boundary", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).toContain('const [auditOpen, setAuditOpen] = useState(false)');
    expect(view).toContain("SummaryAuditTimelineSlot");
  });

  it("closure readiness remains in closure surface outside summary logic", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("DispositionReadinessBanner");
    expect(closure).toContain("EdEncounterCertificationReview");
    expect(closure).toContain("printErPacket");
    expect(closure).not.toContain("EncounterClinicalRecordSummaryView");
  });

  it("print packet supports clinical record V2 branch with legacy fallback", () => {
    const printPacket = readSrc("features/emergency/erPrintPacket.ts");
    expect(printPacket).toContain("getErClinicalRecordPrintPacketHtml");
    expect(printPacket).toContain("isSummaryClinicalRecordV2Enabled");
    expect(printPacket).toContain("clinicalRecord");
    expect(printPacket).toContain("getErPrintPacketHtml");
  });

  it("parity logging does not run in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logEncounterClinicalRecordParityDev } = await import("./encounterClinicalRecordParity");
    logEncounterClinicalRecordParityDev({
      encounterId: ENCOUNTER_ID,
      legacy: {
        hasProviderNote: false,
        hasNursingNote: false,
        vitalsLineCount: 0,
        orderItemCount: 0,
        labResultPreviewCount: 0,
        imagingResultPreviewCount: 0,
        marCount: 0,
        procedureCount: 0,
        clinicalTimelineCount: 0,
        metadataTimelineCount: 0,
        documentationEventCount: 0,
        providerMseHistoryCount: 0,
        nursingReassessmentHistoryCount: 0,
      },
      clinicalRecord: {
        hasProviderAssessment: false,
        hasNursingAssessment: false,
        vitalsCount: 0,
        ordersCount: 0,
        laboratoryResultsCount: 0,
        imagingResultsCount: 0,
        marCount: 0,
        proceduresCount: 0,
        clinicalTimelineCount: 0,
        auditTimelineCount: 0,
        providerHistoryCount: 0,
        nursingHistoryCount: 0,
      },
    });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("enterprise summary v2 documentation exists with rollback and UAT checklist", () => {
    const docPath = join(webSrcRoot, "../../../docs/summary/enterprise-summary-v2.md");
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("NEXT_PUBLIC_SUMMARY_CLINICAL_RECORD_V2");
    expect(doc).toContain("localStorage.setItem");
    expect(doc).toContain("Rollback");
    expect(doc).toContain("Clinician UAT checklist");
    expect(doc).toContain("Seed");
    expect(doc).toContain("NO");
  });
});
