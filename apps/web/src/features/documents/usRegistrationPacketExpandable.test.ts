import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_PACKET_CONTENT_VERSION,
  sectionCatalogForTemplate,
} from "./usRegistrationPacketContent";

const webRoot = join(import.meta.dirname, "../..");
const repoRoot = join(webRoot, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function readApi(relativePath: string): string {
  return readFileSync(join(repoRoot, "apps/api", relativePath), "utf8");
}

/** Strip block/line comments so disclaimer comments about legacy brands don't trip content scans. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const wizardComponent = readSrc("components/documents/RegistrationPacketWizard.tsx");
const docCenterComponent = readSrc("components/documents/RegistrationDocumentCenter.tsx");
const expandableComponent = readSrc("components/documents/ExpandableLegalSection.tsx");
const catalogSource = readSrc("features/documents/usRegistrationPacketContent.ts");
const enMessages = readSrc("i18n/messages/en.ts");
const frMessages = readSrc("i18n/messages/fr.ts");
const apiContentLibrary = readApi("prisma/registration-packets/content/us-enterprise-sections-v2.ts");
const seedHelper = readApi("prisma/helpers/seed-registration-packet-templates-v2.ts");

/** Extract the `packetWizard: { ... }` and `documentCenter: { ... }` blocks from an i18n message file. */
function extractI18nBlock(src: string, blockName: string): string {
  const startMarker = `${blockName}: {`;
  const start = src.indexOf(startMarker);
  if (start === -1) return "";
  let depth = 0;
  let i = start + startMarker.length - 1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(start, i + 1);
}

describe("US registration packet expandable disclosures", () => {
  describe("No Priority ER branding", () => {
    it("wizard component does not reference Priority ER", () => {
      expect(stripComments(wizardComponent)).not.toMatch(/Priority ER/i);
    });

    it("document center component does not reference Priority ER", () => {
      expect(stripComments(docCenterComponent)).not.toMatch(/Priority ER/i);
    });

    it("client section catalog does not reference Priority ER as branding", () => {
      expect(stripComments(catalogSource)).not.toMatch(/Priority ER/i);
    });

    it("API content library does not reference Priority ER as branding (comments excluded)", () => {
      expect(stripComments(apiContentLibrary)).not.toMatch(/Priority ER/i);
    });

    it("seed helper does not reference Priority ER as branding (comments excluded)", () => {
      expect(stripComments(seedHelper)).not.toMatch(/Priority ER/i);
    });

    it("i18n packetWizard strings do not reference Priority ER", () => {
      expect(extractI18nBlock(enMessages, "packetWizard")).not.toMatch(/Priority ER/i);
      expect(extractI18nBlock(frMessages, "packetWizard")).not.toMatch(/Priority ER/i);
    });

    it("i18n documentCenter packet strings do not reference Priority ER", () => {
      expect(extractI18nBlock(enMessages, "documentCenter")).not.toMatch(/Priority ER/i);
      expect(extractI18nBlock(frMessages, "documentCenter")).not.toMatch(/Priority ER/i);
    });
  });

  describe("No legacy dollar amounts", () => {
    const legacyAmounts = ["$495", "$750"];

    it("wizard/document-center components have no legacy fee amounts", () => {
      for (const amount of legacyAmounts) {
        expect(wizardComponent).not.toContain(amount);
        expect(docCenterComponent).not.toContain(amount);
      }
    });

    it("client and API content libraries have no legacy fee amounts", () => {
      for (const amount of legacyAmounts) {
        expect(catalogSource).not.toContain(amount);
        expect(apiContentLibrary).not.toContain(amount);
      }
    });

    it("i18n packet strings have no legacy fee amounts", () => {
      const enPacket = extractI18nBlock(enMessages, "packetWizard") + extractI18nBlock(enMessages, "documentCenter");
      const frPacket = extractI18nBlock(frMessages, "packetWizard") + extractI18nBlock(frMessages, "documentCenter");
      for (const amount of legacyAmounts) {
        expect(enPacket).not.toContain(amount);
        expect(frPacket).not.toContain(amount);
      }
    });
  });

  describe("ExpandableLegalSection", () => {
    it("exists and exports ExpandableLegalSection", () => {
      expect(expandableComponent).toContain("export function ExpandableLegalSection");
    });

    it("renders a see more / show less toggle", () => {
      expect(expandableComponent).toContain("seeMoreLabel");
      expect(expandableComponent).toContain("showLessLabel");
      expect(expandableComponent).toContain("expanded ? showLessLabel : seeMoreLabel");
    });

    it("accepts summary and fullBody separately", () => {
      expect(expandableComponent).toContain("summary");
      expect(expandableComponent).toContain("fullBody");
    });

    it("wizard imports ExpandableLegalSection from ./ExpandableLegalSection", () => {
      expect(wizardComponent).toContain('import { ExpandableLegalSection } from "./ExpandableLegalSection"');
    });
  });

  describe("Opening see more does not mark reviewed", () => {
    it("ExpandableLegalSection's onFullTextMadeAvailable does not set reviewed status itself", () => {
      expect(expandableComponent).not.toContain("setSectionStatus");
      expect(expandableComponent).not.toContain('"reviewed"');
      expect(expandableComponent).toContain("Opening See more does NOT mark the section reviewed");
    });

    it("wizard's full-text-available handler does not touch sectionStatus", () => {
      const handlerMatch = wizardComponent.match(
        /const handleFullTextMadeAvailable = useCallback\(\(key: string\) => \{[\s\S]*?\n {2}\}, \[\]\);/,
      );
      expect(handlerMatch).not.toBeNull();
      expect(handlerMatch![0]).not.toContain("setSectionStatus");
      expect(handlerMatch![0]).not.toContain('"reviewed"');
    });

    it("markReviewed is a separate explicit action, not triggered by expanding text", () => {
      expect(wizardComponent).toContain("const markReviewed = (key: string)");
      expect(wizardComponent).toContain("onFullTextMadeAvailable={() => handleFullTextMadeAvailable(key)}");
    });
  });

  describe("Acknowledgment gating", () => {
    it("acknowledgment-required sections show a checkbox before allowing Mark as reviewed", () => {
      expect(wizardComponent).toContain("requiresAck");
      expect(wizardComponent).toContain("packetWizard.sectionAcknowledge");
      expect(wizardComponent).toContain("canMarkReviewed");
    });

    it("Mark as reviewed button is disabled when acknowledgment is required but unchecked", () => {
      expect(wizardComponent).toContain("disabled={!canMarkReviewed(key)}");
    });
  });

  describe("Finalize structured model", () => {
    it("includes body and fullBody as full legal text", () => {
      expect(wizardComponent).toContain("const fullBody = t(section.fullKey)");
      expect(wizardComponent).toContain("body: fullBody");
      expect(wizardComponent).toContain("fullBody,");
    });

    it("includes conciseSummary", () => {
      expect(wizardComponent).toContain("conciseSummary: t(section.summaryKey)");
    });

    it("uses contentVersion 2.0 via CURRENT_PACKET_CONTENT_VERSION", () => {
      expect(wizardComponent).toContain("contentVersion: CURRENT_PACKET_CONTENT_VERSION");
      expect(wizardComponent).toContain(
        'import {\n  CURRENT_PACKET_CONTENT_VERSION,\n  sectionCatalogForTemplate,\n  type PacketSectionContent,\n} from "@/features/documents/usRegistrationPacketContent"',
      );
    });

    it("sets legalReviewStatus to LEGAL_REVIEW", () => {
      expect(wizardComponent).toContain('legalReviewStatus: "LEGAL_REVIEW"');
    });

    it("tracks fullTextMadeAvailable and acknowledged fields per section", () => {
      expect(wizardComponent).toContain("fullTextMadeAvailable: !!fullTextAvailable[section.key]");
      expect(wizardComponent).toContain("fullTextMadeAvailableAt:");
      expect(wizardComponent).toContain("acknowledged,");
      expect(wizardComponent).toContain("acknowledgedAt:");
    });
  });

  describe("No Surprises Act protections not waived by AOB", () => {
    it("AOB full text explicitly states it does not waive No Surprises Act protections", () => {
      expect(enMessages).toContain("does not waive No Surprises Act protections");
      expect(frMessages).toMatch(/ne renonce pas aux protections de la No Surprises Act/);
    });

    it("AOB full text does not describe assignment of benefits as a waiver of NSA rights", () => {
      const aobFullMatch = enMessages.match(/aobFull: "([^"]*(?:\\.[^"]*)*)"/);
      expect(aobFullMatch).not.toBeNull();
      expect(aobFullMatch![1]).not.toMatch(/waive(s)? (my|the) No Surprises/i);
    });
  });

  describe("Medicare/Medicaid text is configuration-based, not a hard-coded fact", () => {
    it("EN medicare text ties participation to facility configuration, not an absolute claim", () => {
      expect(enMessages).toContain("medicareMedicaidFull:");
      expect(enMessages).not.toContain("may not accept Medicare or Medicaid");
      expect(enMessages).not.toContain(
        "this facility is a freestanding emergency room and may not participate in Medicare or Medicaid",
      );
      const medicareBlock = extractI18nBlock(enMessages, "packetWizard");
      expect(medicareBlock).toMatch(/configur/i);
    });

    it("FR medicare text ties participation to facility configuration, not an absolute claim", () => {
      expect(frMessages).not.toContain(
        "cet établissement est une salle d'urgence autonome et peut ne pas participer",
      );
      const medicareBlockFr = extractI18nBlock(frMessages, "packetWizard");
      expect(medicareBlockFr).toMatch(/configur/i);
    });

    it("documentCenter Medicare/Medicaid warning is configuration-based", () => {
      expect(enMessages).toContain("packetMedicareMedicaidWarning");
      expect(enMessages).not.toContain(
        'packetMedicareMedicaidWarning: "This facility may not accept Medicare or Medicaid.',
      );
    });

    it("API content library medicare section defers to facility configuration for participation status", () => {
      expect(apiContentLibrary).toMatch(/determined solely by this facility's approved registration disclosure configuration/);
      expect(apiContentLibrary).not.toMatch(/this facility does not participate in Medicare/i);
    });
  });

  describe("Catalog differs by packet template", () => {
    it("FREESTANDING_ER includes medicareMedicaid, CLINIC does not", () => {
      const erKeys = sectionCatalogForTemplate("FREESTANDING_ER").map((s) => s.key);
      const clinicKeys = sectionCatalogForTemplate("CLINIC").map((s) => s.key);
      expect(erKeys).toContain("medicareMedicaid");
      expect(clinicKeys).not.toContain("medicareMedicaid");
    });

    it("CLINIC lacks safetyPolicy and personalBelongings sections that ER has", () => {
      const erKeys = sectionCatalogForTemplate("FREESTANDING_ER").map((s) => s.key);
      const clinicKeys = sectionCatalogForTemplate("CLINIC").map((s) => s.key);
      expect(erKeys).toContain("safetyPolicy");
      expect(erKeys).toContain("personalBelongings");
      expect(clinicKeys).not.toContain("safetyPolicy");
      expect(clinicKeys).not.toContain("personalBelongings");
    });

    it("FREESTANDING_ER and CLINIC catalogs are not identical", () => {
      const erKeys = sectionCatalogForTemplate("FREESTANDING_ER").map((s) => s.key).sort();
      const clinicKeys = sectionCatalogForTemplate("CLINIC").map((s) => s.key).sort();
      expect(erKeys).not.toEqual(clinicKeys);
    });
  });

  describe("Content version", () => {
    it("CURRENT_PACKET_CONTENT_VERSION is 2.0", () => {
      expect(CURRENT_PACKET_CONTENT_VERSION).toBe("2.0");
    });
  });
});
