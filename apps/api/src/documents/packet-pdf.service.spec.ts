import { readFileSync } from "fs";
import { join } from "path";
import { inflateSync } from "zlib";
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

function pdfHaystack(buffer: Buffer): string {
  const latin1 = buffer.toString("latin1");
  const stripped = latin1.replace(/\0/g, "");
  const inflated: string[] = [];
  for (const match of latin1.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      inflated.push(inflateSync(Buffer.from(match[1], "binary")).toString("latin1"));
    } catch {
      /* skip non-deflate streams */
    }
  }
  const combined = `${stripped}\n${inflated.join("\n")}`;
  const decodedHex = [...combined.matchAll(/<([0-9a-fA-F]+)>/g)]
    .map((m) => {
      try {
        return Buffer.from(m[1], "hex").toString("latin1");
      } catch {
        return "";
      }
    })
    .join("");
  return `${combined}\n${decodedHex}`;
}

describe("MEDUI.ES.1J.B PacketPdfService safe chrome", () => {
  const service = new PacketPdfService();
  const legalBody = "I consent to treatment. HIPAA NPP body remains English source.";
  const attestation = "I attest that I reviewed this packet.";
  const base = {
    template: "URGENT_CARE" as const,
    templateLabel: "Urgent Care",
    patient: { firstName: "Ada", lastName: "Lovelace", dob: "1815-12-10" },
    insurance: [{ rank: "PRIMARY", payerName: "Aetna", memberId: "M1", groupNumber: null }],
    sections: [{ key: "consent", label: "Consent", content: legalBody }],
    signatures: {
      signerName: "Ada Lovelace",
      signerRelationship: "self",
      signedAt: "2026-07-15T12:00:00.000Z",
      staffName: "Nurse Joy",
      staffSignedAt: "2026-07-15T12:01:00.000Z",
      patientStrokes: null,
      staffStrokes: null,
      patientAttestation: attestation,
      staffAttestation: "Staff attestation remains source.",
    },
    facilityName: "Wayne Urgent Care",
    generatedAt: "2026-07-15T12:02:00.000Z",
    packetVersion: "1.0",
  };

  it("EN PDF keeps English chrome and legal body", async () => {
    const buffer = await service.generate({ ...base, locale: "en" });
    const text = pdfHaystack(buffer);
    expect(text).toContain("Registration Package");
    expect(text).toContain("Locale:");
    expect(text).toContain("Patient Information");
    expect(text).toContain("Insurance Information");
    expect(text).toContain(legalBody);
    expect(text).toContain(attestation);
    expect(text).toContain("Ada Lovelace");
    expect(text).not.toContain("Paquete de inscripción");
    expect(text).not.toContain("Paquet d'inscription");
  });

  it("ES PDF localizes safe chrome without translating legal body or names", async () => {
    const buffer = await service.generate({ ...base, locale: "es" });
    const text = pdfHaystack(buffer);
    expect(text).toContain("Paquete de inscripci");
    expect(text).toContain("Idioma:");
    expect(text).toContain("Informaci");
    expect(text).toContain("del paciente");
    expect(text).toContain("del seguro");
    expect(text).toContain(legalBody);
    expect(text).toContain(attestation);
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Nurse Joy");
    expect(text).not.toContain("Registration Package");
    expect(text).not.toContain("Patient Information");
    expect(text).not.toContain("Paquet d'inscription");
    expect(text).not.toContain("Informations du patient");
  });

  it("FR PDF uses French chrome only", async () => {
    const buffer = await service.generate({ ...base, locale: "fr" });
    const text = pdfHaystack(buffer);
    expect(text).toContain("Paquet d'inscription");
    expect(text).toContain("Langue :");
    expect(text).toContain("Informations du patient");
    expect(text).toContain(legalBody);
    expect(text).not.toContain("Paquete de inscripci");
    expect(text).not.toContain("Patient Information");
  });
});
