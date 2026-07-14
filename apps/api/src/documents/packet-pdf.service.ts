import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { REGISTRATION_PACKAGE_TITLE } from "./packet-title.util";

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
  sections: { key: string; label: string; content: string }[];
  signatures: {
    signerName: string;
    signerRelationship: string;
    signedAt: string;
    staffName: string;
    staffSignedAt: string;
    refusalReason?: string;
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
}

@Injectable()
export class PacketPdfService {
  async generate(input: PacketPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const patientName = [input.patient?.firstName, input.patient?.lastName].filter(Boolean).join(" ") || "Unknown";
      const packetTitle = input.packetTitle || REGISTRATION_PACKAGE_TITLE;
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
        doc.fontSize(12).font("Helvetica-Bold").text("Patient Information");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        const p = input.patient;
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
        doc.text(`Name: ${name}`);
        if (p.dob) doc.text(`Date of Birth: ${p.dob}`);
        if (p.phone) doc.text(`Phone: ${p.phone}`);
        if (p.email) doc.text(`Email: ${p.email}`);
        const addr = [p.addressLine1, p.city, p.stateProvince, p.postalCode].filter(Boolean).join(", ");
        if (addr) doc.text(`Address: ${addr}`);
        doc.moveDown(0.8);
      }

      const insurance = Array.isArray(input.insurance) ? input.insurance : [];
      if (insurance.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Insurance Information");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        for (const ins of insurance) {
          const payer = ins.payerName || "—";
          const member = ins.memberId ? ` (ID: ${ins.memberId})` : "";
          const group = ins.groupNumber ? ` Group: ${ins.groupNumber}` : "";
          doc.text(`${ins.rank}: ${payer}${member}${group}`);
        }
        doc.moveDown(0.8);
      }

      const sections = Array.isArray(input.sections) ? input.sections : [];
      for (const section of sections) {
        if (doc.y > 680) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").text(section.label || "");
        doc.moveDown(0.2);
        doc.fontSize(9).font("Helvetica").text(section.content || "", { lineGap: 2 });
        doc.moveDown(0.6);
      }

      if (doc.y > 600) doc.addPage();
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke("#333333");
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Bold").text("Signatures");
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
        doc.text(`REFUSED: ${sigs.refusalReason}`);
      } else {
        doc.text(`Patient/Representative: ${sigs.signerName}`);
        doc.text(`Relationship: ${sigs.signerRelationship}`);
        doc.text(`Signed: ${sigs.signedAt}`);
      }
      doc.moveDown(0.4);
      doc.text(`Staff Witness: ${sigs.staffName}`);
      doc.text(`Staff Signed: ${sigs.staffSignedAt}`);

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#666666").text(
        "This document was electronically generated and signed via Medora EMR.",
        { align: "center" },
      );

      doc.end();
    });
  }
}
