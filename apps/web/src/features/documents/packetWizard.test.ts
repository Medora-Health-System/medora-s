import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");
const repoRoot = join(webRoot, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function readApp(relativePath: string): string {
  return readFileSync(join(webRoot, "../app/app", relativePath), "utf8");
}

function readApi(relativePath: string): string {
  return readFileSync(join(repoRoot, "apps/api", relativePath), "utf8");
}

describe("MEDUI.REGISTRATION.PHASE_3_ELECTRONIC_PACKET_E_SIGNATURE", () => {
  const wizardComponent = readSrc("components/documents/RegistrationPacketWizard.tsx");
  const docCenterComponent = readSrc("components/documents/RegistrationDocumentCenter.tsx");
  const enMessages = readSrc("i18n/messages/en.ts");
  const frMessages = readSrc("i18n/messages/fr.ts");
  const schema = readApi("prisma/schema.prisma");
  const patientChartPage = readApp("patients/[id]/page.tsx");

  describe("Packet wizard component", () => {
    it("RegistrationPacketWizard component exists", () => {
      expect(existsSync(join(webRoot, "components/documents/RegistrationPacketWizard.tsx"))).toBe(true);
    });

    it("Document Center imports and renders the wizard", () => {
      expect(docCenterComponent).toContain("RegistrationPacketWizard");
      expect(docCenterComponent).toContain("activeWizard");
    });

    it("modal title centers facility name and Registration Package", () => {
      expect(wizardComponent).toContain("textAlign: \"center\"");
      expect(wizardComponent).toContain("packetWizard.registrationPackage");
      expect(wizardComponent).toContain("facilityName");
      expect(wizardComponent).not.toMatch(/templateLabel\(template\)/);
    });
  });

  describe("Packet templates", () => {
    it("has FREESTANDING_ER template", () => {
      expect(wizardComponent).toContain("FREESTANDING_ER");
    });

    it("has URGENT_CARE template", () => {
      expect(docCenterComponent).toContain("URGENT_CARE");
    });

    it("has CLINIC template", () => {
      expect(docCenterComponent).toContain('"CLINIC"');
    });

    it("has HOSPITAL template", () => {
      expect(docCenterComponent).toContain('"HOSPITAL"');
    });

    it("Freestanding ER includes Medicare/Medicaid section key", () => {
      expect(wizardComponent).toContain('"medicareMedicaid"');
      expect(wizardComponent).toContain("FREESTANDING_ER_SECTION_KEYS");
    });

    it("Standard templates do NOT include medicareMedicaid section", () => {
      expect(wizardComponent).toContain("STANDARD_SECTION_KEYS");
      const standardBlock = wizardComponent.slice(
        wizardComponent.indexOf("STANDARD_SECTION_KEYS"),
        wizardComponent.indexOf("] as const;", wizardComponent.indexOf("STANDARD_SECTION_KEYS")),
      );
      expect(standardBlock).not.toContain("medicareMedicaid");
    });

    it("Freestanding ER has all required section keys", () => {
      const requiredSections = [
        "demographics",
        "insurance",
        "consent",
        "aob",
        "privacy",
        "rights",
        "facilityNotice",
        "medicareMedicaid",
      ];
      for (const s of requiredSections) {
        expect(wizardComponent).toContain(`"${s}"`);
      }
    });
  });

  describe("Section accordion and completion tracking", () => {
    it("tracks section status (not_started, reviewed, signed)", () => {
      expect(wizardComponent).toContain("not_started");
      expect(wizardComponent).toContain("reviewed");
      expect(wizardComponent).toContain("SectionStatus");
    });

    it("has mark-as-reviewed button", () => {
      expect(wizardComponent).toContain("markReviewed");
      expect(wizardComponent).toContain("packetWizard.markReviewed");
    });

    it("shows progress counter", () => {
      expect(wizardComponent).toContain("packetWizard.progress");
      expect(wizardComponent).toContain("packetWizard.sectionsReviewed");
    });

    it("requires all sections reviewed before signing", () => {
      expect(wizardComponent).toContain("allReviewed");
      expect(wizardComponent).toContain("packetWizard.reviewAllFirst");
    });
  });

  describe("Signature capture", () => {
    it("has patient/legal representative signer name field", () => {
      expect(wizardComponent).toContain("signerName");
      expect(wizardComponent).toContain("packetWizard.signerNameLabel");
    });

    it("has signer relationship dropdown", () => {
      expect(wizardComponent).toContain("signerRelationship");
      expect(wizardComponent).toContain("packetWizard.relationSelf");
      expect(wizardComponent).toContain("packetWizard.relationParent");
      expect(wizardComponent).toContain("packetWizard.relationGuardian");
    });

    it("has staff/witness name field", () => {
      expect(wizardComponent).toContain("staffName");
      expect(wizardComponent).toContain("packetWizard.staffNameLabel");
    });

    it("stores signedAt timestamp", () => {
      expect(wizardComponent).toContain("signedAt");
      expect(wizardComponent).toContain("signerType: \"STAFF\"");
    });

    it("has unable/refused checkbox and reason field", () => {
      expect(wizardComponent).toContain("isRefused");
      expect(wizardComponent).toContain("packetWizard.unableRefused");
      expect(wizardComponent).toContain("refusalReason");
      expect(wizardComponent).toContain("packetWizard.refusalReasonLabel");
    });

    it("cannot finalize without staff name", () => {
      expect(wizardComponent).toContain("canFinalize");
      expect(wizardComponent).toContain("staffName.trim()");
    });

    it("cannot finalize without valid patient signature or refusal", () => {
      expect(wizardComponent).toContain("patientSigValid");
      expect(wizardComponent).toContain("staffSigValid");
      expect(wizardComponent).toContain("canFinalize");
    });
  });

  describe("Signed packet storage", () => {
    it("saves signed packet via registration-packets endpoint (structured lifecycle)", () => {
      expect(wizardComponent).toContain("/api/backend");
      expect(wizardComponent).toContain("registration-packets");
    });

    it("does NOT use NEXT_PUBLIC_API_URL", () => {
      expect(wizardComponent).not.toContain("NEXT_PUBLIC_API_URL");
    });

    it("sends structured model with packetType, packetVersion, locale", () => {
      expect(wizardComponent).toContain("structuredModel");
      expect(wizardComponent).toContain("packetType");
      expect(wizardComponent).toContain("packetVersion");
      expect(wizardComponent).toContain('"Content-Type": "application/json"');
    });

    it("sends facility name in structured model facility object", () => {
      expect(wizardComponent).toContain("facility: { id: facilityId, name: facilityName }");
    });

    it("document title uses facility name + Registration Package", () => {
      expect(wizardComponent).toContain("packetWizard.registrationPackage");
      expect(wizardComponent).toContain("facilityName");
      expect(wizardComponent).not.toContain("Freestanding ER Registration Package");
    });

    it("shows API error with saveErrorWithMessage", () => {
      expect(wizardComponent).toContain("packetWizard.saveErrorWithMessage");
      expect(wizardComponent).toContain("{message}");
      expect(wizardComponent).toContain("role=\"alert\"");
    });

    it("structured model includes sections with id, title, body, reviewed", () => {
      expect(wizardComponent).toContain("sections:");
      expect(wizardComponent).toContain("title:");
      expect(wizardComponent).toContain("body:");
      expect(wizardComponent).toContain("reviewed:");
    });

    it("structured model includes signatures array", () => {
      expect(wizardComponent).toContain("signatures:");
      expect(wizardComponent).toContain("signerType:");
      expect(wizardComponent).toContain("attestation:");
    });

    it("structured model includes attestations array", () => {
      expect(wizardComponent).toContain("attestations:");
    });

    it("does NOT upload HTML as signed packet", () => {
      expect(wizardComponent).not.toContain("buildPacketHtml");
      expect(wizardComponent).not.toContain('type: "text/html"');
      expect(wizardComponent).not.toContain("_signed_packet.html");
    });

    it("includes patientId in request body", () => {
      expect(wizardComponent).toContain("patientId");
    });

    it("calls finalize-packet endpoint after signatures", () => {
      expect(wizardComponent).toContain("finalize-packet");
    });
  });

  describe("Document Center status display", () => {
    it("shows packet status (Signed/In Progress/Refused)", () => {
      expect(docCenterComponent).toContain("getPacketStatus");
      expect(docCenterComponent).toContain("packetStatusSigned");
      expect(docCenterComponent).toContain("packetStatusInProgress");
      expect(docCenterComponent).toContain("packetStatusRefused");
    });

    it("has new version button for existing packets", () => {
      expect(docCenterComponent).toContain("newPacketVersion");
    });

    it("shows file type badges (PDF, JPG, e-Doc PDF)", () => {
      expect(docCenterComponent).toContain("getFileTypeBadge");
      expect(docCenterComponent).toContain("e-Doc PDF");
    });
  });

  describe("Pre-filled patient data", () => {
    it("wizard fetches patient data for pre-fill", () => {
      expect(wizardComponent).toContain("/patients/");
      expect(wizardComponent).toContain("setPatient");
    });

    it("wizard fetches insurance data", () => {
      expect(wizardComponent).toContain("/insurance");
      expect(wizardComponent).toContain("setInsurance");
    });

    it("demographics section shows patient name, DOB, phone, address", () => {
      expect(wizardComponent).toContain("packetWizard.fieldName");
      expect(wizardComponent).toContain("packetWizard.fieldDob");
      expect(wizardComponent).toContain("packetWizard.fieldPhone");
      expect(wizardComponent).toContain("packetWizard.fieldAddress");
    });

    it("insurance section shows primary and secondary", () => {
      expect(wizardComponent).toContain("packetWizard.fieldPrimary");
      expect(wizardComponent).toContain("packetWizard.fieldSecondary");
    });
  });

  describe("i18n keys", () => {
    const packetWizardKeys = [
      "progress",
      "sectionsReviewed",
      "sectionDemographics",
      "sectionInsurance",
      "sectionConsent",
      "sectionAob",
      "sectionPrivacy",
      "sectionRights",
      "sectionFacilityNotice",
      "sectionMedicareMedicaid",
      "statusNotStarted",
      "statusReviewed",
      "markReviewed",
      "signatureHeading",
      "reviewAllFirst",
      "unableRefused",
      "signerNameLabel",
      "signerRelationshipLabel",
      "staffNameLabel",
      "refusalReasonLabel",
      "finalizeSign",
      "finalizeRefused",
      "cancel",
      "saveError",
      "registrationPackage",
      "saveErrorWithMessage",
      "consentText",
      "aobText",
      "privacyText",
      "rightsText",
      "medicareMedicaidText",
    ];

    for (const key of packetWizardKeys) {
      it(`EN has packetWizard.${key}`, () => {
        expect(enMessages).toContain(key);
      });

      it(`FR has packetWizard.${key}`, () => {
        expect(frMessages).toContain(key);
      });
    }

    it("EN packet templates are subtype labels (not Freestanding ER Registration Package main title)", () => {
      expect(enMessages).toContain('packetTemplateFreestandingEr: "Freestanding Emergency Room Packet"');
      expect(enMessages).not.toContain("Freestanding ER Registration Package");
    });

    it("EN has packet status keys", () => {
      expect(enMessages).toContain("packetStatusSigned");
      expect(enMessages).toContain("packetStatusInProgress");
      expect(enMessages).toContain("packetStatusRefused");
    });

    it("FR has packet status keys", () => {
      expect(frMessages).toContain("packetStatusSigned");
      expect(frMessages).toContain("packetStatusInProgress");
      expect(frMessages).toContain("packetStatusRefused");
    });

    it("FR has registrationPackage and saveErrorWithMessage", () => {
      expect(frMessages).toContain("registrationPackage");
      expect(frMessages).toContain("saveErrorWithMessage");
    });
  });

  describe("Safety and regression", () => {
    it("no PatientDocument model in schema", () => {
      expect(schema).not.toContain("model PatientDocument {");
    });

    it("EnterpriseDocument model still exists", () => {
      expect(schema).toContain("model EnterpriseDocument {");
    });

    it("document center still has insurance card upload", () => {
      expect(docCenterComponent).toContain("INSURANCE_CARD_FRONT");
      expect(docCenterComponent).toContain("INSURANCE_CARD_BACK");
    });

    it("document center still has ID card upload", () => {
      expect(docCenterComponent).toContain("PATIENT_ID_FRONT");
      expect(docCenterComponent).toContain("PATIENT_ID_BACK");
    });

    it("document center still has other document upload", () => {
      expect(docCenterComponent).toContain("OTHER_REGISTRATION_DOCUMENT");
    });

    it("patient chart is not affected", () => {
      expect(patientChartPage).not.toContain("RegistrationPacketWizard");
      expect(patientChartPage).toContain("ChartInsuranceReadOnlySummary");
    });

    it("API has PacketPdfService for PDF generation", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("class PacketPdfService");
      expect(pdfSvc).toContain("PDFDocument");
      expect(pdfSvc).toContain("Promise<Buffer>");
    });

    it("API controller has generate-packet-pdf endpoint (legacy support)", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain("generate-packet-pdf");
      expect(ctrl).toContain("packetPdfService.generate");
    });

    it("API controller has registration-packets endpoint (lifecycle)", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain("registration-packets");
      expect(ctrl).toContain("packetSourceService.createPacketSource");
    });
  });

  describe("PDF Lifecycle Foundation", () => {
    it("EnterpriseDocumentPacketSource model exists in schema", () => {
      expect(schema).toContain("model EnterpriseDocumentPacketSource {");
    });

    it("PacketSource has required fields", () => {
      expect(schema).toContain("packetType");
      expect(schema).toContain("packetVersion");
      expect(schema).toContain("sourceJson");
      expect(schema).toContain("sourceHashSha256");
      expect(schema).toContain("renderedHashSha256");
      expect(schema).toContain("finalizedAt");
    });

    it("PacketSource relates to EnterpriseDocument", () => {
      expect(schema).toContain("packetSource EnterpriseDocumentPacketSource?");
    });

    it("migration file exists for PacketSource", () => {
      expect(
        existsSync(
          join(
            repoRoot,
            "apps/api/prisma/migrations/20260927100000_enterprise_document_packet_source/migration.sql",
          ),
        ),
      ).toBe(true);
    });

    it("PacketSourceService exists with lifecycle methods", () => {
      const svc = readApi("src/documents/packet-source.service.ts");
      expect(svc).toContain("class PacketSourceService");
      expect(svc).toContain("createPacketSource");
      expect(svc).toContain("getPacketSource");
      expect(svc).toContain("renderPdfFromSource");
      expect(svc).toContain("reRenderPdf");
      expect(svc).toContain("finalizePacket");
    });

    it("PacketSourceService computes source hash (SHA-256)", () => {
      const svc = readApi("src/documents/packet-source.service.ts");
      expect(svc).toContain("hashSource");
      expect(svc).toContain('createHash("sha256")');
      expect(svc).toContain("sourceHashSha256");
    });

    it("PacketSourceService computes rendered PDF hash", () => {
      const svc = readApi("src/documents/packet-source.service.ts");
      expect(svc).toContain("hashPdfBytes");
      expect(svc).toContain("renderedHashSha256");
    });

    it("PacketSourceService prevents mutation after finalization", () => {
      const svc = readApi("src/documents/packet-source.service.ts");
      expect(svc).toContain("Cannot re-render a finalized packet");
      expect(svc).toContain("Packet already finalized");
    });

    it("PacketPdfService embeds PDF metadata (info block)", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("info:");
      expect(pdfSvc).toContain("Title:");
      expect(pdfSvc).toContain("Author:");
      expect(pdfSvc).toContain("Creator:");
      expect(pdfSvc).toContain("Keywords:");
    });

    it("PacketPdfService accepts metadata fields (version, locale, mrn, sourceHash)", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("packetVersion?:");
      expect(pdfSvc).toContain("locale?:");
      expect(pdfSvc).toContain("patientMrn?:");
      expect(pdfSvc).toContain("sourceHash?:");
    });

    it("API has packet-source, render-pdf, finalize-packet endpoints", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain("packet-source");
      expect(ctrl).toContain("render-pdf");
      expect(ctrl).toContain("finalize-packet");
    });

    it("Document Center shows packetSource lifecycle metadata", () => {
      expect(docCenterComponent).toContain("packetSource");
      expect(docCenterComponent).toContain("packetVersion");
      expect(docCenterComponent).toContain("hashVerified");
      expect(docCenterComponent).toContain("packetLocked");
    });

    it("Wizard submits structuredModel (not raw PDF payload)", () => {
      expect(wizardComponent).toContain("structuredModel");
      expect(wizardComponent).toContain("registration-packets");
      expect(wizardComponent).not.toContain("generate-packet-pdf");
    });

    it("i18n has hashVerified and packetLocked keys", () => {
      expect(enMessages).toContain("hashVerified");
      expect(enMessages).toContain("packetLocked");
      expect(frMessages).toContain("hashVerified");
      expect(frMessages).toContain("packetLocked");
    });

    it("API PacketSourceService uses facility-based file name helper", () => {
      const svc = readApi("src/documents/packet-source.service.ts");
      expect(svc).toContain("registrationPacketFileName");
      expect(svc).toContain("normalizeStructuredPacketModel");
      expect(svc).toContain("BadRequestException");
      expect(svc).not.toContain("generatedAt.slice");
    });

    it("API PacketPdfService centers facility name above Registration Package", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("packetTitle");
      expect(pdfSvc).toContain("packetSubtypeLabel");
      expect(pdfSvc).toContain('align: "center"');
      expect(pdfSvc).toContain("REGISTRATION_PACKAGE_TITLE");
    });

    it("API validates registration-packets body with Zod", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain("createRegistrationPacketBodySchema");
      expect(ctrl).toContain("assertZodBody");
    });
  });
});
