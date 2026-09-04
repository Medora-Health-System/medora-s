import { Injectable } from "@nestjs/common";
/** CJS `export =` — use import-equals so Nest/CommonJS emit does not read `.default`. */
import PDFDocument = require("pdfkit");
import { packetPdfChrome } from "./packet-pdf-chrome";

export interface PacketPdfInput {
  template: string;
  templateLabel: string;
  patient: {
    firstName?: string;
    lastName?: string;
    dob?: string | null;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    postalCode?: string | null;
  } | null;
  insurance: {
    rank: string;
    payerName?: string | null;
    memberId?: string | null;
    groupNumber?: string | null;
  }[];
  sections: { key: string; label: string; content: string; conciseSummary?: string; sourceLabel?: string; sourceUrl?: string; contentVersion?: string }[];
  signatures: {
    signerName: string;
    signerRelationship: string;
    signedAt: string;
    staffName: string;
    staffSignedAt: string;
    refusalReason?: string;
    patientStrokes?: SignatureVectorLike | null;
    staffStrokes?: SignatureVectorLike | null;
    patientAttestation?: string;
    staffAttestation?: string;
  };
  facilityName?: string;
  generatedAt: string;
  packetVersion?: string;
  locale?: string;
  patientMrn?: string;
  encounterNumber?: string;
  sourceHash?: string;
  /** Main title under facility name (defaults to "Registration Package"). */
  packetTitle?: string;
  /** Small subtype line, e.g. "Urgent Care Packet". */
  packetSubtypeLabel?: string;
  /** Facility branding from RegistrationPacketTheme (optional). */
  branding?: {
    logoUrl?: string | null;
    addressLine?: string | null;
    phone?: string | null;
    footer?: string | null;
    legalNotice?: string | null;
  };
}

export type SignatureVectorLike = {
  strokes?: Array<{ points?: Array<{ x?: number; y?: number; pressure?: number }> } | Array<{ x?: number; y?: number; pressure?: number }>>;
  width?: number;
  height?: number;
  capturedAt?: string;
};

function drawSignature(doc: PDFKit.PDFDocument, value: SignatureVectorLike | null | undefined, x: number, y: number, width: number, height: number) {
  if (!value || !Array.isArray(value.strokes) || !value.width || !value.height) return;
  const scaleX = width / value.width;
  const scaleY = height / value.height;
  doc.save().lineCap("round").lineJoin("round").strokeColor("#0f172a");
  for (const stroke of value.strokes) {
    const points = Array.isArray(stroke) ? stroke : stroke?.points;
    if (!Array.isArray(points) || points.length < 2) continue;
    const first = points[0];
    if (!Number.isFinite(first?.x) || !Number.isFinite(first?.y)) continue;
    const firstX = first.x as number;
    const firstY = first.y as number;
    doc.lineWidth(1.5).moveTo(x + firstX * scaleX, y + firstY * scaleY);
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const point = points[index];
      if (!Number.isFinite(previous?.x) || !Number.isFinite(previous?.y) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
      const previousX = previous.x as number;
      const previousY = previous.y as number;
      const pointX = point.x as number;
      const pointY = point.y as number;
      doc.lineWidth(1.2 + Math.max(0, Math.min(1, point.pressure ?? 0.5)) * 1.8);
      doc.quadraticCurveTo(
        x + previousX * scaleX,
        y + previousY * scaleY,
        x + ((previousX + pointX) / 2) * scaleX,
        y + ((previousY + pointY) / 2) * scaleY,
      );
    }
    doc.stroke();
  }
  doc.restore();
}

@Injectable()
export class PacketPdfService {
  async generate(input: PacketPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chrome = packetPdfChrome(input.locale);
      const patientName =
        [input.patient?.firstName, input.patient?.lastName].filter(Boolean).join(" ") || chrome.unknownPatient;
      const packetTitle = input.packetTitle || chrome.registrationPackage;
      const facilityName = input.facilityName?.trim() || "";

      const doc = new PDFDocument({
        size: "LETTER",
        margin: 50,
        info: {
          Title: facilityName
            ? `${facilityName} — ${packetTitle} — ${patientName}`
            : `${packetTitle} — ${patientName}`,
          Author: "Medora EMR",
          Subject: `Registration Packet: ${input.template}`,
          Creator: "Medora EMR v1.0",
          Producer: "Medora PDFKit",
          Keywords: [
            `packetType:${input.template}`,
            `packetVersion:${input.packetVersion || "1.0"}`,
            `locale:${input.locale || "en"}`,
            facilityName ? `facility:${facilityName}` : "",
            input.patientMrn ? `mrn:${input.patientMrn}` : "",
            input.encounterNumber ? `encounter:${input.encounterNumber}` : "",
            `generated:${input.generatedAt}`,
            input.sourceHash ? `sourceHash:${input.sourceHash}` : "",
          ]
            .filter(Boolean)
            .join("; "),
        },
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Centered header: Facility Name → Registration Package → optional subtype
      if (facilityName) {
        doc.fontSize(16).font("Helvetica-Bold").text(facilityName, { align: "center" });
        doc.moveDown(0.25);
      }
      if (input.branding?.addressLine || input.branding?.phone) {
        doc.fontSize(8).font("Helvetica").fillColor("#555555");
        if (input.branding.addressLine) {
          doc.text(input.branding.addressLine, { align: "center" });
        }
        if (input.branding.phone) {
          doc.text(input.branding.phone, { align: "center" });
        }
        doc.fillColor("#000000");
        doc.moveDown(0.25);
      }
      doc.fontSize(14).font("Helvetica-Bold").text(packetTitle, { align: "center" });
      if (input.packetSubtypeLabel) {
        doc.moveDown(0.2);
        doc.fontSize(9).font("Helvetica").text(input.packetSubtypeLabel, { align: "center" });
      }
      doc.moveDown(0.3);

      doc.fontSize(10).font("Helvetica").text(input.generatedAt, { align: "center" });
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);

      if (input.patient) {
        doc.fontSize(12).font("Helvetica-Bold").text(chrome.patientInformation);
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        const p = input.patient;
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
        doc.text(`${chrome.name} ${name}`);
        if (p.dob) doc.text(`${chrome.dateOfBirth} ${p.dob}`);
        if (p.phone) doc.text(`${chrome.phone} ${p.phone}`);
        if (p.email) doc.text(`${chrome.email} ${p.email}`);
        const addr = [p.addressLine1, p.city, p.stateProvince, p.postalCode].filter(Boolean).join(", ");
        if (addr) doc.text(`${chrome.address} ${addr}`);
        doc.moveDown(0.8);
      }

      const insurance = Array.isArray(input.insurance) ? input.insurance : [];
      if (insurance.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text(chrome.insuranceInformation);
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        for (const ins of insurance) {
          const payer = ins.payerName || "—";
          const member = ins.memberId ? ` (${chrome.memberId} ${ins.memberId})` : "";
          const group = ins.groupNumber ? ` ${chrome.group} ${ins.groupNumber}` : "";
          doc.text(`${ins.rank}: ${payer}${member}${group}`);
        }
        doc.moveDown(0.8);
      }

      const sections = Array.isArray(input.sections) ? input.sections : [];
      for (const section of sections) {
        if (doc.y > 680) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").text(section.label || "");
        doc.moveDown(0.2);
        // Full legal text only — never summary-only in the signed PDF.
        doc.fontSize(9).font("Helvetica").text(section.content || "", { lineGap: 2 });
        if (section.sourceLabel || section.sourceUrl || section.contentVersion) {
          doc.moveDown(0.2);
          doc.fontSize(7).fillColor("#666666");
          const meta = [
            section.contentVersion ? `contentVersion:${section.contentVersion}` : "",
            section.sourceLabel || "",
            section.sourceUrl || "",
          ]
            .filter(Boolean)
            .join(" · ");
          if (meta) doc.text(meta, { lineGap: 1 });
          doc.fillColor("#000000");
        }
        doc.moveDown(0.6);
      }

      if (doc.y > 600) doc.addPage();
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica-Bold").text(chrome.documentMetadata);
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor("#444444");
      doc.text(`${chrome.packetType} ${input.template}`);
      doc.text(`${chrome.packetVersion} ${input.packetVersion || "1.0"}`);
      doc.text(`${chrome.locale} ${input.locale || "en"}`);
      doc.text(`${chrome.generated} ${input.generatedAt}`);
      if (input.sourceHash) doc.text(`${chrome.sourceHash} ${input.sourceHash}`);
      doc.fillColor("#000000");
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke("#333333");
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Bold").text(chrome.signatures);
      doc.moveDown(0.4);
      doc.fontSize(10).font("Helvetica");

      const sigs = input.signatures || {
        signerName: "—",
        signerRelationship: "—",
        signedAt: "—",
        staffName: "—",
        staffSignedAt: "—",
      };

      if (sigs.refusalReason) {
        doc.text(`${chrome.refused} ${sigs.refusalReason}`);
      } else {
        doc.text(`${chrome.patientOrRepresentative} ${sigs.signerName}`);
        doc.text(`${chrome.relationship} ${sigs.signerRelationship}`);
        doc.text(`${chrome.signed} ${sigs.signedAt}`);
        drawSignature(doc, sigs.patientStrokes, 50, doc.y + 4, 220, 55);
        doc.moveDown(3);
        if (sigs.patientAttestation) doc.fontSize(8).text(sigs.patientAttestation).fontSize(10);
      }
      doc.moveDown(0.4);
      doc.text(`${chrome.staffWitness} ${sigs.staffName}`);
      doc.text(`${chrome.staffSigned} ${sigs.staffSignedAt}`);
      drawSignature(doc, sigs.staffStrokes, 50, doc.y + 4, 220, 55);
      doc.moveDown(3);
      if (sigs.staffAttestation) doc.fontSize(8).text(sigs.staffAttestation).fontSize(10);

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#666666").text(
        input.branding?.footer?.trim() || chrome.defaultFooter,
        { align: "center" },
      );
      if (input.branding?.legalNotice?.trim()) {
        doc.moveDown(0.3);
        doc.fontSize(7).fillColor("#888888").text(input.branding.legalNotice.trim(), {
          align: "center",
        });
      }

      doc.end();
    });
  }
}
