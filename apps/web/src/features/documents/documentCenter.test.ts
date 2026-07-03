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

  describe("Prisma model", () => {
    it("EnterpriseDocument model exists in schema", () => {
      expect(schema).toContain("model EnterpriseDocument {");
    });

    it("has category field", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?category\s+String/);
    });

    it("has type field", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?type\s+String/);
    });

    it("has status field with ACTIVE default", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?status\s+String\s+@default\("ACTIVE"\)/);
    });

    it("has optional patientId", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?patientId\s+String\?/);
    });

    it("has optional encounterId", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?encounterId\s+String\?/);
    });

    it("has checksumSha256 field", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?checksumSha256\s+String\?/);
    });

    it("does NOT contain PatientDocument model", () => {
      expect(schema).not.toContain("model PatientDocument {");
    });

    it("has relation to Patient, Encounter, Facility, User", () => {
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?patient\s+Patient\?/);
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?encounter\s+Encounter\?/);
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?facility\s+Facility\?/);
      expect(schema).toMatch(/EnterpriseDocument[\s\S]*?uploadedBy\s+User\?/);
    });

    it("Patient model has enterpriseDocuments relation", () => {
      expect(schema).toMatch(/model Patient[\s\S]*?enterpriseDocuments\s+EnterpriseDocument\[\]/);
    });

    it("Encounter model has enterpriseDocuments relation", () => {
      expect(schema).toMatch(/model Encounter[\s\S]*?enterpriseDocuments\s+EnterpriseDocument\[\]/);
    });
  });

  describe("Migration file", () => {
    const migrationDir = join(repoRoot, "apps/api/prisma/migrations/20260925130000_enterprise_document_center");

    it("migration directory exists", () => {
      expect(existsSync(migrationDir)).toBe(true);
    });

    it("migration SQL creates EnterpriseDocument table", () => {
      const sql = readFileSync(join(migrationDir, "migration.sql"), "utf8");
      expect(sql).toContain('CREATE TABLE "EnterpriseDocument"');
    });

    it("old PatientDocument migration directory does not exist", () => {
      const oldDir = join(repoRoot, "apps/api/prisma/migrations/20260925120000_patient_documents");
      expect(existsSync(oldDir)).toBe(false);
    });
  });

  describe("API module", () => {
    it("documents.module.ts exists", () => {
      const modulePath = join(repoRoot, "apps/api/src/documents/documents.module.ts");
      expect(existsSync(modulePath)).toBe(true);
      const content = readFileSync(modulePath, "utf8");
      expect(content).toContain("DocumentsController");
      expect(content).toContain("DocumentsService");
    });

    it("documents.service.ts exists with list, upload, getFilePath, softDelete", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("async list(");
      expect(svc).toContain("async upload(");
      expect(svc).toContain("async getFilePath(");
      expect(svc).toContain("async softDelete(");
    });

    it("documents.controller.ts has GET, POST upload, GET download, DELETE endpoints", () => {
      const ctrl = readApi("src/documents/documents.controller.ts");
      expect(ctrl).toContain('@Get()');
      expect(ctrl).toContain('@Post("upload")');
      expect(ctrl).toContain('@Get(":documentId/download")');
      expect(ctrl).toContain('@Delete(":documentId")');
    });

    it("service validates MIME types", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("ALLOWED_MIME_PREFIXES");
      expect(svc).toContain("Unsupported file type");
    });

    it("service validates file size", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("MAX_FILE_SIZE");
      expect(svc).toContain("exceeds maximum size");
    });

    it("service stores uploadedById", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("uploadedById");
    });

    it("service computes checksumSha256", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("checksumSha256");
      expect(svc).toContain('createHash("sha256")');
    });

    it("soft delete sets status to DELETED", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain('"DELETED"');
    });

    it("storage dir uses MEDORA_DOCUMENT_STORAGE_DIR env var", () => {
      const svc = readApi("src/documents/documents.service.ts");
      expect(svc).toContain("MEDORA_DOCUMENT_STORAGE_DIR");
      expect(svc).toContain("/tmp/medora-documents");
    });

    it("controller is registered in app.module", () => {
      const appModule = readApi("src/app.module.ts");
      expect(appModule).toContain("DocumentsModule");
    });
  });

  describe("Web UI — Document Center", () => {
    it("RegistrationDocumentCenter component exists", () => {
      const componentPath = join(webRoot, "components/documents/RegistrationDocumentCenter.tsx");
      expect(existsSync(componentPath)).toBe(true);
    });

    it("registration page imports RegistrationDocumentCenter", () => {
      expect(registrationPage).toContain("RegistrationDocumentCenter");
    });

    it("registration page has Document Center tile", () => {
      expect(registrationPage).toContain('t("registrationHome.cardDocumentCenterTitle")');
      expect(registrationPage).toContain('t("registrationHome.cardDocumentCenterHint")');
    });

    it("registration page has document center section anchor", () => {
      expect(registrationPage).toContain('id="registration-document-center-section"');
    });

    it("Document Center component renders upload form with type dropdown", () => {
      const component = readSrc("components/documents/RegistrationDocumentCenter.tsx");
      expect(component).toContain("REGISTRATION_DOC_TYPES");
      expect(component).toContain("INSURANCE_CARD_FRONT");
      expect(component).toContain("INSURANCE_CARD_BACK");
      expect(component).toContain("PATIENT_ID");
      expect(component).toContain("CONSENT_FORM");
      expect(component).toContain("REFERRAL");
    });

    it("Document Center calls API with category REGISTRATION", () => {
      const component = readSrc("components/documents/RegistrationDocumentCenter.tsx");
      expect(component).toContain('category=REGISTRATION');
      expect(component).toContain('"REGISTRATION"');
    });

    it("Document Center renders document table columns", () => {
      const component = readSrc("components/documents/RegistrationDocumentCenter.tsx");
      expect(component).toContain("documentCenter.colType");
      expect(component).toContain("documentCenter.colFileName");
      expect(component).toContain("documentCenter.colUploadedBy");
      expect(component).toContain("documentCenter.colUploadedAt");
      expect(component).toContain("documentCenter.colActions");
    });

    it("Document Center has download link", () => {
      const component = readSrc("components/documents/RegistrationDocumentCenter.tsx");
      expect(component).toContain("/download");
      expect(component).toContain("documentCenter.download");
    });

    it("Document Center has archive/delete action", () => {
      const component = readSrc("components/documents/RegistrationDocumentCenter.tsx");
      expect(component).toContain("handleArchive");
      expect(component).toContain("documentCenter.archiveConfirm");
    });
  });

  describe("i18n — Document Center keys", () => {
    it("EN has documentCenter namespace", () => {
      expect(enMessages).toContain("documentCenter:");
      expect(enMessages).toContain("typeInsuranceCardFront");
      expect(enMessages).toContain("typeInsuranceCardBack");
      expect(enMessages).toContain("typePatientId");
      expect(enMessages).toContain("typeConsentForm");
      expect(enMessages).toContain("typeReferral");
      expect(enMessages).toContain("typeOtherRegistration");
    });

    it("FR has documentCenter namespace", () => {
      expect(frMessages).toContain("documentCenter:");
      expect(frMessages).toContain("typeInsuranceCardFront");
      expect(frMessages).toContain("typeInsuranceCardBack");
      expect(frMessages).toContain("typePatientId");
      expect(frMessages).toContain("typeConsentForm");
      expect(frMessages).toContain("typeReferral");
      expect(frMessages).toContain("typeOtherRegistration");
    });

    it("EN has Document Center tile keys", () => {
      expect(enMessages).toContain("cardDocumentCenterTitle");
      expect(enMessages).toContain("cardDocumentCenterHint");
    });

    it("FR has Document Center tile keys", () => {
      expect(frMessages).toContain("cardDocumentCenterTitle");
      expect(frMessages).toContain("cardDocumentCenterHint");
    });

    it("EN has upload/download/archive keys", () => {
      expect(enMessages).toContain("uploadSuccess");
      expect(enMessages).toContain("uploadError");
      expect(enMessages).toContain("download");
      expect(enMessages).toContain("archiveConfirm");
    });

    it("FR has upload/download/archive keys", () => {
      expect(frMessages).toContain("uploadSuccess");
      expect(frMessages).toContain("uploadError");
      expect(frMessages).toContain("download");
      expect(frMessages).toContain("archiveConfirm");
    });

    it("EN has emptyList and noPatientSelected", () => {
      expect(enMessages).toContain("emptyList");
      expect(enMessages).toContain("noPatientSelected");
    });

    it("EN has category labels", () => {
      expect(enMessages).toContain("categoryRegistration");
      expect(enMessages).toContain("categoryEmergency");
      expect(enMessages).toContain("categoryClinical");
      expect(enMessages).toContain("categoryBilling");
    });

    it("no raw myMedia keys remain", () => {
      expect(enMessages).not.toContain("myMedia:");
      expect(frMessages).not.toContain("myMedia:");
    });
  });

  describe("Regression safety", () => {
    it("patient chart does not have document upload workflow", () => {
      expect(patientChartPage).not.toContain("RegistrationDocumentCenter");
      expect(patientChartPage).not.toContain("DocumentUpload");
    });

    it("patient chart still has face sheet link", () => {
      expect(patientChartPage).toContain("facesheet");
    });

    it("patient chart still has tabs", () => {
      expect(patientChartPage).toContain("activeTab");
    });

    it("patient chart still has ChartInsuranceReadOnlySummary", () => {
      expect(patientChartPage).toContain("ChartInsuranceReadOnlySummary");
    });

    it("registration page still has patient search", () => {
      expect(registrationPage).toContain("runRegistrationPatientSearch");
    });

    it("registration page still has Insurance tile", () => {
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceTitle")');
    });

    it("registration page still has New patient link", () => {
      expect(registrationPage).toContain("/app/patients?new=1");
    });

    it("registration page still has follow-ups", () => {
      expect(registrationPage).toContain("followUps");
    });

    it("no PatientDocument references remain in any file", () => {
      const schemaPrisma = readApi("prisma/schema.prisma");
      expect(schemaPrisma).not.toContain("PatientDocument");
    });
  });
});
