import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  US_CORE_PACKET_SECTIONS_V2,
  SPECIALIZED_PACKET_TEMPLATE_CODES,
  sectionsForPacketType,
} from "../../prisma/registration-packets/content/us-enterprise-sections-v2";
import { structuredPacketModelSchema } from "./dto/create-registration-packet.dto";

const repoRoot = join(__dirname, "../../../..");

function readApi(relativePath: string): string {
  return readFileSync(join(__dirname, "..", "..", relativePath), "utf8");
}

/** Strip block/line comments so disclaimer comments about legacy brands don't trip content scans. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("US registration packet expandable disclosures (API)", () => {
  describe("Content library has no Priority ER branding", () => {
    const contentLibrarySource = readApi("prisma/registration-packets/content/us-enterprise-sections-v2.ts");
    const seedHelper = readApi("prisma/helpers/seed-registration-packet-templates-v2.ts");

    it("content library code (excluding disclaimer comments) does not reference Priority ER", () => {
      expect(stripComments(contentLibrarySource)).not.toMatch(/Priority ER/i);
    });

    it("no section title/summary/body text contains Priority ER", () => {
      for (const section of US_CORE_PACKET_SECTIONS_V2) {
        expect(section.title.en).not.toMatch(/Priority ER/i);
        expect(section.title.fr).not.toMatch(/Priority ER/i);
        expect(section.conciseSummary.en).not.toMatch(/Priority ER/i);
        expect(section.conciseSummary.fr).not.toMatch(/Priority ER/i);
        expect(section.fullBody.en).not.toMatch(/Priority ER/i);
        expect(section.fullBody.fr).not.toMatch(/Priority ER/i);
      }
    });

    it("seed helper does not reference Priority ER as branding", () => {
      expect(stripComments(seedHelper)).not.toMatch(/Priority ER/i);
    });
  });

  describe("Legal source manifests exist with official URLs", () => {
    it("us-federal.json manifest exists", () => {
      expect(
        existsSync(join(repoRoot, "apps/api/prisma/registration-packets/legal-sources/us-federal.json")),
      ).toBe(true);
    });

    it("texas.json manifest exists", () => {
      expect(
        existsSync(join(repoRoot, "apps/api/prisma/registration-packets/legal-sources/texas.json")),
      ).toBe(true);
    });

    it("every source in us-federal.json has an official https URL and issuing authority", () => {
      const manifest = JSON.parse(readApi("prisma/registration-packets/legal-sources/us-federal.json"));
      expect(Array.isArray(manifest.sources)).toBe(true);
      expect(manifest.sources.length).toBeGreaterThan(0);
      for (const source of manifest.sources) {
        expect(typeof source.officialUrl).toBe("string");
        expect(source.officialUrl).toMatch(/^https:\/\//);
        expect(typeof source.issuingAuthority).toBe("string");
        expect(source.issuingAuthority.length).toBeGreaterThan(0);
      }
    });

    it("every source in texas.json has an official https URL and issuing authority", () => {
      const manifest = JSON.parse(readApi("prisma/registration-packets/legal-sources/texas.json"));
      expect(Array.isArray(manifest.sources)).toBe(true);
      expect(manifest.sources.length).toBeGreaterThan(0);
      for (const source of manifest.sources) {
        expect(typeof source.officialUrl).toBe("string");
        expect(source.officialUrl).toMatch(/^https:\/\//);
        expect(typeof source.issuingAuthority).toBe("string");
        expect(source.issuingAuthority.length).toBeGreaterThan(0);
      }
    });

    it("manifests are marked pending legal approval, not final legal copy", () => {
      const federal = JSON.parse(readApi("prisma/registration-packets/legal-sources/us-federal.json"));
      const texas = JSON.parse(readApi("prisma/registration-packets/legal-sources/texas.json"));
      expect(federal.status).toBe("SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL");
      expect(texas.status).toBe("SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL");
    });
  });

  describe("Section schema accepts conciseSummary/fullBody", () => {
    it("structuredPacketModelSchema section accepts conciseSummary and fullBody fields", () => {
      const parsed = structuredPacketModelSchema.safeParse({
        packetType: "FREESTANDING_ER",
        patient: { id: "pat-1" },
        facility: { id: "fac-1" },
        sections: [
          {
            id: "privacy",
            title: "HIPAA Notice of Privacy Practices Acknowledgment",
            body: "Full legal privacy notice text.",
            conciseSummary: "Short summary of the privacy notice.",
            fullBody: "Full legal privacy notice text.",
            contentVersion: "2.0",
            legalReviewStatus: "LEGAL_REVIEW",
            acknowledgmentRequired: true,
            fullTextMadeAvailable: true,
            fullTextMadeAvailableAt: "2026-07-15T12:00:00.000Z",
            acknowledged: true,
            acknowledgedAt: "2026-07-15T12:00:05.000Z",
            reviewed: true,
            reviewedAt: "2026-07-15T12:00:10.000Z",
          },
        ],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        const section = parsed.data.sections[0];
        expect(section.conciseSummary).toBe("Short summary of the privacy notice.");
        expect(section.fullBody).toBe("Full legal privacy notice text.");
        expect(section.contentVersion).toBe("2.0");
        expect(section.legalReviewStatus).toBe("LEGAL_REVIEW");
        expect(section.fullTextMadeAvailable).toBe(true);
        expect(section.acknowledged).toBe(true);
      }
    });

    it("section schema still requires body (full legal text) and id", () => {
      const parsed = structuredPacketModelSchema.safeParse({
        packetType: "CLINIC",
        patient: { id: "pat-1" },
        facility: { id: "fac-1" },
        sections: [{ title: "Consent", conciseSummary: "Short" } as unknown as Record<string, unknown>],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("PDF service uses full content, never summary-only", () => {
    const pdfSvc = readApi("src/documents/packet-pdf.service.ts");

    it("PacketPdfService renders full legal text into the signed PDF", () => {
      expect(pdfSvc).toContain("Full legal text");
      expect(pdfSvc).toContain("section.content");
    });

    it("packet-source.service prefers fullBody over conciseSummary when building PDF input", () => {
      const packetSourceSvc = readApi("src/documents/packet-source.service.ts");
      expect(packetSourceSvc).toContain("s.fullBody && s.fullBody.trim()) || s.body");
      expect(packetSourceSvc).not.toContain("s.conciseSummary || s.body");
    });
  });

  describe("Specialized packet template codes", () => {
    it("includes NO_SURPRISES_NOTICE", () => {
      expect(SPECIALIZED_PACKET_TEMPLATE_CODES).toContain("NO_SURPRISES_NOTICE");
    });

    it("includes NO_SURPRISES_NOTICE_AND_CONSENT as a distinct specialized template", () => {
      expect(SPECIALIZED_PACKET_TEMPLATE_CODES).toContain("NO_SURPRISES_NOTICE_AND_CONSENT");
    });
  });

  describe("Medicare/Medicaid content is configuration-based", () => {
    it("medicareMedicaid section text defers to facility configuration, not a hard-coded fact", () => {
      const medicare = US_CORE_PACKET_SECTIONS_V2.find((s) => s.key === "medicareMedicaid");
      expect(medicare).toBeDefined();
      expect(medicare!.fullBody.en).toMatch(/facility's approved registration disclosure configuration/i);
      expect(medicare!.fullBody.en).not.toMatch(/this facility does not participate in Medicare/i);
      expect(medicare!.fullBody.en).not.toMatch(/this facility may not accept Medicare or Medicaid/i);
    });

    it("medicareMedicaid section is only included for FREESTANDING_ER template", () => {
      const erSections = sectionsForPacketType("FREESTANDING_ER").map((s) => s.key);
      const clinicSections = sectionsForPacketType("CLINIC").map((s) => s.key);
      expect(erSections).toContain("medicareMedicaid");
      expect(clinicSections).not.toContain("medicareMedicaid");
    });
  });

  describe("Catalog differs by packet type (CLINIC vs FREESTANDING_ER)", () => {
    it("CLINIC lacks personalBelongings and safetyPolicy sections present for FREESTANDING_ER", () => {
      const erKeys = sectionsForPacketType("FREESTANDING_ER").map((s) => s.key);
      const clinicKeys = sectionsForPacketType("CLINIC").map((s) => s.key);
      expect(erKeys).toContain("personalBelongings");
      expect(erKeys).toContain("safetyPolicy");
      expect(clinicKeys).not.toContain("personalBelongings");
      expect(clinicKeys).not.toContain("safetyPolicy");
    });

    it("HOSPITAL includes emtalaNotice which other templates do not", () => {
      const hospitalKeys = sectionsForPacketType("HOSPITAL").map((s) => s.key);
      const erKeys = sectionsForPacketType("FREESTANDING_ER").map((s) => s.key);
      expect(hospitalKeys).toContain("emtalaNotice");
      expect(erKeys).not.toContain("emtalaNotice");
    });
  });

  describe("AOB does not embed No Surprises Act waiver", () => {
    it("aob fullBody explicitly states it does not waive No Surprises Act protections", () => {
      const aob = US_CORE_PACKET_SECTIONS_V2.find((s) => s.key === "aob");
      expect(aob).toBeDefined();
      expect(aob!.fullBody.en).toMatch(/does not waive No Surprises Act protections/i);
      expect(aob!.fullBody.en).not.toMatch(/waive(s)? (my|the) right to No Surprises/i);
    });
  });
});
