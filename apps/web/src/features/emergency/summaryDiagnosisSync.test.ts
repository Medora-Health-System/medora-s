import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord, buildEdClosedEncounterCertification } from "@medora/shared";
import { buildEdTrackboardLifecycleSnapshot } from "./edIncompleteChartsFilter";
import {
  formatEncounterClinicalRecordDiagnosisLine,
  groupDiagnoses,
} from "./enterpriseClinicalChartLayout";
import { mapEncounterDiagnosisApiRowsToClinicalRecordInput } from "./encounterClinicalRecordAdapter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("summaryDiagnosisSync (MEDUI.SUMMARY.FINAL_HOTFIX_DIAGNOSIS_SYNC)", () => {
  it("maps R07.9 from Diagnostics tab source into clinical record", () => {
    const mapped = mapEncounterDiagnosisApiRowsToClinicalRecordInput(
      [
        {
          id: "dx-1",
          code: "R07.9",
          description: "Chest pain, unspecified",
          displayLabel: "Chest pain, unspecified",
          displayResolution: "EXACT_SOURCE_LABEL",
          sortOrder: 0,
          createdAt: "2026-06-23T09:00:00.000Z",
        },
      ],
      "en"
    );
    const record = buildEncounterClinicalRecord({
      encounter: { id: "enc-1", diagnoses: mapped },
    });
    expect(record.diagnoses[0]?.displayLabel).toBe("Chest pain, unspecified");
    expect(groupDiagnoses(record.diagnoses).primary).toHaveLength(1);
  });

  it("Summary V2 renders diagnosis line without duplicate code suffix", () => {
    const line = formatEncounterClinicalRecordDiagnosisLine({
      id: "dx-1",
      code: "R07.9",
      displayLabel: "R07.9 — Chest pain, unspecified",
      diagnosisType: "ENCOUNTER",
      status: "ACTIVE",
      isPrimary: true,
      documentedAt: "2026-06-23T09:00:00.000Z",
      documentedByDisplayName: null,
      documentedBy: { name: null, initials: null, role: null, at: "2026-06-23T09:00:00.000Z" },
    });
    expect(line).toBe("R07.9 — Chest pain, unspecified");
    expect(line).not.toContain("(R07.9)");
  });

  it("Summary panel loads diagnoses via shared hook with locale", () => {
    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    const hook = readSrc("features/emergency/useEncounterDiagnosisRows.ts");
    expect(panel).toContain("useEncounterDiagnosisRows");
    expect(panel).toContain("locale: language");
    expect(panel).toContain("mapEncounterDiagnosisApiRowsToClinicalRecordInput");
    expect(hook).toContain("/patients/");
    expect(hook).toContain("icd10ListLocaleQuery");
  });

  it("Print packet V2 includes diagnosis formatting helper", () => {
    const printPacket = readSrc("features/emergency/erClinicalRecordPrintPacket.ts");
    expect(printPacket).toContain("formatEncounterClinicalRecordDiagnosisLine");
    expect(printPacket).toContain("diagnosesPrimaryTitle");
  });

  it("closure certification does not report missing diagnosis when diagnosisCount > 0", () => {
    const cert = buildEdClosedEncounterCertification({
      lifecycleSnapshot: buildEdTrackboardLifecycleSnapshot({
        id: "enc-1",
        status: "OPEN",
        type: "EMERGENCY",
      }),
      dispositionReadiness: { canClose: true, blockers: [], warnings: [], activeOrderCounts: { lab: 0, imaging: 0, medication: 0, care: 0 } },
      trackboardOps: null,
      billingReadinessSnapshot: null,
      demographics: { dob: "1990-01-01", sexAtBirth: "MALE", mrn: "MRN-1", phone: null },
      diagnosisCount: 1,
    });
    const diagnosisDeficiency = cert.deficiencies.find((d) => d.id === "billing:diagnosis-missing");
    expect(diagnosisDeficiency).toBeUndefined();
  });

  it("closure surface passes diagnosisCount into certification builder", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain("diagnosisCount: diagnosisApiRows.length");
    expect(closure).toContain("useEncounterDiagnosisRows");
  });
});
