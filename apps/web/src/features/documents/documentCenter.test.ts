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

    it("preview shows generic expandable-disclosures copy instead of a hard-coded section list", () => {
      expect(docComponent).toContain("documentCenter.packetIncludesDisclosures");
      expect(docComponent).not.toContain("FREESTANDING_ER_SECTIONS");
      expect(docComponent).not.toContain("STANDARD_PACKET_SECTIONS");
    });

    it("freestanding ER includes Medicare/Medicaid warning", () => {
      expect(docComponent).toContain("packetMedicareMedicaidWarning");
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
      expect(docComponent).toContain("getFileTypeBadge");
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

    it("API storage has error handling in local provider", () => {
      const localProvider = readApi("src/documents/storage/local-document-storage.provider.ts");
      expect(localProvider).toContain("fs.mkdirSync");
      expect(localProvider).toContain("fs.writeFileSync");
    });
  });

  describe("Durable storage (DB blob fallback)", () => {
    const svc = readApi("src/documents/documents.service.ts");
    const ctrl = readApi("src/documents/documents.controller.ts");

    it("EnterpriseDocumentBlob model exists in schema", () => {
      expect(schema).toContain("model EnterpriseDocumentBlob {");
    });

    it("EnterpriseDocumentBlob has documentId unique constraint", () => {
      expect(schema).toContain("documentId String   @unique");
    });

    it("EnterpriseDocumentBlob has data Bytes field", () => {
      expect(schema).toContain("data       Bytes");
    });

    it("EnterpriseDocument has blob relation", () => {
      expect(schema).toContain("blob       EnterpriseDocumentBlob?");
    });

    it("service uses DocumentStorageService for upload", () => {
      expect(svc).toContain("storageService.save");
      expect(svc).toContain("DocumentStorageService");
    });

    it("service uses DocumentStorageService for download", () => {
      expect(svc).toContain("storageService.read");
    });

    it("download returns user-friendly error when file unavailable from both sources", () => {
      expect(svc).toContain("Document file is unavailable. Please re-upload or contact administrator.");
    });

    it("download controller handles buffer response", () => {
      expect(ctrl).toContain("result.buffer");
      expect(ctrl).toContain("res.end(result.buffer)");
    });

    it("download controller handles disk file response", () => {
      expect(ctrl).toContain("result.storagePath");
      expect(ctrl).toContain("res.sendFile(result.storagePath)");
    });

    it("upload stores checksumSha256", () => {
      expect(svc).toContain("checksumSha256");
      expect(svc).toContain('createHash("sha256")');
    });

    it("migration file exists for blob table", () => {
      const migrationExists = existsSync(
        join(repoRoot, "apps/api/prisma/migrations/20260926110000_enterprise_document_blob_storage/migration.sql")
      );
      expect(migrationExists).toBe(true);
    });
  });

  describe("Storage provider abstraction", () => {
    const storageInterface = readApi("src/documents/storage/document-storage.provider.ts");
    const localProvider = readApi("src/documents/storage/local-document-storage.provider.ts");
    const blobProvider = readApi("src/documents/storage/blob-document-storage.provider.ts");
    const storageService = readApi("src/documents/storage/document-storage.service.ts");
    const indexFile = readApi("src/documents/storage/index.ts");

    it("storage interface exports DocumentStorageProvider", () => {
      expect(storageInterface).toContain("export interface DocumentStorageProvider");
    });

    it("interface defines save method", () => {
      expect(storageInterface).toContain("save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult>");
    });

    it("interface defines read method", () => {
      expect(storageInterface).toContain("read(storagePath: string, documentId: string): Promise<DocumentStorageReadResult | null>");
    });

    it("interface defines exists method", () => {
      expect(storageInterface).toContain("exists(storagePath: string, documentId: string): Promise<boolean>");
    });

    it("interface defines delete method", () => {
      expect(storageInterface).toContain("delete(storagePath: string, documentId: string): Promise<void>");
    });

    it("interface exports StorageProviderType union", () => {
      expect(storageInterface).toContain('"local" | "blob" | "s3" | "r2" | "azure"');
    });

    it("LocalDocumentStorageProvider implements save with fs", () => {
      expect(localProvider).toContain("fs.writeFileSync");
      expect(localProvider).toContain("fs.mkdirSync");
    });

    it("LocalDocumentStorageProvider verifies write", () => {
      expect(localProvider).toContain("verified");
      expect(localProvider).toContain("fs.existsSync(storagePath)");
    });

    it("LocalDocumentStorageProvider uses MEDORA_DOCUMENT_STORAGE_DIR", () => {
      expect(localProvider).toContain("MEDORA_DOCUMENT_STORAGE_DIR");
    });

    it("BlobDocumentStorageProvider uses enterpriseDocumentBlob", () => {
      expect(blobProvider).toContain("enterpriseDocumentBlob.upsert");
      expect(blobProvider).toContain("enterpriseDocumentBlob.findUnique");
    });

    it("BlobDocumentStorageProvider enforces size limit", () => {
      expect(blobProvider).toContain("DB_BLOB_MAX_SIZE");
    });

    it("DocumentStorageService has primary and backup providers", () => {
      expect(storageService).toContain("private readonly primary: DocumentStorageProvider");
      expect(storageService).toContain("private readonly backup: DocumentStorageProvider | null");
    });

    it("DocumentStorageService reads MEDORA_DOCUMENT_STORAGE_PROVIDER env", () => {
      expect(storageService).toContain("MEDORA_DOCUMENT_STORAGE_PROVIDER");
    });

    it("DocumentStorageService falls back to backup on primary read failure", () => {
      expect(storageService).toContain("backup.read");
      expect(storageService).toContain("served from backup");
    });

    it("DocumentStorageService saves to backup when configured", () => {
      expect(storageService).toContain("backup.save");
    });

    it("DocumentStorageService has getAvailability for storage health", () => {
      expect(storageService).toContain("async getAvailability");
      expect(storageService).toContain("sources");
    });

    it("DocumentStorageService logs provider configuration on startup", () => {
      expect(storageService).toContain("Storage initialized: primary=");
    });

    it("DocumentStorageService warns for unimplemented cloud providers", () => {
      expect(storageService).toContain("not yet implemented");
    });

    it("index.ts re-exports all storage components", () => {
      expect(indexFile).toContain("DocumentStorageProvider");
      expect(indexFile).toContain("LocalDocumentStorageProvider");
      expect(indexFile).toContain("BlobDocumentStorageProvider");
      expect(indexFile).toContain("DocumentStorageService");
    });

    it("documents.module.ts registers storage providers", () => {
      const mod = readApi("src/documents/documents.module.ts");
      expect(mod).toContain("LocalDocumentStorageProvider");
      expect(mod).toContain("BlobDocumentStorageProvider");
      expect(mod).toContain("DocumentStorageService");
    });

    it("controller has storage-health endpoint", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain("storage-health");
      expect(ctrl).toContain("getStorageHealth");
    });
  });

  describe("Download error UX (no black JSON page)", () => {
    it("download uses programmatic fetch instead of direct <a href>", () => {
      expect(docComponent).toContain("handleDownload");
      expect(docComponent).toContain("URL.createObjectURL");
    });

    it("download does NOT use <a href> to download endpoint", () => {
      expect(docComponent).not.toContain('href={`${API_BASE}/documents/${');
    });

    it("download shows user-friendly error banner", () => {
      expect(docComponent).toContain("downloadError");
      expect(docComponent).toContain("documentCenter.downloadUnavailable");
    });

    it("download error can be dismissed", () => {
      expect(docComponent).toContain("setDownloadError(null)");
    });

    it("EN has downloadUnavailable i18n key", () => {
      expect(enMessages).toContain("downloadUnavailable");
    });

    it("FR has downloadUnavailable i18n key", () => {
      expect(frMessages).toContain("downloadUnavailable");
    });
  });

  describe("Storage health UI", () => {
    it("tracks missing documents for display", () => {
      expect(docComponent).toContain("missingDocs");
      expect(docComponent).toContain("setMissingDocs");
    });

    it("marks document as missing on 404 download", () => {
      expect(docComponent).toContain("resp.status === 404");
      expect(docComponent).toContain("missingDocs");
    });

    it("has getStorageLabel helper", () => {
      expect(docComponent).toContain("getStorageLabel");
    });

    it("displays storageMissing label for missing docs", () => {
      expect(docComponent).toContain("documentCenter.storageMissing");
    });

    it("EN has storageMissing i18n key", () => {
      expect(enMessages).toContain("storageMissing");
    });

    it("FR has storageMissing i18n key", () => {
      expect(frMessages).toContain("storageMissing");
    });

    it("clears missing status on successful download", () => {
      expect(docComponent).toContain("next.delete(docId)");
    });
  });

  describe("File format and download correctness", () => {
    const ctrl = readApi("src/documents/documents.controller.ts");
    const svc = readApi("src/documents/documents.service.ts");
    const proxy = readSrc("lib/server/nestApiProxy.ts");

    it("download controller sets Content-Type from mimeType", () => {
      expect(ctrl).toContain("result.mimeType");
      expect(ctrl).toContain('res.setHeader("Content-Type"');
    });

    it("download controller sets Content-Disposition with filename", () => {
      expect(ctrl).toContain("Content-Disposition");
      expect(ctrl).toContain("encodeURIComponent(result.fileName)");
    });

    it("download controller sets Content-Length for buffer response", () => {
      expect(ctrl).toContain("Content-Length");
      expect(ctrl).toContain("result.buffer.length");
    });

    it("BFF proxy streams binary responses (images, PDF) without text conversion", () => {
      expect(proxy).toContain("isBinaryResponse");
      expect(proxy).toContain("image/");
      expect(proxy).toContain("application/pdf");
      expect(proxy).toContain("content-disposition");
    });

    it("BFF proxy forwards Content-Disposition for binary responses", () => {
      expect(proxy).toContain('r.headers.get("content-disposition")');
    });

    it("BFF proxy forwards Content-Length for binary responses", () => {
      expect(proxy).toContain('r.headers.get("content-length")');
    });

    it("frontend parses Content-Disposition filename", () => {
      expect(docComponent).toContain("content-disposition");
      expect(docComponent).toContain("decodeURIComponent");
    });

    it("frontend uses response.blob() for downloads", () => {
      expect(docComponent).toContain("resp.blob()");
    });

    it("ALLOWED_MIME_PREFIXES includes image/ for JPEG/PNG", () => {
      expect(svc).toContain('"image/"');
    });

    it("service preserves original fileName on upload", () => {
      expect(svc).toContain("fileName: file.originalname");
    });

    it("service stores checksumSha256 for integrity", () => {
      expect(svc).toContain("checksumSha256");
    });
  });

  describe("File type badges", () => {
    it("has getFileTypeBadge helper", () => {
      expect(docComponent).toContain("getFileTypeBadge");
    });

    it("shows PDF badge for application/pdf", () => {
      expect(docComponent).toContain('"application/pdf"');
      expect(docComponent).toContain('"PDF"');
    });

    it("shows JPG badge for image/jpeg", () => {
      expect(docComponent).toContain('"image/jpeg"');
      expect(docComponent).toContain('"JPG"');
    });

    it("shows PNG badge for image/png", () => {
      expect(docComponent).toContain('"image/png"');
      expect(docComponent).toContain('"PNG"');
    });

    it("shows e-Doc PDF badge for system-generated PDFs", () => {
      expect(docComponent).toContain("e-Doc PDF");
      expect(docComponent).toContain('doc.source === "SYSTEM"');
    });
  });

  describe("Packet PDF output", () => {
    const packetCtrl = readApi("src/documents/documents.controller.ts");

    it("API has PacketPdfService", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("class PacketPdfService");
      expect(pdfSvc).toContain("PDFDocument");
    });

    it("PacketPdfService generates Buffer from structured input", () => {
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfSvc).toContain("async generate");
      expect(pdfSvc).toContain("Promise<Buffer>");
      expect(pdfSvc).toContain("Buffer.concat(chunks)");
    });

    it("PacketPdfService includes patient info", () => {
      const pdfChrome = readApi("src/documents/packet-pdf-chrome.ts");
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfChrome).toContain("Patient Information");
      expect(pdfSvc).toContain("chrome.patientInformation");
      expect(pdfSvc).toContain("input.patient");
    });

    it("PacketPdfService includes insurance info", () => {
      const pdfChrome = readApi("src/documents/packet-pdf-chrome.ts");
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfChrome).toContain("Insurance Information");
      expect(pdfSvc).toContain("chrome.insuranceInformation");
    });

    it("PacketPdfService includes signatures", () => {
      const pdfChrome = readApi("src/documents/packet-pdf-chrome.ts");
      const pdfSvc = readApi("src/documents/packet-pdf.service.ts");
      expect(pdfChrome).toContain('signatures: "Signatures"');
      expect(pdfSvc).toContain("chrome.signatures");
      expect(pdfSvc).toContain("input.signatures");
    });

    it("controller generate-packet-pdf sets mimetype to application/pdf", () => {
      expect(packetCtrl).toContain("generate-packet-pdf");
      expect(packetCtrl).toContain('"application/pdf"');
    });

    it("controller generate-packet-pdf creates .pdf filename", () => {
      expect(packetCtrl).toContain(".pdf");
      expect(packetCtrl).toContain("_Registration_Package_");
    });

    it("packet wizard uses registration-packets endpoint (PDF lifecycle)", () => {
      const wizard = readSrc("components/documents/RegistrationPacketWizard.tsx");
      expect(wizard).toContain("registration-packets");
      expect(wizard).not.toContain("buildPacketHtml");
      expect(wizard).not.toContain("_signed_packet.html");
    });

    it("module registers PacketPdfService", () => {
      const mod = readApi("src/documents/documents.module.ts");
      expect(mod).toContain("PacketPdfService");
    });
  });
});
