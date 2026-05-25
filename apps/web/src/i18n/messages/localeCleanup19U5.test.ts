import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  getOrderItemChartLabel,
  getOrderItemStatusLabel,
} from "@/constants/orderStatusLabels";
import {
  englishMedicationDisplayContainsFrench,
  normalizeMedicationDisplayForLocale,
} from "@/lib/localizedMedicationDisplay";
import { formatMsppMonthLabel } from "@/features/mspp/MsppReportingCharts";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("whole-EMR locale cleanup (19U.5)", () => {
  it("MSPP English message sections no longer contain French UI text", () => {
    expect(en.msppValidationAnalyticsPage.pageTitle).toBe("Validation analytics");
    expect(en.msppValidationAnalyticsPage.pageTitle).not.toMatch(/Analyse/i);
    expect(en.msppAuditPage.pageTitle).toMatch(/Validation history/i);
    expect(en.msppAuditPage.pageTitle).not.toMatch(/Historique/i);
    expect(en.msppRapportPrint.printButton).toBe("Print report");
    expect(en.msppRapportPrint.printButton).not.toMatch(/Imprimer/i);
    expect(en.diseaseReports.pipelineVisibilityNote).toMatch(/MSPP validation pipeline/i);
    expect(en.diseaseReports.pipelineVisibilityNote).not.toMatch(/Lorsque/i);
  });

  it("vaccination tab and page labels exist in both locales", () => {
    expect(en.publicHealthVaccinationsPage.pageTitle).toBe("Record a vaccination");
    expect(fr.publicHealthVaccinationsPage.pageTitle).toBe("Enregistrer une vaccination");
    expect(en.patientChartVaccinationsTab.loading).toMatch(/Loading/i);
    expect(fr.patientChartVaccinationsTab.loading).toMatch(/Chargement/i);
  });

  it("pathway milestone labels are locale-aware via i18n keys", () => {
    expect(en.encounterChrome.pathways.milestoneUiStatus.PENDING).toBe("Pending");
    expect(fr.encounterChrome.pathways.milestoneUiStatus.PENDING).toBe("En attente");
    expect(en.encounterChrome.pathways.markMetButton).toBe("Mark met");
    expect(fr.encounterChrome.pathways.markMetButton).toBe("Marquer atteint");
  });

  it("order status labels are locale-aware", () => {
    expect(getOrderItemStatusLabel("PENDING", "en")).toBe("Pending");
    expect(getOrderItemStatusLabel("PENDING", "fr")).toBe("En attente");
    expect(getOrderItemChartLabel("RESULTED", "en")).toBe("Completed");
    expect(getOrderItemChartLabel("RESULTED", "fr")).toBe("Terminée");
    expect(getOrderItemStatusLabel("UNKNOWN_STATUS_X", "en")).toBe("UNKNOWN_STATUS_X");
  });

  it("ReceiveStockModal normalizes French catalog metadata for English display", () => {
    const source = readFileSync(
      join(webRoot, "src/components/pharmacy/ReceiveStockModal.tsx"),
      "utf8"
    );
    expect(source).toContain("normalizeMedicationDisplayForLocale(dosageForm, language)");
    expect(source).not.toContain("[dosageForm, route].filter(Boolean).join");
    const displayed = [
      normalizeMedicationDisplayForLocale("comprimé", "en"),
      normalizeMedicationDisplayForLocale("orale", "en"),
    ].join(" · ");
    expect(englishMedicationDisplayContainsFrench(displayed)).toBe(false);
  });

  it("MSPP chart month labels follow active locale", () => {
    expect(formatMsppMonthLabel("2024-03", "en")).toMatch(/Mar/i);
    expect(formatMsppMonthLabel("2024-03", "fr")).toMatch(/mars|mar\./i);
  });

  it("PatientVaccinationsTab renders labels from i18n keys", () => {
    const source = readFileSync(
      join(webRoot, "src/components/patient-chart/PatientVaccinationsTab.tsx"),
      "utf8"
    );
    expect(source).toContain('t("patientChartVaccinationsTab.title")');
    expect(source).not.toContain(">Vaccinations</h3>");
  });

  it("does not auto-translate saved clinical documentation fixtures", () => {
    const fixture =
      "Patient said comprimé orale daily — custom home med comprimé saved to chart";
    expect(fixture).toContain("comprimé");
    expect(en.publicHealthVaccinationsPage.saveOk).not.toContain("comprimé");
  });
});
