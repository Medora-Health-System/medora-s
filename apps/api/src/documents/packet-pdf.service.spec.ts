import { readFileSync } from "fs";
import { join } from "path";
import { PacketPdfService } from "./packet-pdf.service";

describe("PacketPdfService PDFKit import compatibility", () => {
  const service = new PacketPdfService();

  it("source uses CJS import-equals for pdfkit (not default import)", () => {
    const src = readFileSync(join(__dirname, "packet-pdf.service.ts"), "utf8");
    expect(src).toMatch(/import\s+PDFDocument\s*=\s*require\(["']pdfkit["']\)/);
    expect(src).not.toMatch(/import\s+PDFDocument\s+from\s+["']pdfkit["']/);
    expect(src).not.toMatch(/import\s+\*\s+as\s+PDFKit\s+from\s+["']pdfkit["']/);
  });

  it("require('pdfkit') is a constructor and has no usable .default", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfkit = require("pdfkit") as new (options?: object) => { end: () => void };
    expect(typeof pdfkit).toBe("function");
    expect((pdfkit as { default?: unknown }).default).toBeUndefined();
    expect(() => new pdfkit({ size: "LETTER" })).not.toThrow();
  });

  it("generates a non-empty PDF buffer for a registration-style packet", async () => {
    const buffer = await service.generate({
      template: "URGENT_CARE",
      templateLabel: "Urgent Care",
      patient: { firstName: "Ada", lastName: "Lovelace", dob: "1815-12-10" },
      insurance: [{ rank: "PRIMARY", payerName: "Aetna", memberId: "M1", groupNumber: null }],
      sections: [{ key: "consent", label: "Consent", content: "I consent to treatment." }],
      signatures: {
        signerName: "Ada Lovelace",
        signerRelationship: "self",
        signedAt: "2026-07-15T12:00:00.000Z",
        staffName: "Nurse Joy",
        staffSignedAt: "2026-07-15T12:01:00.000Z",
        patientStrokes: null,
        staffStrokes: null,
      },
      facilityName: "Wayne Urgent Care",
      generatedAt: "2026-07-15T12:02:00.000Z",
      packetVersion: "1.0",
      locale: "en",
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("does not throw TypeError pdfkit.default is not a constructor", async () => {
    await expect(
      service.generate({
        template: "CONSENT",
        templateLabel: "Consent",
        patient: null,
        insurance: [],
        sections: [{ key: "body", label: "Body", content: "Consent body" }],
        signatures: {
          signerName: "Patient",
          signerRelationship: "self",
          signedAt: "2026-07-15T12:00:00.000Z",
          staffName: "Staff",
          staffSignedAt: "2026-07-15T12:00:00.000Z",
        },
        generatedAt: "2026-07-15T12:00:00.000Z",
      }),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
