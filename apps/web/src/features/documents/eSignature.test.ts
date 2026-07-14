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

describe("MEDUI.DOCUMENTS.E_SIGNATURE_FOUNDATION_PHASE_1", () => {
  const schema = readApi("prisma/schema.prisma");
  const sigService = readApi("src/documents/document-signature.service.ts");
  const controller = readApi("src/documents/documents.controller.ts");
  const docsModule = readApi("src/documents/documents.module.ts");
  const sigPad = readSrc("components/documents/SignatureCapturePad.tsx");
  const sigModel = readSrc("components/documents/signatureVectorModel.ts");
  const sigRenderer = readSrc("components/documents/SignatureVectorRenderer.tsx");
  const adapters = readSrc("components/documents/externalSignatureAdapters.ts");
  const wizard = readSrc("components/documents/RegistrationPacketWizard.tsx");
  const docCenter = readSrc("components/documents/RegistrationDocumentCenter.tsx");
  const enMessages = readSrc("i18n/messages/en.ts");
  const frMessages = readSrc("i18n/messages/fr.ts");
  const patientChartPage = readApp("patients/[id]/page.tsx");

  describe("Schema: EnterpriseDocumentSignature model", () => {
    it("EnterpriseDocumentSignature model exists", () => {
      expect(schema).toContain("model EnterpriseDocumentSignature {");
    });

    it("has documentId field", () => {
      expect(schema).toContain("documentId     String");
    });

    it("has signerType field", () => {
      expect(schema).toContain("signerType     String");
    });

    it("has signerName field", () => {
      expect(schema).toContain("signerName     String");
    });

    it("has signatureData as Json", () => {
      expect(schema).toContain("signatureData  Json");
    });

    it("has attestation field", () => {
      expect(schema).toContain("attestation    String?");
    });

    it("has ipAddress field", () => {
      expect(schema).toContain("ipAddress      String?");
    });

    it("has userAgent field", () => {
      expect(schema).toContain("userAgent      String?");
    });

    it("has signedByUserId field", () => {
      expect(schema).toContain("signedByUserId String?");
    });

    it("has relation to EnterpriseDocument with CASCADE delete", () => {
      expect(schema).toContain('document     EnterpriseDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)');
    });

    it("has indexes on documentId, signerType, signedAt", () => {
      expect(schema).toContain("@@index([documentId])");
      expect(schema).toContain("@@index([signerType])");
      expect(schema).toContain("@@index([signedAt])");
    });
  });

  describe("Schema: EnterpriseDocument lock fields", () => {
    it("has signatureStatus field", () => {
      expect(schema).toContain("signatureStatus String?");
    });

    it("has lockedAt field", () => {
      expect(schema).toContain("lockedAt        DateTime?");
    });

    it("has lockedById field", () => {
      expect(schema).toContain("lockedById      String?");
    });

    it("has lockedBy User relation", () => {
      expect(schema).toContain('"EnterpriseDocumentLockedBy"');
    });

    it("has signatures relation array", () => {
      expect(schema).toContain("signatures EnterpriseDocumentSignature[]");
    });

    it("has signatureStatus index", () => {
      expect(schema).toContain("@@index([signatureStatus])");
    });
  });

  describe("API: DocumentSignatureService", () => {
    it("service file exists", () => {
      expect(existsSync(join(repoRoot, "apps/api/src/documents/document-signature.service.ts"))).toBe(true);
    });

    it("addSignature method exists", () => {
      expect(sigService).toContain("async addSignature");
    });

    it("listSignatures method exists", () => {
      expect(sigService).toContain("async listSignatures");
    });

    it("finalizeSignature method exists", () => {
      expect(sigService).toContain("async finalizeSignature");
    });

    it("validates signer type (PATIENT, REPRESENTATIVE, STAFF, WITNESS)", () => {
      expect(sigService).toContain('"PATIENT"');
      expect(sigService).toContain('"REPRESENTATIVE"');
      expect(sigService).toContain('"STAFF"');
      expect(sigService).toContain('"WITNESS"');
    });

    it("rejects empty signature strokes unless refusal", () => {
      expect(sigService).toContain("hasStrokes");
      expect(sigService).toContain("Signature data (strokes) is required unless refusal");
    });

    it("rejects finalization without patient signature", () => {
      expect(sigService).toContain("Patient or representative signature is required");
    });

    it("rejects finalization without staff signature", () => {
      expect(sigService).toContain("Staff or witness signature is required");
    });

    it("locks document on finalization", () => {
      expect(sigService).toContain("lockedAt: new Date()");
      expect(sigService).toContain("lockedById");
    });

    it("rejects signatures on locked documents", () => {
      expect(sigService).toContain("Document is locked and cannot be modified");
    });

    it("computes SHA-256 hash on finalization", () => {
      expect(sigService).toContain('crypto.createHash("sha256")');
    });

    it("stores refusal reason in signatureData", () => {
      expect(sigService).toContain("refusal: true");
    });

    it("computes signature status correctly", () => {
      expect(sigService).toContain("computeSignatureStatus");
      expect(sigService).toContain('"UNSIGNED"');
      expect(sigService).toContain('"IN_PROGRESS"');
      expect(sigService).toContain('"PATIENT_SIGNED"');
      expect(sigService).toContain('"STAFF_SIGNED"');
      expect(sigService).toContain('"COMPLETED"');
    });
  });

  describe("API: Controller endpoints", () => {
    it("has POST :documentId/signatures endpoint", () => {
      expect(controller).toContain('":documentId/signatures"');
      expect(controller).toContain("addSignature");
    });

    it("has GET :documentId/signatures endpoint", () => {
      expect(controller).toContain("listSignatures");
    });

    it("has POST :documentId/finalize-signature endpoint", () => {
      expect(controller).toContain('":documentId/finalize-signature"');
      expect(controller).toContain("finalizeSignature");
    });

    it("passes ipAddress and userAgent", () => {
      expect(controller).toContain("req.ip");
      expect(controller).toContain('req.headers["user-agent"]');
    });

    it("module provides DocumentSignatureService", () => {
      expect(docsModule).toContain("DocumentSignatureService");
    });
  });

  describe("Web: SignatureCapturePad", () => {
    it("component file exists", () => {
      expect(existsSync(join(webRoot, "components/documents/SignatureCapturePad.tsx"))).toBe(true);
    });

    it("uses canvas element", () => {
      expect(sigPad).toContain("<canvas");
    });

    it("captures canonical vector strokes", () => {
      expect(sigModel).toContain("SignatureStroke");
      expect(sigModel).toContain("SignaturePoint");
      expect(sigModel).toContain("normalizeSignatureValue");
    });

    it("has clear button", () => {
      expect(sigPad).toContain("esignature.clear");
    });

    it("supports pointer events for mouse, touch, pen, and signature pads", () => {
      expect(sigPad).toContain("onPointerDown");
      expect(sigPad).toContain("onPointerMove");
      expect(sigPad).toContain("onPointerUp");
      expect(sigPad).toContain("onPointerCancel");
      expect(sigPad).toContain("setPointerCapture");
      expect(sigPad).toContain("onLostPointerCapture");
      expect(sigPad).toContain("pointerType");
    });

    it("records optional pen pressure", () => {
      expect(sigPad).toContain("pressure");
    });

    it("has disabled/read-only state", () => {
      expect(sigPad).toContain("disabled");
      expect(sigPad).toContain("esignature.locked");
    });

    it("exports SignatureResult type", () => {
      expect(sigPad).toContain("export type SignatureResult");
    });

    it("has touchAction: none for iPad compatibility", () => {
      expect(sigPad).toContain('touchAction: "none"');
    });

    it("shows multi-input hint", () => {
      expect(sigPad).toContain("esignature.inputHint");
    });

    it("rejects palms while a pen is active", () => {
      expect(sigPad).toContain('activePointerType.current === "pen"');
    });

    it("provides a vector renderer and device adapters", () => {
      expect(sigRenderer).toContain("SignatureVectorRenderer");
      expect(adapters).toContain("BrowserPointerSignatureAdapter");
      expect(adapters).toContain("TopazSignatureAdapter");
      expect(adapters).toContain("WacomSignatureAdapter");
      expect(adapters).toContain("listAvailableHardwareSignatureAdapters");
    });

    it("shows hardware pad option only via feature-detected adapters", () => {
      expect(wizard).toContain("listAvailableHardwareSignatureAdapters");
      expect(wizard).toContain("hardwareAdapters");
    });

    it("shows return-device confirmation after finalize", () => {
      expect(wizard).toContain("esignature.returnDevice");
      expect(wizard).toContain("returnDevice");
    });
  });

  describe("Web: RegistrationPacketWizard signature upgrade", () => {
    it("imports SignatureCapturePad", () => {
      expect(wizard).toContain("SignatureCapturePad");
    });

    it("has patient signature pad", () => {
      expect(wizard).toContain("esignature.patientSignatureLabel");
      expect(wizard).toContain("patientSigData");
    });

    it("has staff signature pad", () => {
      expect(wizard).toContain("esignature.staffSignatureLabel");
      expect(wizard).toContain("staffSigData");
    });

    it("has patient attestation checkbox", () => {
      expect(wizard).toContain("patientAttestation");
      expect(wizard).toContain("esignature.patientAttestation");
    });

    it("has staff attestation checkbox", () => {
      expect(wizard).toContain("staffAttestation");
      expect(wizard).toContain("esignature.staffAttestation");
    });

    it("calls signature API endpoint", () => {
      expect(wizard).toContain("/documents/${documentId}/signatures");
    });

    it("calls finalize-packet API endpoint", () => {
      expect(wizard).toContain("/documents/${documentId}/finalize-packet");
    });

    it("requires attestation for patient signature", () => {
      expect(wizard).toContain("patientAttestation");
    });

    it("requires attestation for staff signature", () => {
      expect(wizard).toContain("staffAttestation");
    });

    it("refusal path still works", () => {
      expect(wizard).toContain("isRefused");
      expect(wizard).toContain("refusalReason");
    });
  });

  describe("Web: Document Center status badges", () => {
    it("shows signature status from signatureStatus field", () => {
      expect(docCenter).toContain("signatureStatus");
      expect(docCenter).toContain("esignature.statusSignedLocked");
      expect(docCenter).toContain("esignature.statusUnsigned");
    });

    it("shows Needs patient/staff signature", () => {
      expect(docCenter).toContain("esignature.statusNeedsStaff");
      expect(docCenter).toContain("esignature.statusNeedsPatient");
    });

    it("checks lockedAt for locked status", () => {
      expect(docCenter).toContain("doc.lockedAt");
    });

    it("can replay stored signature vectors", () => {
      expect(docCenter).toContain("SignatureVectorRenderer");
      expect(docCenter).toContain("showStoredSignatures");
      expect(docCenter).toContain("/signatures");
    });
  });

  describe("API: finalize embeds signature vectors before hash", () => {
    const packetSource = readApi("src/documents/packet-source.service.ts");
    const packetPdf = readApi("src/documents/packet-pdf.service.ts");
    const docsService = readApi("src/documents/documents.service.ts");

    it("finalizePacket re-renders PDF and replaces stored file", () => {
      expect(packetSource).toContain("replaceFileContent");
      expect(packetSource).toContain("mergeStoredSignaturesIntoModel");
      expect(packetSource).toContain("renderedHashSha256");
      expect(docsService).toContain("async replaceFileContent");
    });

    it("PDF draws patient and staff signature strokes", () => {
      expect(packetPdf).toContain("function drawSignature");
      expect(packetPdf).toContain("patientStrokes");
      expect(packetPdf).toContain("staffStrokes");
    });
  });

  describe("i18n: esignature keys", () => {
    const requiredKeys = [
      "signHere",
      "locked",
      "clear",
      "inputHint",
      "inputDevice",
      "deviceMouse",
      "deviceTouch",
      "devicePen",
      "deviceUnknown",
      "patientSignatureLabel",
      "staffSignatureLabel",
      "patientAttestation",
      "staffAttestation",
      "statusUnsigned",
      "statusNeedsPatient",
      "statusNeedsStaff",
      "statusCompleted",
      "statusSignedLocked",
      "statusRefused",
      "captured",
      "resign",
      "useTouchScreen",
      "useConnectedPad",
      "returnDevice",
    ];

    for (const key of requiredKeys) {
      it(`EN has esignature.${key}`, () => {
        expect(enMessages).toContain(key);
      });

      it(`FR has esignature.${key}`, () => {
        expect(frMessages).toContain(key);
      });
    }
  });

  describe("Migration", () => {
    it("migration file exists", () => {
      expect(existsSync(join(repoRoot, "apps/api/prisma/migrations/20260926100000_enterprise_document_signatures/migration.sql"))).toBe(true);
    });

    it("migration creates EnterpriseDocumentSignature table", () => {
      const sql = readApi("prisma/migrations/20260926100000_enterprise_document_signatures/migration.sql");
      expect(sql).toContain('CREATE TABLE "EnterpriseDocumentSignature"');
    });

    it("migration adds signatureStatus to EnterpriseDocument", () => {
      const sql = readApi("prisma/migrations/20260926100000_enterprise_document_signatures/migration.sql");
      expect(sql).toContain('"signatureStatus"');
    });

    it("migration adds lockedAt to EnterpriseDocument", () => {
      const sql = readApi("prisma/migrations/20260926100000_enterprise_document_signatures/migration.sql");
      expect(sql).toContain('"lockedAt"');
    });
  });

  describe("Regression safety", () => {
    it("no PatientDocument model in schema", () => {
      expect(schema).not.toContain("model PatientDocument {");
    });

    it("EnterpriseDocument model still exists", () => {
      expect(schema).toContain("model EnterpriseDocument {");
    });

    it("document center still has insurance card upload", () => {
      expect(docCenter).toContain("INSURANCE_CARD_FRONT");
      expect(docCenter).toContain("INSURANCE_CARD_BACK");
    });

    it("document center still has ID card upload", () => {
      expect(docCenter).toContain("PATIENT_ID_FRONT");
      expect(docCenter).toContain("PATIENT_ID_BACK");
    });

    it("document center still has other document upload", () => {
      expect(docCenter).toContain("OTHER_REGISTRATION_DOCUMENT");
    });

    it("patient chart is not affected", () => {
      expect(patientChartPage).not.toContain("SignatureCapturePad");
      expect(patientChartPage).toContain("ChartInsuranceReadOnlySummary");
    });

    it("API upload endpoint still exists", () => {
      expect(controller).toContain('@Post("upload")');
    });

    it("API download endpoint still exists", () => {
      expect(controller).toContain('":documentId/download"');
    });

    it("API delete endpoint still exists", () => {
      expect(controller).toContain('@Delete(":documentId")');
    });

    it("document center uses /api/backend proxy", () => {
      expect(docCenter).toContain('"/api/backend"');
      expect(docCenter).not.toContain("NEXT_PUBLIC_API_URL");
    });

    it("packet wizard uses /api/backend proxy", () => {
      expect(wizard).toContain('"/api/backend"');
      expect(wizard).not.toContain("NEXT_PUBLIC_API_URL");
    });
  });
});
