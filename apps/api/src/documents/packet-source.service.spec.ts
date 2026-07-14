import { BadRequestException } from "@nestjs/common";
import { PacketSourceService, normalizeStructuredPacketModel } from "./packet-source.service";
import { createRegistrationPacketBodySchema } from "./dto/create-registration-packet.dto";
import {
  registrationPacketDocumentTitle,
  registrationPacketFileName,
  packetSubtypeLabel,
  REGISTRATION_PACKAGE_TITLE,
} from "./packet-title.util";

describe("registration packet save resilience", () => {
  const fullModel = {
    packetType: "FREESTANDING_ER",
    packetVersion: "1.0",
    locale: "en",
    facility: { id: "fac-1", name: "Wayne Urgent Care" },
    patient: { id: "pat-1", firstName: "Ada", lastName: "Lovelace" },
    encounter: null,
    insurance: [{ rank: "PRIMARY", payerName: "Aetna", memberId: "M1", groupNumber: null }],
    sections: [
      { id: "consent", title: "Consent", body: "I consent.", reviewed: true },
      { id: "medicareMedicaid", title: "Medicare Notice", body: "Non-participation notice.", reviewed: true },
    ],
    signatures: [
      { signerType: "PATIENT", signerName: "Ada Lovelace", relationship: "self", signedAt: "2026-07-14T12:00:00.000Z" },
      { signerType: "STAFF", signerName: "Nurse Joy", relationship: "witness", signedAt: "2026-07-14T12:00:00.000Z" },
    ],
    attestations: ["Patient attestation", "Staff attestation"],
    generatedAt: "2026-07-14T12:00:00.000Z",
    finalizedAt: null,
  };

  it("zod accepts full payload", () => {
    const parsed = createRegistrationPacketBodySchema.safeParse({
      patientId: "pat-1",
      title: "Wayne Urgent Care Registration Package",
      structuredModel: fullModel,
    });
    expect(parsed.success).toBe(true);
  });

  it("zod accepts missing optional signatures/attestations and defaults them", () => {
    const { signatures: _s, attestations: _a, generatedAt: _g, packetVersion: _v, locale: _l, ...rest } = fullModel;
    const parsed = createRegistrationPacketBodySchema.safeParse({
      patientId: "pat-1",
      structuredModel: rest,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.structuredModel.signatures).toEqual([]);
      expect(parsed.data.structuredModel.attestations).toEqual([]);
      expect(parsed.data.structuredModel.packetVersion).toBe("1.0");
      expect(parsed.data.structuredModel.locale).toBe("en");
    }
  });

  it("zod rejects missing patientId with 400-ready message", () => {
    const parsed = createRegistrationPacketBodySchema.safeParse({
      structuredModel: fullModel,
    });
    expect(parsed.success).toBe(false);
  });

  it("zod rejects missing sections", () => {
    const parsed = createRegistrationPacketBodySchema.safeParse({
      patientId: "pat-1",
      structuredModel: { ...fullModel, sections: [] },
    });
    expect(parsed.success).toBe(false);
  });

  it("normalize defaults generatedAt and signatures without throwing", () => {
    const normalized = normalizeStructuredPacketModel(
      {
        packetType: "URGENT_CARE",
        sections: [{ id: "consent", title: "Consent", body: "OK" }],
        patient: { id: "pat-1" },
        facility: { id: "fac-1" },
      } as any,
      { facilityId: "fac-1", facilityName: "Wayne Urgent Care" },
    );
    expect(normalized.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(normalized.signatures).toEqual([]);
    expect(normalized.attestations).toEqual([]);
    expect(normalized.facility?.name).toBe("Wayne Urgent Care");
    expect(normalized.packetVersion).toBe("1.0");
    expect(normalized.locale).toBe("en");
  });

  it("document title and file name use facility name", () => {
    expect(registrationPacketDocumentTitle("Wayne Urgent Care")).toBe(
      "Wayne Urgent Care Registration Package",
    );
    expect(registrationPacketFileName("Wayne Urgent Care", "2026-07-14")).toBe(
      "Wayne_Urgent_Care_Registration_Package_2026-07-14.pdf",
    );
    expect(REGISTRATION_PACKAGE_TITLE).toBe("Registration Package");
    expect(packetSubtypeLabel("FREESTANDING_ER")).toBe("Freestanding Emergency Room Packet");
  });
});

describe("PacketSourceService.createPacketSource", () => {
  function buildService(overrides?: {
    facility?: { id: string; name: string } | null;
    upload?: jest.Mock;
  }) {
    const prisma = {
      facility: {
        findFirst: jest.fn().mockResolvedValue(
          overrides?.facility === null
            ? null
            : overrides?.facility ?? { id: "fac-1", name: "Wayne Urgent Care" },
        ),
      },
      enterpriseDocumentPacketSource: {
        create: jest.fn().mockResolvedValue({
          id: "ps-1",
          packetType: "FREESTANDING_ER",
          packetVersion: "1.0",
          locale: "en",
          sourceHashSha256: "abc",
          renderedHashSha256: "def",
          generatedAt: new Date("2026-07-14T12:00:00.000Z"),
          finalizedAt: null,
        }),
      },
    };
    const packetPdfService = {
      generate: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4")),
    };
    const documentsService = {
      upload: overrides?.upload ?? jest.fn().mockResolvedValue({ id: "doc-1" }),
    };
    const svc = new PacketSourceService(
      prisma as any,
      packetPdfService as any,
      documentsService as any,
    );
    return { svc, prisma, packetPdfService, documentsService };
  }

  const baseModel = {
    packetType: "FREESTANDING_ER",
    packetVersion: "1.0",
    locale: "en",
    facility: { id: "fac-1" },
    patient: { id: "pat-1", firstName: "Ada", lastName: "Lovelace" },
    insurance: [],
    sections: [
      { id: "consent", title: "Consent", body: "I consent." },
      { id: "medicareMedicaid", title: "Medicare", body: "Notice" },
    ],
    signatures: [],
    attestations: [],
    generatedAt: "2026-07-14T12:00:00.000Z",
  };

  it("save succeeds with full payload", async () => {
    const { svc, documentsService, packetPdfService } = buildService();
    const result = await svc.createPacketSource({
      structuredModel: baseModel as any,
      patientId: "pat-1",
      facilityId: "fac-1",
      title: "Wayne Urgent Care Registration Package — Signed",
    });
    expect(result.documentId).toBe("doc-1");
    expect(documentsService.upload).toHaveBeenCalled();
    const uploadArg = (documentsService.upload as jest.Mock).mock.calls[0][0];
    expect(uploadArg.file.originalname).toBe("Wayne_Urgent_Care_Registration_Package_2026-07-14.pdf");
    expect(uploadArg.title).toContain("Wayne Urgent Care");
    expect(packetPdfService.generate).toHaveBeenCalled();
    const pdfInput = (packetPdfService.generate as jest.Mock).mock.calls[0][0];
    expect(pdfInput.facilityName).toBe("Wayne Urgent Care");
    expect(pdfInput.packetTitle).toBe("Registration Package");
    expect(pdfInput.packetSubtypeLabel).toContain("Freestanding");
    expect(pdfInput.sections.some((s: { key: string }) => s.key === "medicareMedicaid")).toBe(true);
  });

  it("save succeeds when optional signatures/attestations missing", async () => {
    const { svc } = buildService();
    const { signatures: _s, attestations: _a, generatedAt: _g, ...rest } = baseModel as any;
    const result = await svc.createPacketSource({
      structuredModel: rest,
      patientId: "pat-1",
      facilityId: "fac-1",
    });
    expect(result.documentId).toBe("doc-1");
  });

  it("missing patient returns 400 not TypeError", async () => {
    const { svc } = buildService();
    await expect(
      svc.createPacketSource({
        structuredModel: { ...baseModel, patient: null } as any,
        patientId: "pat-1",
        facilityId: "fac-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("missing sections returns 400 not TypeError", async () => {
    const { svc } = buildService();
    await expect(
      svc.createPacketSource({
        structuredModel: { ...baseModel, sections: [] } as any,
        patientId: "pat-1",
        facilityId: "fac-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("missing patientId returns 400 not TypeError", async () => {
    const { svc } = buildService();
    await expect(
      svc.createPacketSource({
        structuredModel: baseModel as any,
        patientId: "",
        facilityId: "fac-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("PDF input uses facility-centered title and freestanding medicare section", async () => {
    const { svc, packetPdfService } = buildService();
    await svc.createPacketSource({
      structuredModel: baseModel as any,
      patientId: "pat-1",
      facilityId: "fac-1",
    });
    const pdfInput = (packetPdfService.generate as jest.Mock).mock.calls[0][0];
    expect(pdfInput.facilityName).toBe("Wayne Urgent Care");
    expect(pdfInput.packetTitle).toBe("Registration Package");
    expect(pdfInput.packetSubtypeLabel).toBe("Freestanding Emergency Room Packet");
    expect(pdfInput.sections.map((s: { key: string }) => s.key)).toContain("medicareMedicaid");
  });
});
