import {
  DENTAL_PLAN_ACCEPTANCE_LEGAL_SOURCE,
  chartExportDentalChrome,
  chartExportHtmlChrome,
} from "./chart-export-print-chrome";
import { packetPdfChrome } from "../documents/packet-pdf-chrome";

describe("MEDUI.ES.1J.B chart-export / PDF chrome isolation", () => {
  it("dental chrome has no cross-language leakage", () => {
    const en = chartExportDentalChrome("en");
    const fr = chartExportDentalChrome("fr");
    const es = chartExportDentalChrome("es");
    expect(en.historyReviewLabel).toBe("History review (dental encounter)");
    expect(fr.historyReviewLabel).toBe("Revue des antécédents (rencontre dentaire)");
    expect(es.historyReviewLabel).toBe("Revisión de antecedentes (encuentro dental)");
    expect(es.notDocumented).toBe("No documentado");
    expect(es.historyReviewLabel).not.toBe(fr.historyReviewLabel);
    expect(es.historyReviewLabel).not.toBe(en.historyReviewLabel);
    expect(fr.notDocumented).not.toBe(en.notDocumented);
  });

  it("keeps dental plan-acceptance legal source frozen in French", () => {
    expect(DENTAL_PLAN_ACCEPTANCE_LEGAL_SOURCE).toBe(
      "Acceptation du plan (≠ consentement procédural signé)"
    );
    expect(DENTAL_PLAN_ACCEPTANCE_LEGAL_SOURCE).not.toMatch(/aceptaci[oó]n/i);
    expect(DENTAL_PLAN_ACCEPTANCE_LEGAL_SOURCE).not.toMatch(/acceptance of the plan/i);
  });

  it("HTML signer chrome is locale-isolated", () => {
    expect(chartExportHtmlChrome("en").primarySigner).toBe("Primary signer");
    expect(chartExportHtmlChrome("fr").primarySigner).toBe("Signataire principal");
    expect(chartExportHtmlChrome("es").primarySigner).toBe("Firmante principal");
    expect(chartExportHtmlChrome("es").unifiedTimelineTitle).not.toContain("Chronologie");
    expect(chartExportHtmlChrome("en").unifiedTimelineTitle).not.toContain("Chronologie");
  });

  it("PDF chrome is locale-isolated", () => {
    expect(packetPdfChrome("en").registrationPackage).toBe("Registration Package");
    expect(packetPdfChrome("en").locale).toBe("Locale:");
    expect(packetPdfChrome("es").registrationPackage).toBe("Paquete de inscripción");
    expect(packetPdfChrome("es").locale).toBe("Idioma:");
    expect(packetPdfChrome("fr").registrationPackage).toBe("Paquet d'inscription");
    expect(packetPdfChrome("es").patientInformation).not.toBe(packetPdfChrome("en").patientInformation);
    expect(packetPdfChrome("es").patientInformation).not.toBe(packetPdfChrome("fr").patientInformation);
  });
});
