import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import { PacketPdfService } from "./packet-pdf.service";
import { DocumentsService } from "./documents.service";

export interface StructuredPacketSection {
  id: string;
  title: string;
  body: string;
  reviewed?: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  required?: boolean;
}

export interface StructuredPacketSignature {
  signerType: string;
  signerName: string;
  relationship?: string;
  signedAt?: string;
  attestation?: string;
  signatureVectorHash?: string;
  refusalReason?: string;
}

export interface StructuredPacketModel {
  packetType: string;
  packetVersion: string;
  locale: string;
  facility: {
    id?: string;
    name?: string;
  } | null;
  patient: {
    id?: string;
    firstName?: string;
    lastName?: string;
    dob?: string | null;
    mrn?: string | null;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    postalCode?: string | null;
  } | null;
  encounter?: { id?: string; number?: string } | null;
  insurance: {
    rank: string;
    payerName?: string | null;
    memberId?: string | null;
    groupNumber?: string | null;
  }[];
  sections: StructuredPacketSection[];
  signatures: StructuredPacketSignature[];
  attestations: string[];
  generatedAt: string;
  finalizedAt?: string | null;
}

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

function deepSortedJson(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => deepSortedJson(item)).join(",") + "]";
  }
  if (typeof obj === "object") {
    const sorted = Object.keys(obj as Record<string, unknown>).sort();
    return (
      "{" +
      sorted
        .map((k) => JSON.stringify(k) + ":" + deepSortedJson((obj as Record<string, unknown>)[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(obj);
}

function hashSource(sourceJson: unknown): string {
  const canonical = deepSortedJson(sourceJson);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

function hashPdfBytes(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

@Injectable()
export class PacketSourceService {
  private readonly logger = new Logger(PacketSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly packetPdfService: PacketPdfService,
    private readonly documentsService: DocumentsService,
  ) {}

  async createPacketSource(params: {
    structuredModel: StructuredPacketModel;
    patientId: string;
    facilityId: string;
    encounterId?: string;
    createdById?: string;
    title?: string;
  }) {
    const { structuredModel, patientId, facilityId, encounterId, createdById, title } = params;

    if (!structuredModel.packetType) throw new BadRequestException("packetType is required");
    if (!structuredModel.patient) throw new BadRequestException("patient data is required");

    const sourceHashSha256 = hashSource(structuredModel);

    const pdfBuffer = await this.renderPdfFromSource(structuredModel);
    const renderedHashSha256 = hashPdfBytes(pdfBuffer);

    const patientName =
      [structuredModel.patient?.firstName, structuredModel.patient?.lastName]
        .filter(Boolean)
        .join("_") || "Patient";
    const dateStr = structuredModel.generatedAt.slice(0, 10);
    const fileName = `${structuredModel.packetType}_Registration_Package_${patientName}_${dateStr}.pdf`;

    const doc = await this.documentsService.upload({
      patientId,
      encounterId,
      facilityId,
      category: "REGISTRATION",
      type: "REGISTRATION_PACKET",
      title: title || `${structuredModel.packetType} Registration Packet`,
      notes: JSON.stringify({
        packetType: structuredModel.packetType,
        packetVersion: structuredModel.packetVersion,
        locale: structuredModel.locale,
        sourceHash: sourceHashSha256,
        renderedHash: renderedHashSha256,
      }),
      source: "SYSTEM",
      uploadedById: createdById,
      file: {
        originalname: fileName,
        mimetype: "application/pdf",
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
    });

    const packetSource = await this.prisma.enterpriseDocumentPacketSource.create({
      data: {
        documentId: doc.id,
        packetType: structuredModel.packetType,
        packetVersion: structuredModel.packetVersion || "1.0",
        locale: structuredModel.locale || "en",
        facilityId,
        patientId,
        encounterId: encounterId || null,
        sourceJson: structuredModel as unknown as object,
        sourceHashSha256,
        renderedHashSha256,
        createdById: createdById || null,
      },
    });

    this.logger.log(
      `packet source created: docId=${doc.id} packetSourceId=${packetSource.id} type=${structuredModel.packetType}`,
    );

    return {
      documentId: doc.id,
      packetSourceId: packetSource.id,
      packetType: packetSource.packetType,
      packetVersion: packetSource.packetVersion,
      locale: packetSource.locale,
      sourceHashSha256: packetSource.sourceHashSha256,
      renderedHashSha256: packetSource.renderedHashSha256,
      generatedAt: packetSource.generatedAt,
      finalizedAt: packetSource.finalizedAt,
    };
  }

  async getPacketSource(documentId: string, facilityId?: string) {
    const source = await this.prisma.enterpriseDocumentPacketSource.findUnique({
      where: { documentId },
      include: { document: { select: { facilityId: true, signatureStatus: true, lockedAt: true } } },
    });
    if (!source) throw new NotFoundException("Packet source not found for this document");

    if (facilityId && source.document.facilityId && source.document.facilityId !== facilityId) {
      throw new ForbiddenException("Access denied to this packet source");
    }

    return {
      id: source.id,
      documentId: source.documentId,
      packetType: source.packetType,
      packetVersion: source.packetVersion,
      locale: source.locale,
      sourceJson: source.sourceJson,
      sourceHashSha256: source.sourceHashSha256,
      renderedHashSha256: source.renderedHashSha256,
      generatedAt: source.generatedAt,
      finalizedAt: source.finalizedAt,
      signatureStatus: source.document.signatureStatus,
      lockedAt: source.document.lockedAt,
    };
  }

  async renderPdfFromSource(sourceJson: StructuredPacketModel): Promise<Buffer> {
    const sigData = sourceJson.signatures?.[0];
    return this.packetPdfService.generate({
      template: sourceJson.packetType,
      templateLabel: `${sourceJson.packetType} Registration Packet`,
      patient: sourceJson.patient
        ? {
            firstName: sourceJson.patient.firstName,
            lastName: sourceJson.patient.lastName,
            dob: sourceJson.patient.dob || null,
            phone: sourceJson.patient.phone || null,
            email: sourceJson.patient.email || null,
            addressLine1: sourceJson.patient.addressLine1 || null,
            city: sourceJson.patient.city || null,
            stateProvince: sourceJson.patient.stateProvince || null,
            postalCode: sourceJson.patient.postalCode || null,
          }
        : null,
      insurance: sourceJson.insurance || [],
      sections: sourceJson.sections.map((s) => ({
        key: s.id,
        label: s.title,
        content: s.body,
      })),
      signatures: {
        signerName: sigData?.signerName || "—",
        signerRelationship: sigData?.relationship || "—",
        signedAt: sigData?.signedAt || "—",
        staffName:
          sourceJson.signatures.find((s) => s.signerType === "STAFF")?.signerName || "—",
        staffSignedAt:
          sourceJson.signatures.find((s) => s.signerType === "STAFF")?.signedAt || "—",
        refusalReason: sigData?.refusalReason,
      },
      facilityName: sourceJson.facility?.name,
      generatedAt: sourceJson.generatedAt,
    });
  }

  async reRenderPdf(documentId: string, facilityId?: string) {
    const source = await this.getPacketSource(documentId, facilityId);

    if (source.finalizedAt) {
      throw new ForbiddenException("Cannot re-render a finalized packet. Create a new version instead.");
    }

    const structuredModel = source.sourceJson as unknown as StructuredPacketModel;
    const pdfBuffer = await this.renderPdfFromSource(structuredModel);
    const renderedHashSha256 = hashPdfBytes(pdfBuffer);

    await this.prisma.enterpriseDocumentPacketSource.update({
      where: { documentId },
      data: { renderedHashSha256 },
    });

    return { pdfBuffer, renderedHashSha256 };
  }

  async finalizePacket(documentId: string, facilityId?: string, userId?: string) {
    const source = await this.prisma.enterpriseDocumentPacketSource.findUnique({
      where: { documentId },
      include: { document: { select: { facilityId: true, signatureStatus: true, lockedAt: true } } },
    });
    if (!source) throw new NotFoundException("Packet source not found");

    if (facilityId && source.document.facilityId && source.document.facilityId !== facilityId) {
      throw new ForbiddenException("Access denied");
    }

    if (source.finalizedAt) {
      throw new ForbiddenException("Packet already finalized");
    }

    const now = new Date();

    await this.prisma.enterpriseDocumentPacketSource.update({
      where: { documentId },
      data: { finalizedAt: now },
    });

    await this.prisma.enterpriseDocument.update({
      where: { id: documentId },
      data: {
        signatureStatus: "COMPLETED",
        lockedAt: now,
        lockedById: userId || null,
      },
    });

    this.logger.log(`packet finalized: docId=${documentId}`);

    return {
      documentId,
      finalizedAt: now.toISOString(),
      locked: true,
    };
  }
}
