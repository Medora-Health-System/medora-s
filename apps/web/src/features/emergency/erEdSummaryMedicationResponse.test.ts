import { describe, expect, it } from "vitest";
import {
  buildErEdSummaryMedicationResponseRows,
} from "@/features/emergency/erEdSummaryMedicationMar";
import {
  buildMarMedicationResponseNotes,
  resolveMedicationResponseDocumentedByLabel,
} from "@medora/shared";

function adminRow(input: {
  id: string;
  medicationLabelSnapshot: string;
  doseValue?: string;
  doseUnit?: string;
  route?: string;
  administeredAt: string;
  notes: string | null;
  medicationResponses?: ReturnType<typeof buildMarMedicationResponseNotes> extends { ok: true; notes: string }
    ? never
    : unknown[];
}) {
  return {
    id: input.id,
    medicationLabelSnapshot: input.medicationLabelSnapshot,
    doseValue: input.doseValue ?? "30",
    doseUnit: input.doseUnit ?? "mg",
    route: input.route ?? "IVP",
    administeredAt: input.administeredAt,
    notes: input.notes,
    medicationResponses: input.medicationResponses,
  };
}

function buildResponseNotes(
  code: "PAIN_REDUCED" | "EFFECTIVE" | "NO_CHANGE",
  extra?: Record<string, unknown>
) {
  const built = buildMarMedicationResponseNotes(null, {
    responseCode: code,
    documentedAt: "2026-06-25T17:14:00.000Z",
    responseTime: "2026-06-25T16:01:00.000Z",
    painBefore: 8,
    painAfter: 3,
    painResponseTrend: "IMPROVED",
    noAdverseReaction: true,
    responseDetail: "Well tolerated by patient",
    documentedByInitials: "EP",
    documentedByDisplayName: "Elizabeth Posada RN",
    documentedByUserId: "user-ep",
    documentedByName: "Elizabeth Posada RN",
    documentedBy: "Elizabeth Posada RN",
    ...extra,
  });
  if (!built.ok) throw new Error("failed to build notes");
  return built.notes;
}

describe("erEdSummaryMedicationResponse", () => {
  it("includes Ketorolac response in encounter summary rows", () => {
    const rows = buildErEdSummaryMedicationResponseRows({
      language: "en",
      admins: [
        adminRow({
          id: "admin-ket",
          medicationLabelSnapshot: "Ketorolac 30 mg/mL IVP",
          administeredAt: "2026-06-25T15:46:00.000Z",
          notes: buildResponseNotes("PAIN_REDUCED"),
        }),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.medicationName).toContain("Ketorolac");
    expect(resolveMedicationResponseDocumentedByLabel(rows[0]!.response)).toBe("EP");
  });

  it("includes opioid response row", () => {
    const rows = buildErEdSummaryMedicationResponseRows({
      language: "en",
      admins: [
        adminRow({
          id: "admin-opioid",
          medicationLabelSnapshot: "Acetaminophen/Codeine",
          administeredAt: "2026-06-25T12:00:00.000Z",
          notes: buildResponseNotes("EFFECTIVE"),
        }),
      ],
    });
    expect(rows[0]?.medicationName).toContain("Acetaminophen/Codeine");
  });

  it("includes lidocaine/gabapentin response when documented", () => {
    const rows = buildErEdSummaryMedicationResponseRows({
      language: "en",
      admins: [
        adminRow({
          id: "admin-topical",
          medicationLabelSnapshot: "Lidocaine/Gabapentin",
          administeredAt: "2026-06-25T10:00:00.000Z",
          notes: buildResponseNotes("NO_CHANGE", { painBefore: 6, painAfter: 6, painResponseTrend: "SAME" }),
        }),
      ],
    });
    expect(rows[0]?.medicationName).toContain("Lidocaine/Gabapentin");
  });

  it("orders multiple responses newest first", () => {
    const first = buildMarMedicationResponseNotes(null, {
      responseCode: "EFFECTIVE",
      documentedAt: "2026-06-25T10:00:00.000Z",
      documentedByInitials: "EP",
    });
    const second = buildMarMedicationResponseNotes(first.ok ? first.notes : null, {
      responseCode: "PAIN_REDUCED",
      documentedAt: "2026-06-25T12:00:00.000Z",
      documentedByInitials: "EP",
    });
    const rows = buildErEdSummaryMedicationResponseRows({
      language: "en",
      admins: [
        adminRow({
          id: "admin-multi",
          medicationLabelSnapshot: "Ketorolac 30 mg/mL IVP",
          administeredAt: "2026-06-25T09:00:00.000Z",
          notes: second.ok ? second.notes : null,
        }),
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.response.documentedAt).toBe("2026-06-25T12:00:00.000Z");
  });

  it("does not duplicate rows from same submit", () => {
    const notes = buildResponseNotes("PAIN_REDUCED");
    const parsed = [
      {
        responseCode: "PAIN_REDUCED",
        responseDetail: "Well tolerated by patient",
        responseTime: "2026-06-25T16:01:00.000Z",
        documentedAt: "2026-06-25T17:14:00.000Z",
        painBefore: 8,
        painAfter: 3,
        painResponseTrend: "IMPROVED",
        noAdverseReaction: true,
        nausea: null,
        vomiting: null,
        itching: null,
        sedation: null,
        dizziness: null,
        constipation: null,
        respiratoryDepression: null,
        documentedBy: "Elizabeth Posada RN",
        documentedByInitials: "EP",
        documentedByDisplayName: "Elizabeth Posada RN",
        documentedByUserId: "user-ep",
        documentedByName: "Elizabeth Posada RN",
      },
    ];
    const rows = buildErEdSummaryMedicationResponseRows({
      language: "en",
      admins: [
        adminRow({
          id: "admin-dedupe",
          medicationLabelSnapshot: "Ketorolac 30 mg/mL IVP",
          administeredAt: "2026-06-25T15:46:00.000Z",
          notes,
          medicationResponses: parsed,
        }),
      ],
    });
    expect(rows).toHaveLength(1);
  });
});
