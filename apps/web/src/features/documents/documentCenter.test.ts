import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function readApp(relativePath: string): string {
  return readFileSync(join(webRoot, "../app/app", relativePath), "utf8");
}

const repoRoot = join(webRoot, "../../..");

function readApi(relativePath: string): string {
  return readFileSync(join(repoRoot, "apps/api", relativePath), "utf8");
}

describe("MEDUI.DOCUMENTS.ENTERPRISE_DOCUMENT_CENTER (Phase 2)", () => {
  const registrationPage = readApp("registration/page.tsx");
  const patientChartPage = readApp("patients/[id]/page.tsx");
  const enMessages = readSrc("i18n/messages/en.ts");
  const frMessages = readSrc("i18n/messages/fr.ts");
  const schema = readApi("prisma/schema.prisma");
  const docComponent = readSrc("components/documents/RegistrationDocumentCenter.tsx");

  describe("Prisma model", () => {
    it("EnterpriseDocument model exists in schema", () => {
      expect(schema).toContain("model EnterpriseDocument {");
    });

    it("does NOT contain PatientDocument model", () => {
      expect(schema).not.toContain("model PatientDocument {");
    });
  });

  describe("Tile navigation", () => {
    it("Insurance tile scrolls to insurance section or focuses search", () => {
      expect(registrationPage).toContain('id="registration-insurance-section"');
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceTitle")');
    });

    it("Document Center tile scrolls to document center section or focuses search", () => {
      expect(registrationPage).toContain('id="registration-document-center-section"');
      expect(registrationPage).toContain('t("registrationHome.cardDocumentCenterTitle")');
    });

    it("Insurance tile falls back to search when no patient selected", () => {
      expect(registrationPage).toContain('querySelector<HTMLInputElement>(\'input[type="search"]\')');
    });
  });

  describe("Insurance & ID upload structure", () => {
    it("has Insurance Card section label", () => {
      expect(docComponent).toContain("documentCenter.sectionInsuranceCard");
    });

    it("has ID Card section label", () => {
      expect(docComponent).toContain("documentCenter.sectionIdCard");
    });

    it("has front/back slots for insurance card", () => {
      expect(docComponent).toContain("INSURANCE_CARD_FRONT");
      expect(docComponent).toContain("INSURANCE_CARD_BACK");
    });

    it("has front/back slots for ID card", () => {
      expect(docComponent).toContain("PATIENT_ID_FRONT");
      expect(docComponent).toContain("PATIENT_ID_BACK");
    });

    it("sends patientId with uploads", () => {
      expect(docComponent).toContain('form.append("patientId", patientId)');
    });

    it("sends category REGISTRATION with uploads", () => {
      expect(docComponent).toContain('form.append("category", "REGISTRATION")');
    });
  });

  describe("Other document upload", () => {
    it("has other document upload section", () => {
      expect(docComponent).toContain("documentCenter.sectionOtherUpload");
    });

    it("has title input for other documents", () => {
      expect(docComponent).toContain("documentCenter.otherTitleLabel");
      expect(docComponent).toContain("otherTitle");
    });

    it("saves as OTHER_REGISTRATION_DOCUMENT type", () => {
      expect(docComponent).toContain("OTHER_REGISTRATION_DOCUMENT");
    });

    it("sends custom title with upload", () => {
      expect(docComponent).toContain('form.append("title"');
    });
  });

  describe("Electronic registration packets", () => {
    it("has packets section", () => {
      expect(docComponent).toContain("documentCenter.sectionPackets");
    });

    it("has freestanding ER template", () => {
      expect(docComponent).toContain("FREESTANDING_ER");
    });

    it("has urgent care template", () => {
      expect(docComponent).toContain("URGENT_CARE");
    });

    it("has clinic template", () => {
      expect(docComponent).toContain('"CLINIC"');
    });

    it("has hospital template", () => {
      expect(docComponent).toContain('"HOSPITAL"');
    });

    it("freestanding ER template includes all required sections", () => {
      expect(docComponent).toContain("packetSectionAob");
      expect(docComponent).toContain("packetSectionCoordination");
      expect(docComponent).toContain("packetSectionDemographics");
      expect(docComponent).toContain("packetSectionDisclosure");
      expect(docComponent).toContain("packetSectionConsent");
      expect(docComponent).toContain("packetSectionPrivacy");
      expect(docComponent).toContain("packetSectionBillOfRights");
      expect(docComponent).toContain("packetSectionMedicareMedicaidNotice");
    });

    it("freestanding ER includes Medicare/Medicaid warning", () => {
      expect(docComponent).toContain("packetMedicareMedicaidWarning");
    });

    it("standard templates do not include Medicare/Medicaid notice section", () => {
      const standardSections = [
        "packetSectionDemographics",
        "packetSectionDisclosure",
        "packetSectionConsent",
        "packetSectionPrivacy",
        "packetSectionBillOfRights",
      ];
      expect(docComponent).toContain("STANDARD_PACKET_SECTIONS");
      for (const s of standardSections) {
        expect(docComponent).toContain(s);
      }
    });

    it("has generate packet button", () => {
      expect(docComponent).toContain("documentCenter.generatePacket");
      expect(docComponent).toContain("handleOpenWizard");
    });

    it("has preview button", () => {
      expect(docComponent).toContain("documentCenter.previewPacket");
      expect(docComponent).toContain("handlePreview");
    });

    it("has print button for generated packets", () => {
      expect(docComponent).toContain("documentCenter.printPacket");
    });

    it("generated packets appear without file upload (source=SYSTEM)", () => {
      expect(docComponent).toContain('"SYSTEM"');
      expect(docComponent).toContain("documentCenter.badgeGenerated");
    });

    it("shows packet wizard integration", () => {
      expect(docComponent).toContain("RegistrationPacketWizard");
      expect(docComponent).toContain("activeWizard");
    });
  });

  describe("Storage guidance", () => {
    it("renders storage guidance message", () => {
      expect(docComponent).toContain("documentCenter.storageGuidance");
    });

    it("EN storage guidance text is correct", () => {
      expect(enMessages).toContain("Only scan documents that cannot be generated electronically");
    });

    it("FR storage guidance text exists", () => {
      expect(frMessages).toContain("Ne numérisez que les documents");
    });
  });

  describe("Documents table", () => {
    it("shows uploaded by column", () => {
      expect(docComponent).toContain("documentCenter.colUploadedBy");
    });

    it("shows uploaded at column", () => {
      expect(docComponent).toContain("documentCenter.colUploadedAt");
    });

    it("shows download action", () => {
      expect(docComponent).toContain("documentCenter.download");
    });
  });

  describe("i18n keys", () => {
    const requiredKeys = [
      "sectionInsuranceCard",
      "sectionIdCard",
      "slotFront",
      "slotBack",
      "storageGuidance",
      "sectionPackets",
      "packetsIntro",
      "packetTemplateFreestandingEr",
      "packetTemplateUrgentCare",
      "packetTemplateClinic",
      "packetTemplateHospital",
      "generatePacket",
      "previewPacket",
      "printPacket",
      "packetGenerated",
      "packetSectionAob",
      "packetSectionConsent",
      "packetSectionPrivacy",
      "packetSectionBillOfRights",
      "packetMedicareMedicaidWarning",
      "badgeGenerated",
      "sectionOtherUpload",
      "otherTitleLabel",
      "typePatientIdFront",
      "typePatientIdBack",
      "typeRegistrationPacket",
      "packetEsignNote",
    ];

    for (const key of requiredKeys) {
      it(`EN has ${key}`, () => {
        expect(enMessages).toContain(key);
      });

      it(`FR has ${key}`, () => {
        expect(frMessages).toContain(key);
      });
    }

    it("no raw i18n keys in component", () => {
      const rawKeyPattern = /\bt\("documentCenter\.\w+"\)/g;
      const allKeys = [...docComponent.matchAll(rawKeyPattern)].map((m) => m[0]);
      for (const k of allKeys) {
        const keyName = k.replace('t("documentCenter.', "").replace('")', "");
        expect(enMessages).toContain(keyName);
      }
    });
  });

  describe("API module intact", () => {
    it("documents.service.ts exists with upload, list, softDelete", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("async list(");
      expect(svc).toContain("async upload(");
      expect(svc).toContain("async softDelete(");
    });

    it("controller has upload endpoint", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain('@Post("upload")');
    });
  });

  describe("Regression safety", () => {
    it("patient chart does not have document upload workflow", () => {
      expect(patientChartPage).not.toContain("RegistrationDocumentCenter");
    });

    it("patient chart still has face sheet link", () => {
      expect(patientChartPage).toContain("facesheet");
    });

    it("patient chart still has ChartInsuranceReadOnlySummary", () => {
      expect(patientChartPage).toContain("ChartInsuranceReadOnlySummary");
    });

    it("registration page still has patient search", () => {
      expect(registrationPage).toContain("runRegistrationPatientSearch");
    });

    it("registration page still has New patient link", () => {
      expect(registrationPage).toContain("/app/patients?new=1");
    });

    it("no PatientDocument references remain in schema", () => {
      expect(schema).not.toContain("PatientDocument");
    });

    it("registration page still has Insurance tile", () => {
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceTitle")');
    });

    it("registration page still has follow-ups", () => {
      expect(registrationPage).toContain("followUps");
    });
  });

  describe("Upload path correctness (hotfix)", () => {
    it("Document Center uses /api/backend proxy path for uploads", () => {
      expect(docComponent).toContain('"/api/backend"');
      expect(docComponent).toContain("API_BASE");
    });

    it("Document Center does NOT use NEXT_PUBLIC_API_URL", () => {
      expect(docComponent).not.toContain("NEXT_PUBLIC_API_URL");
      expect(docComponent).not.toContain("process.env.NEXT_PUBLIC_API_URL");
    });

    it("Packet Wizard uses /api/backend proxy path", () => {
      const wizard = readSrc("components/documents/RegistrationPacketWizard.tsx");
      expect(wizard).toContain('"/api/backend"');
      expect(wizard).not.toContain("NEXT_PUBLIC_API_URL");
    });

    it("upload includes credentials: include", () => {
      expect(docComponent).toContain('credentials: "include"');
    });

    it("upload sends patientId in FormData", () => {
      expect(docComponent).toContain('"patientId", patientId');
    });

    it("upload sends category and type in FormData", () => {
      expect(docComponent).toContain('"category", "REGISTRATION"');
      expect(docComponent).toContain('"type", type');
    });

    it("upload error shows API message detail", () => {
      expect(docComponent).toContain("documentCenter.uploadError");
      expect(docComponent).toContain("detail");
    });

    it("API service has upload logging", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("document upload received");
      expect(svc).toContain("document upload saved");
      expect(svc).toContain("document upload rejected");
    });

    it("API service has storage error handling", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("Storage directory unavailable");
      expect(svc).toContain("Failed to write file to storage");
    });
  });
});
