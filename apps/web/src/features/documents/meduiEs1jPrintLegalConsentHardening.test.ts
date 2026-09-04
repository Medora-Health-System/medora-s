import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";
import { sectionCatalogForTemplate } from "@/features/documents/usRegistrationPacketContent";
import { printT } from "@/lib/printI18n";
import { buildPrintDocumentFooterHtml } from "@/lib/printFacilityHeader";
import {
  ES_MEDICAL_TERMINOLOGY,
  PRODUCT_DEFAULT_UI_LANGUAGE,
  UNLOCALIZED_CATALOG_SOURCE,
  hiddenSpanishPlaceholder,
  isHiddenSpanishPlaceholder,
  parseProductUiLanguage,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");
const repoRoot = join(webRoot, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const dischargePatient = { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" as const };
const inpatientEncounter = {
  createdAt: "2026-06-03T17:00:00.000Z",
  dischargeSummaryJson: {
    inpatientProviderDischarge: {
      schemaVersion: "INP.DIS.1C",
      dischargeDiagnoses: [
        { id: "1", code: "A41.9", description: "Sepsis", isPrimary: true, sortOrder: 0 },
      ],
      pendingStudies: [{ id: "p1", type: "IMAGING", description: "CT chest" }],
    },
  },
};

function erPrintBase(
  overrides: Partial<Parameters<typeof getErPrintPacketHtml>[0]> = {}
): Parameters<typeof getErPrintPacketHtml>[0] {
  return {
    patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
    encounter: {
      createdAt: "2026-05-18T08:00:00.000Z",
      dischargeSummaryJson: null,
      nursingAssessment: {},
    },
    triageSnapshot: null,
    language: "en",
    ...overrides,
  };
}

describe("MEDUI.ES.1J.A print / legal / consent pre-localization hardening", () => {
  const wizard = readSrc("components/documents/RegistrationPacketWizard.tsx");
  const printLayout = readSrc("components/encounters/DischargePrintLayout.tsx");
  const engine = readFileSync(
    join(repoRoot, "apps/api/src/documents/registration-packet-template.engine.ts"),
    "utf8",
  );
  const packetSource = readFileSync(
    join(repoRoot, "apps/api/src/documents/packet-source.service.ts"),
    "utf8",
  );
  const usFederal = readFileSync(
    join(repoRoot, "apps/api/prisma/registration-packets/legal-sources/us-federal.json"),
    "utf8",
  );

  describe("EMTALA print jurisdiction", () => {
    it("US applicable print still emits the EMTALA block", () => {
      const html = getErPrintPacketHtml(
        erPrintBase({
          facility: { name: "Wayne ED", country: "US" },
        }),
      );
      expect(html).toContain(printT("en", "printOutput.erPacket.sectionEmtalaSummary"));
      expect(html).toContain(printT("en", "printOutput.erPacket.emtalaArrival"));
    });

    it("US applicable print still emits emtalaNoData when no timeline evidence exists", () => {
      const html = getErPrintPacketHtml(
        erPrintBase({
          facility: { name: "Wayne ED", country: "US" },
          encounter: {
            createdAt: "",
            dischargeSummaryJson: null,
            nursingAssessment: {},
          },
        }),
      );
      expect(html).toContain(printT("en", "printOutput.erPacket.sectionEmtalaSummary"));
      expect(html).toContain(printT("en", "printOutput.erPacket.emtalaNoData"));
    });

    it("non-US print does not render the EMTALA legal block as applicable", () => {
      const html = getErPrintPacketHtml(
        erPrintBase({
          facility: { name: "Hopital Haiti", country: "HT" },
        }),
      );
      expect(html).not.toContain(printT("en", "printOutput.erPacket.sectionEmtalaSummary"));
      expect(html).not.toContain(printT("en", "printOutput.erPacket.emtalaNoData"));
      expect(html).not.toContain(printT("fr", "printOutput.erPacket.sectionEmtalaSummary"));
    });

    it("missing country does not auto-assert EMTALA applicability", () => {
      const html = getErPrintPacketHtml(erPrintBase({ facilityName: "Unspecified Facility" }));
      expect(html).not.toContain(printT("en", "printOutput.erPacket.sectionEmtalaSummary"));
      expect(html).not.toContain(printT("en", "printOutput.erPacket.emtalaNoData"));
    });
  });

  describe("HOSPITAL wizard EMTALA applicability", () => {
    it("HOSPITAL alone does not inject EMTALA; unknown stays false", () => {
      expect(sectionCatalogForTemplate("HOSPITAL").map((s) => s.key)).not.toContain("emtalaNotice");
      expect(sectionCatalogForTemplate("HOSPITAL", {}).map((s) => s.key)).not.toContain("emtalaNotice");
      expect(
        sectionCatalogForTemplate("HOSPITAL", { emtalaApplicable: true }).map((s) => s.key),
      ).toContain("emtalaNotice");
    });
  });

  describe("primary vs principal print", () => {
    it("runtime primary print uses primaryDiagnosis keys, not principalDiagnosis", () => {
      expect(printLayout).toContain('printT(language, "printOutput.discharge.primaryDiagnosis")');
      expect(printLayout).not.toContain("clinical.dx.principalDiagnosis");
      expect(printLayout).not.toContain('language === "fr" ? "PRINCIPAL"');
    });

    it("FR primary print is not PRINCIPAL and ES does not fall back to EN", () => {
      const fr = getDischargePrintHtml({
        patient: dischargePatient,
        encounter: inpatientEncounter,
        language: "fr",
      });
      const es = getDischargePrintHtml({
        patient: dischargePatient,
        encounter: inpatientEncounter,
        language: "es",
      });
      const en = getDischargePrintHtml({
        patient: dischargePatient,
        encounter: inpatientEncounter,
        language: "en",
      });
      expect(fr).toContain(printT("fr", "printOutput.discharge.primaryDiagnosis"));
      expect(fr).not.toMatch(/\bPRINCIPAL\b/);
      expect(es).toContain(printT("es", "printOutput.discharge.primaryDiagnosis"));
      expect(es).toContain("Diagnóstico primario");
      expect(es).not.toContain(printT("en", "printOutput.discharge.primaryDiagnosis"));
      expect(es).not.toContain("Primary diagnosis");
      expect(en).toContain(printT("en", "printOutput.discharge.primaryDiagnosis"));
    });

    it("clinical.dx.principalDiagnosis remains REVIEW_REQUIRED with no UI keys", () => {
      const principal = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.principalDiagnosis");
      expect(principal?.status).toBe("REVIEW_REQUIRED");
      expect(principal?.uiMessageKeys ?? []).toEqual([]);
    });
  });

  describe("print helpers locale isolation", () => {
    it("EN footer resolves EN; FR resolves FR; ES never resolves EN/FR", () => {
      const en = buildPrintDocumentFooterHtml("en", "9/4/2026", (s) => s, printT);
      const fr = buildPrintDocumentFooterHtml("fr", "9/4/2026", (s) => s, printT);
      const es = buildPrintDocumentFooterHtml("es", "9/4/2026", (s) => s, printT);
      expect(en).toContain("Document generated on 9/4/2026");
      expect(fr).toContain("Document généré le 9/4/2026");
      expect(es).not.toContain("Document generated on");
      expect(es).not.toContain("Document généré le");
      expect(es).toContain(printT("es", "printOutput.common.documentFooter").replace("{date}", "9/4/2026"));
      expect(isHiddenSpanishPlaceholder(printT("es", "printOutput.common.documentFooter"))).toBe(false);
    });
  });

  describe("wizard locale boundary", () => {
    it("missing locale uses product default EN; valid ES stays ES", () => {
      expect(PRODUCT_DEFAULT_UI_LANGUAGE).toBe("en");
      expect(parseProductUiLanguage(undefined)).toBeNull();
      expect(parseProductUiLanguage(null)).toBeNull();
      expect(parseProductUiLanguage("es")).toBe("es");
      expect(parseProductUiLanguage("es") ?? PRODUCT_DEFAULT_UI_LANGUAGE).toBe("es");
      expect(parseProductUiLanguage("") ?? PRODUCT_DEFAULT_UI_LANGUAGE).toBe("en");
      expect(wizard).toContain("parseProductUiLanguage(language) ?? PRODUCT_DEFAULT_UI_LANGUAGE");
      expect(wizard).not.toContain('locale: language || "fr"');
    });
  });

  describe("packet integrity and legal freeze", () => {
    it("pickLocalized does not rewrite sourceJson or hashes", () => {
      expect(engine).toContain("export function pickLocalized");
      expect(engine).toContain("UNLOCALIZED_CATALOG_SOURCE");
      expect(engine).not.toContain("map.en || map.fr");
      expect(packetSource).toContain("Cannot re-render a finalized packet");
      expect(packetSource).toContain("sourceHashSha256");
      expect(packetSource).toContain("renderedHashSha256");
    });

    it("repository legal status remains source-grounded pending approval", () => {
      expect(usFederal).toContain("SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL");
      expect(wizard).toContain('legalReviewStatus: "LEGAL_REVIEW"');
      expect(wizard).not.toMatch(/legalReviewStatus:\s*"APPROVED"/);
      expect(wizard).not.toMatch(/legalReviewStatus:\s*"PUBLISHED"/);
      expect(hiddenSpanishPlaceholder("clinical.dx.principalDiagnosis")).toContain("UNLOCALIZED_ES::");
    });
  });
});
