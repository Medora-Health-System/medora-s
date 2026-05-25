import { describe, expect, it } from "vitest";
import {
  buildDocumentedProcedureSummaryMeta,
  formatDocumentedProcedureClinicalSummary,
  readPerformedAtFromPayload,
  readPerformedByDisplayNameFromPayload,
  readProcedureTypeFromPayload,
} from "./documentedProcedureSummary.js";

describe("documentedProcedureSummary", () => {
  it("reads procedure type and performer from payload", () => {
    const payload = {
      procedureType: "LACERATION_REPAIR",
      performedAt: "2026-05-18T14:30:00.000Z",
      performedByDisplayName: "Dr Alice Test",
      performerTitle: "Dr",
      site: "Main gauche",
    };
    expect(readProcedureTypeFromPayload(payload)).toBe("LACERATION_REPAIR");
    expect(readPerformedAtFromPayload(payload)).toBe("2026-05-18T14:30:00.000Z");
    expect(readPerformedByDisplayNameFromPayload(payload)).toBe("Dr Alice Test");
  });

  it("builds French clinical summary with name, time, users, and status", () => {
    const meta = buildDocumentedProcedureSummaryMeta({
      payloadJson: {
        procedureType: "FOLEY_CATHETER",
        performedAt: "2026-05-18T10:00:00.000Z",
        performedByDisplayName: "Inf. Marie Dupont",
        notes: "Retour urinaire clair.",
      },
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Inf. Marie Dupont",
    });
    expect(meta).not.toBeNull();
    expect(meta!.procedureNameFr).toContain("Sonde vésicale");
    expect(meta!.performedAtIso).toBe("2026-05-18T10:00:00.000Z");
    expect(meta!.documentedAtIso).toBe("2026-05-18T10:05:00.000Z");
    expect(meta!.performedByDisplayName).toBe("Inf. Marie Dupont");
    expect(meta!.documentedByDisplayName).toBe("Inf. Marie Dupont");
    expect(meta!.status).toBe("COMPLETED");
    expect(meta!.clinicalSummaryFr).toContain("Réalisée le 2026-05-18T10:00:00.000Z");
    expect(meta!.clinicalSummaryFr).toContain("Documentée par Inf. Marie Dupont");
    expect(meta!.clinicalSummaryFr).toContain("Statut : terminée");
    expect(meta!.clinicalSummaryEn).toContain("Status: completed");
    expect(meta!.clinicalSummaryEn).not.toContain("Réalisée");
    expect(meta!.clinicalSummaryEn).not.toContain("Volet");
    expect(meta!.clinicalSummaryEn).not.toContain("terminée");
  });

  it("builds English clinical summary without French UI phrases", () => {
    const payload = {
      procedureType: "REDUCTION",
      performedAt: "2026-05-18T10:00:00.000Z",
      performedByDisplayName: "Dr Alice Test",
      performerTitle: "Dr",
    };
    const summary = formatDocumentedProcedureClinicalSummary({
      payloadJson: payload,
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Dr Alice Test",
      locale: "en",
    });
    expect(summary).toContain("Reduction (documented)");
    expect(summary).toContain("Performed at");
    expect(summary).toContain("Section: provider");
    expect(summary).not.toMatch(/Réduction|Réalisée|Volet|terminée/);
  });

  it("keeps French clinical summary for French locale", () => {
    const summary = formatDocumentedProcedureClinicalSummary({
      payloadJson: {
        procedureType: "REDUCTION",
        performedAt: "2026-05-18T10:00:00.000Z",
        performedByDisplayName: "Dr Alice Test",
      },
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Dr Alice Test",
      locale: "fr",
    });
    expect(summary).toContain("Réduction");
    expect(summary).toContain("Réalisée le");
    expect(summary).toContain("Volet : médecin");
  });

  it("returns null when procedure type is missing", () => {
    expect(
      buildDocumentedProcedureSummaryMeta({
        payloadJson: { site: "Thorax" },
        documentedAtIso: "2026-05-18T10:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      })
    ).toBeNull();
  });

  it("supports advanced procedure types", () => {
    const meta = buildDocumentedProcedureSummaryMeta({
      payloadJson: {
        procedureType: "INTUBATION",
        performedAt: "2026-05-18T16:00:00.000Z",
        performerDisplayName: "Dr Bob Lee",
      },
      documentedAtIso: "2026-05-18T16:01:00.000Z",
      documentedByDisplayName: "Dr Bob Lee",
    });
    expect(meta!.procedureNameFr).toContain("Intubation");
    expect(meta!.performedByDisplayName).toBe("Dr Bob Lee");
  });
});
