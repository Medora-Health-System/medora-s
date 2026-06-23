import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildDocumentedProcedureSummaryMeta,
  serializeVaccineAdministrationDocumentationForMarNotes,
  type VaccineAdministrationDocumentation,
} from "@medora/shared";
import { buildErEdSummaryMarEventRows, buildErEdSummaryMedicationOrderRows } from "@/features/emergency/erEdSummaryMedicationMar";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";

const CHART_EXPORT_HTML_SOURCE = readFileSync(
  new URL("../../../../api/src/encounters/chart-export-html.util.ts", import.meta.url),
  "utf8"
);

const CHART_LIVE_PREVIEW_SOURCE = readFileSync(
  new URL("../../components/encounters/EncounterChartLivePreview.ts", import.meta.url),
  "utf8"
);

const PROCEDURES_CARD_SOURCE = readFileSync(
  new URL("../../components/clinical/ErProceduresSummaryCard.tsx", import.meta.url),
  "utf8"
);

const t = (key: string) => {
  const map: Record<string, string> = {
    "marTab.actions.administered": "Administered",
    "marTab.injectionSites.right_deltoid": "Right deltoid",
  };
  return map[key] ?? key;
};

function vaccineDoc(): VaccineAdministrationDocumentation {
  return {
    vaccineProductId: null,
    catalogCode: "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR",
    vaccineDisplayName: "Tdap vaccine",
    dose: "0.5",
    unit: "mL",
    route: "IM",
    site: "right_deltoid",
    laterality: "right",
    lotNumber: "AB345BA2",
    expirationDate: "2027-06-30",
    manufacturerId: "sanofi_pasteur",
    manufacturerDisplayName: "Sanofi Pasteur",
    visGiven: true,
    visRecipient: "patient",
    visDate: "2026-06-22",
    visEditionDate: null,
    allergiesVerified: true,
    fiveRightsConfirmed: true,
    educationReviewed: true,
    reviewedWith: "patient",
    reviewedTopics: ["reason_for_medication", "signs_of_allergic_reaction", "precautions"],
    understandingConfirmed: true,
    amountWasted: "",
    administeredAt: "2026-06-23T02:46:00.000Z",
    administeredBy: "Elizabeth Posada",
    administeredByCredentials: "RN",
  };
}

describe("edSummary19W — locale-safe procedure summaries", () => {
  it("EN procedure display summary does not contain French UI phrases", () => {
    const meta = buildDocumentedProcedureSummaryMeta({
      payloadJson: {
        procedureType: "REDUCTION",
        performedAt: "2026-05-18T10:00:00.000Z",
        performedByDisplayName: "Dr Alice Test",
        performerTitle: "Dr",
      },
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Dr Alice Test",
    });
    expect(meta?.clinicalSummaryEn).toMatch(/Reduction \(documented\)/);
    expect(meta?.clinicalSummaryEn).not.toMatch(/Réduction|Réalisée|Volet|terminée/);
  });

  it("FR procedure display summary still renders French", () => {
    const meta = buildDocumentedProcedureSummaryMeta({
      payloadJson: { procedureType: "REDUCTION", performedAt: "2026-05-18T10:00:00.000Z" },
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    expect(meta?.clinicalSummaryFr).toContain("Réduction");
    expect(meta?.clinicalSummaryFr).toContain("Volet : médecin");
  });

  it("does not mutate saved payload when building summary meta", () => {
    const payload = {
      procedureType: "LACERATION_REPAIR",
      performedAt: "2026-05-18T10:00:00.000Z",
      site: "Left hand",
      notes: "Patient tolerated well.",
    };
    const snapshot = structuredClone(payload);
    buildDocumentedProcedureSummaryMeta({
      payloadJson: payload,
      documentedAtIso: "2026-05-18T10:05:00.000Z",
      documentedByDisplayName: "Dr Alice Test",
    });
    expect(payload).toEqual(snapshot);
  });

  it("procedure summary card uses locale formatter instead of raw clinicalSummaryFr", () => {
    expect(PROCEDURES_CARD_SOURCE).toContain("formatDocumentedProcedureClinicalSummary");
    expect(PROCEDURES_CARD_SOURCE).not.toMatch(/summaryDetailClinicalSummary.*clinicalSummaryFr/s);
  });
});

describe("edSummary19W — medication orders and MAR", () => {
  it("includes medication orders with metadata", () => {
    const rows = buildErEdSummaryMedicationOrderRows({
      language: "en",
      t,
      orders: [
        {
          createdAt: "2026-05-18T09:00:00.000Z",
          createdByUser: { firstName: "Alice", lastName: "Provider" },
          items: [
            {
              id: "oi-1",
              catalogItemType: "MEDICATION",
              manualLabel: "Acetaminophen 500 mg",
              route: "PO",
              doseValue: "500",
              doseUnit: "mg",
              notes: "Every 6 hours PRN",
              status: "ACTIVE",
            },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.medicationName).toContain("Acetaminophen");
    expect(rows[0]?.route).toBe("PO");
    expect(rows[0]?.orderedBy).toBe("Alice Provider");
    expect(rows[0]?.status).toBe("ACTIVE");
  });

  it("includes MAR administered event with IM injection site when present", () => {
    const rows = buildErEdSummaryMarEventRows({
      language: "en",
      t,
      admins: [
        {
          id: "mar-1",
          medicationLabelSnapshot: "Morphine 2 mg",
          marAction: "administered",
          route: "IM",
          administeredAt: "2026-05-18T11:00:00.000Z",
          notes: "IM_INJECTION_SITE:right_deltoid",
          administeredBy: { firstName: "Marie", lastName: "Nurse" },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe("Administered");
    expect(rows[0]?.injectionSite).toBe("Right deltoid");
  });

  it("sanitizes vaccine MAR notes for registration and print rows", () => {
    const dirtyNotes = [
      "Action: Administered",
      "Site d'injection : Deltoïde droit",
      "IM_INJECTION_SITE:right_deltoid",
      serializeVaccineAdministrationDocumentationForMarNotes(vaccineDoc()),
    ].join("\n");
    const rows = buildErEdSummaryMarEventRows({
      language: "en",
      t,
      admins: [
        {
          id: "mar-vax",
          medicationLabelSnapshot: "Tdap vaccine",
          marAction: "administered",
          route: "IM",
          administeredAt: "2026-06-23T02:46:00.000Z",
          notes: dirtyNotes,
          administeredBy: { firstName: "Elizabeth", lastName: "Posada" },
        },
      ],
    });
    expect(rows[0]?.notes).toContain("Tdap vaccine");
    expect(rows[0]?.notes).toContain("right deltoid");
    expect(rows[0]?.notes).not.toContain("Site d'injection");
    expect(rows[0]?.notes).not.toContain("VACCINE_ADMINISTRATION_DOCUMENTATION");
    expect(rows[0]?.notes).not.toContain("IM_INJECTION_SITE");
  });
});

describe("edSummary19W — provider documentation visibility", () => {
  const SUMMARY_MODEL_SOURCE = readFileSync(
    new URL("./emergencyVisitSummaryModel.ts", import.meta.url),
    "utf8"
  );

  it("does not suppress current provider documentation when history exists", () => {
    expect(SUMMARY_MODEL_SOURCE).not.toContain(
      "evaluationMedicale: providerMseHistory.length > 0 ? null : evaluationMedicale"
    );
  });
});

describe("edSummary19W — ER packet and chart export completeness", () => {
  it("ER packet HTML includes medication orders, MAR, and procedures", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T08:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: "HOME" },
        nursingAssessment: {},
      },
      triageSnapshot: null,
      language: "en",
      medicationOrderRows: [
        {
          id: "oi-1",
          medicationName: "Acetaminophen",
          dose: "500 mg",
          route: "PO",
          instructions: "PRN",
          orderedBy: "Dr Alice",
          orderedAt: "May 18, 2026",
          status: "ACTIVE",
        },
      ],
      marEventRows: [
        {
          id: "mar-1",
          medicationName: "Morphine",
          action: "Administered",
          dose: "2 mg",
          route: "IM",
          injectionSite: "Right deltoid",
          administeredBy: "RN Marie",
          administeredAt: "May 18, 2026",
          notes: "—",
        },
      ],
      procedureSummaries: ["Reduction (documented) — Status: completed"],
    });
    expect(html).toContain("Medication orders");
    expect(html).toContain("Medication administrations (MAR)");
    expect(html).toContain("Procedures");
    expect(html).toContain("Acetaminophen");
    expect(html).toContain("Morphine");
    expect(html).toContain("Reduction (documented)");
    expect(html).not.toContain("Volet");
  });

  it("chart export HTML default locale uses English procedure labels", () => {
    expect(CHART_EXPORT_HTML_SOURCE).toContain('locale: ChartExportHtmlLocale = "en"');
    expect(CHART_EXPORT_HTML_SOURCE).toContain('performedAt: "Performed at"');
    expect(CHART_EXPORT_HTML_SOURCE).toContain('roleProvider: "Provider documentation"');
    expect(CHART_EXPORT_HTML_SOURCE).toContain('performedAt: "Réalisée le"');
  });

  it("live chart preview sanitizes visible MAR notes", () => {
    expect(CHART_LIVE_PREVIEW_SOURCE).toContain("sanitizeMarAdministrationVisibleNote");
  });

  it("server chart export sanitizes visible MAR notes", () => {
    expect(CHART_EXPORT_HTML_SOURCE).toContain("sanitizeMarAdministrationVisibleNote");
  });
});
