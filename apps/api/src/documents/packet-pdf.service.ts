import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

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
}

@Injectable()
export class PacketPdfService {
  async generate(input: PacketPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).font("Helvetica-Bold").text(input.templateLabel, { align: "center" });
      doc.moveDown(0.3);

      if (input.facilityName) {
        doc.fontSize(10).font("Helvetica").text(input.facilityName, { align: "center" });
      }
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

      if (input.insurance.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Insurance Information");
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica");
        for (const ins of input.insurance) {
          const payer = ins.payerName || "—";
          const member = ins.memberId ? ` (ID: ${ins.memberId})` : "";
          const group = ins.groupNumber ? ` Group: ${ins.groupNumber}` : "";
          doc.text(`${ins.rank}: ${payer}${member}${group}`);
        }
        doc.moveDown(0.8);
      }

      for (const section of input.sections) {
        if (doc.y > 680) doc.addPage();
        doc.fontSize(11).font("Helvetica-Bold").text(section.label);
        doc.moveDown(0.2);
        doc.fontSize(9).font("Helvetica").text(section.content, { lineGap: 2 });
        doc.moveDown(0.6);
      }

      if (doc.y > 600) doc.addPage();
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke("#333333");
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Bold").text("Signatures");
      doc.moveDown(0.4);
      doc.fontSize(10).font("Helvetica");

      if (input.signatures.refusalReason) {
        doc.text(`REFUSED: ${input.signatures.refusalReason}`);
      } else {
        doc.text(`Patient/Representative: ${input.signatures.signerName}`);
        doc.text(`Relationship: ${input.signatures.signerRelationship}`);
        doc.text(`Signed: ${input.signatures.signedAt}`);
      }
      doc.moveDown(0.4);
      doc.text(`Staff Witness: ${input.signatures.staffName}`);
      doc.text(`Staff Signed: ${input.signatures.staffSignedAt}`);

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#666666").text(
        "This document was electronically generated and signed via Medora EMR.",
        { align: "center" },
      );

      doc.end();
    });
  }
}
