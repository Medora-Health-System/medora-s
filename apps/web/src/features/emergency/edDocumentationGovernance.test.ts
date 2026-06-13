import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEmergencyVisitSummaryModel, buildVisitSummaryResultsBlock } from "./emergencyVisitSummaryModel";
import { buildErEdSummaryMarEventRows } from "./erEdSummaryMedicationMar";
import { resolveEdWorkspaceRoleGroup } from "./edWorkspaceTileVisibility";

const edFeatureDir = __dirname;

describe("ED documentation governance (MEDUI.ED.DOCUMENTATION.1)", () => {
  it("Summary model includes triage, nursing, provider, disposition sections", () => {
    const model = buildEmergencyVisitSummaryModel(
      {
        chiefComplaint: "Chest pain",
        nursingAssessment: {
          nursingEvalV1: {
            sections: [{ id: "pain", label: "Pain", text: "7/10" }],
            signature: { savedAt: "2026-06-01T10:00:00Z", savedByDisplayName: "RN A", savedByRoleTitle: "RN" },
          },
          erProviderMseV1: {
            hpiNarrative: "Sudden onset chest pain",
            signature: { savedAt: "2026-06-01T11:00:00Z", savedByDisplayName: "Dr B", savedByRoleTitle: "PROVIDER" },
          },
        },
        dischargeSummaryJson: { dischargeMode: "Domicile", disposition: "Stable" },
      },
      {
        chiefComplaint: "Chest pain",
        esi: 3,
        vitalsJson: { painScore: 7 },
        triageCompleteAt: "2026-06-01T09:30:00Z",
        updatedAt: "2026-06-01T09:30:00Z",
      },
      null,
      "fr"
    );
    expect(model.triageResume || model.motifPresentation).toBeTruthy();
    expect(model.initialNursingAssessment || model.resumeInfirmier).toBeTruthy();
    expect(model.evaluationMedicale).toBeTruthy();
    expect(model.disposition).toBeTruthy();
  });

  it("result summary lines preserve separate resulted and acknowledged attribution", () => {
    const block = buildVisitSummaryResultsBlock(
      {
        ready: true,
        failed: false,
        empty: false,
        loading: false,
        ordersLoadFailedNoCache: false,
        rows: [
          {
            order: { id: "o1" },
            pendingSync: false,
            item: {
              displayLabel: "CBC",
              status: "RESULTED",
              catalogItemType: "LAB_TEST",
              result: {
                resultText: "WBC 12",
                verifiedAt: "2026-06-01T10:00:00Z",
                enteredByDisplayFr: "Lab Tech",
                acknowledgedByDisplayFr: "Dr Smith",
                acknowledgedByProviderAt: "2026-06-01T11:00:00Z",
              },
            },
          },
        ],
      } as never,
      "en"
    );
    const line = block.priorityLines[0] ?? block.labLine ?? "";
    expect(line).toContain("Lab Tech");
    expect(line).toContain("Dr Smith");
    expect(line).toContain("Resulted by");
    expect(line).toContain("Acknowledged by");
  });

  it("MAR summary builder includes administered-by attribution", () => {
    const rows = buildErEdSummaryMarEventRows({
      admins: [
        {
          id: "mar-1",
          marAction: "administered",
          medicationLabelSnapshot: "Morphine",
          doseValue: "4",
          doseUnit: "mg",
          route: "IV",
          administeredAt: "2026-06-01T12:00:00Z",
          administeredBy: { firstName: "Marie", lastName: "Infirmière" },
        },
      ],
      language: "fr",
      t: (k) => k,
    });
    expect(rows[0]?.administeredBy).toContain("Marie");
  });

  it("provider role lacks MAR tile but Summary enables medicationMarSummaryEnabled", () => {
    const group = resolveEdWorkspaceRoleGroup({ roleCodes: ["PROVIDER"], canPrescribe: true });
    expect(group).toBe("PROVIDER");
    const panelSource = readFileSync(resolve(edFeatureDir, "EmergencyVisitSummaryPanel.tsx"), "utf8");
    expect(panelSource).toContain("medicationMarSummaryEnabled");
    expect(panelSource).toContain("enabled={medicationMarSummaryEnabled}");
    const workspaceSource = readFileSync(resolve(edFeatureDir, "EmergencyActiveWorkspaceView.tsx"), "utf8");
    expect(workspaceSource).toContain("medicationMarSummaryEnabled");
  });

  it("technician Summary is read-only flagged", () => {
    const group = resolveEdWorkspaceRoleGroup({ roleCodes: ["LAB"] });
    expect(group).toBe("TECH");
    const workspaceSource = readFileSync(resolve(edFeatureDir, "EmergencyActiveWorkspaceView.tsx"), "utf8");
    expect(workspaceSource).toContain('summaryReadOnly={summaryReadOnly}');
    expect(workspaceSource).toContain('edWorkspaceRoleGroup === "TECH"');
  });

  it("uses shared documentationAttribution helper", () => {
    const summaryModelSource = readFileSync(resolve(edFeatureDir, "emergencyVisitSummaryModel.ts"), "utf8");
    expect(summaryModelSource).toContain("documentationAttribution");
  });
});
