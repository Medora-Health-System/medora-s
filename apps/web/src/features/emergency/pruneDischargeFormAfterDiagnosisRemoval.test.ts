import { describe, expect, it } from "vitest";
import {
  emptyProviderDischargeDocumentationForm,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import { pruneDischargeFormAfterDiagnosisRemoval } from "./pruneDischargeFormAfterDiagnosisRemoval";

describe("pruneDischargeFormAfterDiagnosisRemoval", () => {
  it("removes refs and unedited generated docs for removed diagnoses", () => {
    const form: ProviderDischargeDocumentationForm = {
      ...emptyProviderDischargeDocumentationForm(),
      diagnosisRefs: [
        { encounterDiagnosisId: "dx-1", code: "S67.21XA", label: "Crush hand", isPrimary: true },
        { encounterDiagnosisId: "dx-2", code: "R11.2", label: "Nausea", isPrimary: false },
      ],
      diagnosisDocs: [
        {
          id: "card-1",
          code: "S67.21XA",
          displayName: "Crush hand",
          description: "Template text",
          diagnosisInstructions: "Elevate",
          medicationTreatment: "",
          returnPrecautions: "",
          sourceEncounterDiagnosisId: "dx-1",
          encounterDiagnosisId: "dx-1",
          isPrimaryDiagnosis: true,
          displayOrder: 0,
          followUps: [],
          medicationLines: [],
          templateMeta: {
            templateId: "t1",
            templateVersion: "1",
            matchLevel: "icdExact" as const,
            sourceReferences: [],
            providerConfirmed: false,
          },
        },
        {
          id: "card-2",
          code: "R11.2",
          displayName: "Nausea",
          description: "Template text",
          diagnosisInstructions: "Sip fluids",
          medicationTreatment: "",
          returnPrecautions: "",
          sourceEncounterDiagnosisId: "dx-2",
          encounterDiagnosisId: "dx-2",
          isPrimaryDiagnosis: false,
          displayOrder: 1,
          followUps: [],
          medicationLines: [],
          templateMeta: {
            templateId: "t2",
            templateVersion: "1",
            matchLevel: "icdExact" as const,
            sourceReferences: [],
            providerConfirmed: false,
          },
        },
      ],
    };

    const next = pruneDischargeFormAfterDiagnosisRemoval(form, new Set(["dx-2"]));
    expect(next.diagnosisRefs.map((r) => r.encounterDiagnosisId)).toEqual(["dx-2"]);
    expect(next.diagnosisRefs[0]?.isPrimary).toBe(true);
    expect(next.diagnosisDocs.map((d) => d.id)).toEqual(["card-2"]);
  });

  it("preserves provider-confirmed edited docs as orphaned/manual", () => {
    const form: ProviderDischargeDocumentationForm = {
      ...emptyProviderDischargeDocumentationForm(),
      diagnosisRefs: [
        { encounterDiagnosisId: "dx-1", code: "S67.21XA", label: "Crush hand", isPrimary: true },
      ],
      diagnosisDocs: [
        {
          id: "card-1",
          code: "S67.21XA",
          displayName: "Crush hand",
          description: "Custom description",
          diagnosisInstructions: "My custom instructions",
          medicationTreatment: "",
          returnPrecautions: "",
          sourceEncounterDiagnosisId: "dx-1",
          encounterDiagnosisId: "dx-1",
          isPrimaryDiagnosis: true,
          displayOrder: 0,
          followUps: [],
          medicationLines: [],
          templateMeta: {
            templateId: "t1",
            templateVersion: "1",
            matchLevel: "icdExact" as const,
            sourceReferences: [],
            providerConfirmed: true,
          },
        },
      ],
    };

    const next = pruneDischargeFormAfterDiagnosisRemoval(form, new Set());
    expect(next.diagnosisRefs).toEqual([]);
    expect(next.diagnosisDocs).toHaveLength(1);
    expect(next.diagnosisDocs[0]?.sourceEncounterDiagnosisId).toMatch(/^orphaned-manual-/);
    expect(next.diagnosisDocs[0]?.staleDiagnosisIdentityWarning).toBe(true);
    expect(next.diagnosisDocs[0]?.diagnosisInstructions).toBe("My custom instructions");
  });
});
