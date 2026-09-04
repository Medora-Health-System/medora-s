import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import { PacketPdfService, type SignatureVectorLike } from "./packet-pdf.service";
import { DocumentsService } from "./documents.service";
import type { StructuredPacketModelDto } from "./dto/create-registration-packet.dto";
import {
  registrationPacketDocumentTitle,
  registrationPacketFileName,
  safeGeneratedAtDate,
  safeGeneratedAtIso,
} from "./packet-title.util";
import { packetPdfChrome, packetPdfSubtypeLabel } from "./packet-pdf-chrome";
import {
  RegistrationPacketTemplateEngine,
  type PacketAnswerInput,
  type PacketConditionContext,
  type ResolvedPacketTheme,
} from "./registration-packet-template.engine";

export interface StructuredPacketSection {
  id: string;
  title: string;
  /** Full legal text snapshotted for PDF. */
  body: string;
  conciseSummary?: string;
  fullBody?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  authorityType?: string;
  contentVersion?: string;
  legalReviewStatus?: string;
  acknowledgmentRequired?: boolean;
  acknowledgmentText?: string;
  separateSignatureRequired?: boolean;
  fullTextMadeAvailable?: boolean;
  fullTextMadeAvailableAt?: string | null;
  acknowledged?: boolean;
  acknowledgedAt?: string | null;
  reviewed?: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  required?: boolean;
  declined?: boolean;
}

export interface StructuredPacketSignature {
  signerType: string;
  signerName: string;
  relationship?: string;
  signedAt?: string;
  attestation?: string;
  signatureVectorHash?: string;
  refusalReason?: string;
  patientStrokes?: unknown;
  staffStrokes?: unknown;
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

/** Normalize optional fields so PDF/hash paths never hit raw TypeErrors. */
export function normalizeStructuredPacketModel(
  raw: StructuredPacketModelDto,
  defaults: { facilityId?: string; facilityName?: string },
): StructuredPacketModel {
  const generatedAt = safeGeneratedAtIso(raw.generatedAt);
  const facilityName = raw.facility?.name?.trim() || defaults.facilityName?.trim() || undefined;
  const facilityId = raw.facility?.id || defaults.facilityId;

  return {
    packetType: raw.packetType,
    packetVersion: raw.packetVersion || "1.0",
    locale: raw.locale || "en",
    facility: facilityId || facilityName ? { id: facilityId, name: facilityName } : null,
    patient: raw.patient,
    encounter: raw.encounter ?? null,
    insurance: Array.isArray(raw.insurance) ? raw.insurance : [],
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    signatures: Array.isArray(raw.signatures) ? raw.signatures : [],
    attestations: Array.isArray(raw.attestations) ? raw.attestations : [],
    generatedAt,
    finalizedAt: raw.finalizedAt ?? null,
  };
}

@Injectable()
export class PacketSourceService {
  private readonly logger = new Logger(PacketSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly packetPdfService: PacketPdfService,
    private readonly documentsService: DocumentsService,
    private readonly templateEngine: RegistrationPacketTemplateEngine,
  ) {}

  private logPacketSafe(
    requestId: string | undefined,
    event: string,
    meta: {
      packetType?: string;
      template?: string;
      hasPatientId?: boolean;
      hasFacility?: boolean;
      hasSections?: boolean;
      hasSignatures?: boolean;
      sectionCount?: number;
    },
  ) {
    this.logger.log(
      JSON.stringify({
        route: "documents/registration-packets",
        requestId: requestId || null,
        event,
        packetType: meta.packetType || null,
        template: meta.template || null,
        hasPatientId: !!meta.hasPatientId,
        hasFacility: !!meta.hasFacility,
        hasSections: !!meta.hasSections,
        hasSignatures: !!meta.hasSignatures,
        sectionCount: meta.sectionCount ?? null,
      }),
    );
  }

  async createPacketSource(params: {
    structuredModel: StructuredPacketModelDto | StructuredPacketModel;
    patientId: string;
    facilityId: string;
    encounterId?: string;
    createdById?: string;
    title?: string;
    requestId?: string;
    /** Optional answers stored separately from template (never mutates template). */
    answers?: PacketAnswerInput[];
    /** Optional branding override from template theme. */
    branding?: ResolvedPacketTheme;
    templateVersionId?: string | null;
  }) {
    const { patientId, facilityId, encounterId, createdById, title, requestId } = params;

    if (!patientId?.trim()) throw new BadRequestException("patientId is required");
    if (!facilityId?.trim()) throw new BadRequestException("facility is required");

    let facilityName = "";
    try {
      const facilityRow = await this.prisma.facility.findFirst({
        where: { id: facilityId },
        select: { id: true, name: true },
      });
      if (!facilityRow) throw new BadRequestException("facility not found");
      facilityName = facilityRow.name?.trim() || facilityId;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(
        JSON.stringify({
          route: "documents/registration-packets",
          requestId: requestId || null,
          event: "facility_lookup_failed",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
      throw new InternalServerErrorException("Unable to resolve facility for registration packet");
    }

    const structuredModel = normalizeStructuredPacketModel(params.structuredModel as StructuredPacketModelDto, {
      facilityId,
      facilityName,
    });

    this.logPacketSafe(requestId, "create_start", {
      packetType: structuredModel.packetType,
      template: structuredModel.packetType,
      hasPatientId: !!patientId,
      hasFacility: !!structuredModel.facility,
      hasSections: Array.isArray(structuredModel.sections) && structuredModel.sections.length > 0,
      hasSignatures: Array.isArray(structuredModel.signatures) && structuredModel.signatures.length > 0,
      sectionCount: structuredModel.sections?.length,
    });

    if (!structuredModel.packetType) throw new BadRequestException("packetType is required");
    if (!structuredModel.patient) throw new BadRequestException("patient data is required");
    if (!structuredModel.facility) throw new BadRequestException("facility is required");
    if (!Array.isArray(structuredModel.sections) || structuredModel.sections.length === 0) {
      throw new BadRequestException("sections are required");
    }

    try {
      const sourceHashSha256 = hashSource(structuredModel);

      const templateVersionId =
        params.templateVersionId !== undefined
          ? params.templateVersionId
          : await this.templateEngine.resolveTemplateVersionId(
              structuredModel.packetType,
              structuredModel.packetVersion || "1.0",
            );

      let branding = params.branding;
      if (!branding && templateVersionId) {
        const versionRow = await this.prisma.registrationPacketTemplateVersion.findUnique({
          where: { id: templateVersionId },
          select: { id: true, templateId: true },
        });
        if (versionRow) {
          branding = await this.templateEngine.resolveTheme(
            versionRow.id,
            versionRow.templateId,
            facilityId,
            structuredModel.locale || "en",
          );
        }
      }

      const pdfBuffer = await this.renderPdfFromSource(structuredModel, branding);
      const renderedHashSha256 = hashPdfBytes(pdfBuffer);

      const dateStr = safeGeneratedAtDate(structuredModel.generatedAt);
      const fileName = registrationPacketFileName(facilityName, dateStr);
      const docTitle =
        title?.trim() || registrationPacketDocumentTitle(facilityName);

      const doc = await this.documentsService.upload({
        patientId,
        encounterId,
        facilityId,
        category: "REGISTRATION",
        type: "REGISTRATION_PACKET",
        title: docTitle,
        notes: JSON.stringify({
          packetType: structuredModel.packetType,
          packetVersion: structuredModel.packetVersion,
          locale: structuredModel.locale,
          sourceHash: sourceHashSha256,
          renderedHash: renderedHashSha256,
          templateVersionId: templateVersionId || null,
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
          templateVersionId: templateVersionId || null,
          sourceJson: structuredModel as unknown as object,
          sourceHashSha256,
          renderedHashSha256,
          createdById: createdById || null,
        },
      });

      if (params.answers?.length) {
        await this.templateEngine.persistAnswers({
          packetSourceId: packetSource.id,
          answers: params.answers,
        });
      }

      this.logPacketSafe(requestId, "create_ok", {
        packetType: structuredModel.packetType,
        template: structuredModel.packetType,
        hasPatientId: true,
        hasFacility: true,
        hasSections: true,
        hasSignatures: structuredModel.signatures.length > 0,
        sectionCount: structuredModel.sections.length,
      });

      return {
        documentId: doc.id,
        packetSourceId: packetSource.id,
        packetType: packetSource.packetType,
        packetVersion: packetSource.packetVersion,
        locale: packetSource.locale,
        templateVersionId: packetSource.templateVersionId,
        sourceHashSha256: packetSource.sourceHashSha256,
        renderedHashSha256: packetSource.renderedHashSha256,
        generatedAt: packetSource.generatedAt,
        finalizedAt: packetSource.finalizedAt,
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      this.logger.error(
        JSON.stringify({
          route: "documents/registration-packets",
          requestId: requestId || null,
          event: "create_unexpected_error",
          errorName: err instanceof Error ? err.name : "Error",
          message: err instanceof Error ? err.message : String(err),
          packetType: structuredModel.packetType,
          hasPatientId: !!patientId,
          hasFacility: !!structuredModel.facility,
          hasSections: structuredModel.sections.length > 0,
          hasSignatures: structuredModel.signatures.length > 0,
        }),
      );
      throw new InternalServerErrorException("Unable to save registration packet");
    }
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

  async renderPdfFromSource(
    sourceJson: StructuredPacketModel,
    branding?: ResolvedPacketTheme,
  ): Promise<Buffer> {
    const signatures = Array.isArray(sourceJson.signatures) ? sourceJson.signatures : [];
    const sections = Array.isArray(sourceJson.sections) ? sourceJson.sections : [];
    const sigData = signatures.find((s) => s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE") || signatures[0];
    const staffSig = signatures.find((s) => s.signerType === "STAFF");
    const facilityName =
      sourceJson.facility?.name?.trim() || branding?.facilityName?.trim() || undefined;

    const chrome = packetPdfChrome(sourceJson.locale);
    return this.packetPdfService.generate({
      template: sourceJson.packetType,
      templateLabel: chrome.registrationPackage,
      packetTitle: chrome.registrationPackage,
      packetSubtypeLabel: packetPdfSubtypeLabel(sourceJson.packetType, sourceJson.locale),
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
      insurance: Array.isArray(sourceJson.insurance) ? sourceJson.insurance : [],
      sections: sections.map((s) => ({
        key: s.id,
        label: s.title,
        /** Prefer fullBody for PDF; body remains the durable full-text field. */
        content: (s.fullBody && s.fullBody.trim()) || s.body,
        conciseSummary: s.conciseSummary,
        sourceLabel: s.sourceLabel,
        sourceUrl: s.sourceUrl,
        contentVersion: s.contentVersion,
      })),
      signatures: {
        signerName: sigData?.signerName || "—",
        signerRelationship: sigData?.relationship || "—",
        signedAt: sigData?.signedAt || "—",
        staffName: staffSig?.signerName || "—",
        staffSignedAt: staffSig?.signedAt || "—",
        refusalReason: sigData?.refusalReason,
        patientStrokes: sigData?.patientStrokes as SignatureVectorLike | undefined,
        staffStrokes: staffSig?.staffStrokes as SignatureVectorLike | undefined,
        patientAttestation: sigData?.attestation,
        staffAttestation: staffSig?.attestation,
      },
      facilityName,
      generatedAt: safeGeneratedAtIso(sourceJson.generatedAt),
      packetVersion: sourceJson.packetVersion || "1.0",
      locale: sourceJson.locale || "en",
      patientMrn: sourceJson.patient?.mrn || undefined,
      encounterNumber: sourceJson.encounter?.number || undefined,
      branding: branding
        ? {
            logoUrl: branding.logoUrl,
            addressLine: branding.addressLine,
            phone: branding.phone,
            footer: branding.footer,
            legalNotice: branding.legalNotice,
          }
        : undefined,
    });
  }

  /**
   * Template-driven create path: render from published template + answers,
   * then reuse the existing packet lifecycle (PDF → EnterpriseDocument → PacketSource).
   */
  async createPacketFromTemplate(params: {
    patientId: string;
    facilityId: string;
    encounterId?: string;
    createdById?: string;
    title?: string;
    requestId?: string;
    templateCode: string;
    templateVersion?: string;
    locale: string;
    patient: StructuredPacketModel["patient"];
    insurance?: StructuredPacketModel["insurance"];
    answers?: PacketAnswerInput[];
    contextFlags?: PacketConditionContext;
    signatures?: StructuredPacketModel["signatures"];
    attestations?: string[];
    facility?: { id?: string; name?: string; addressLine?: string; phone?: string } | null;
  }) {
    const rendered = await this.templateEngine.renderStructuredModel({
      templateCode: params.templateCode,
      templateVersion: params.templateVersion || "1.0",
      locale: params.locale,
      facility: params.facility ?? { id: params.facilityId },
      patient: params.patient,
      encounter: params.encounterId ? { id: params.encounterId } : null,
      insurance: params.insurance,
      answers: params.answers,
      contextFlags: params.contextFlags,
      signatures: params.signatures,
      attestations: params.attestations,
    });

    return this.createPacketSource({
      structuredModel: rendered.model,
      patientId: params.patientId,
      facilityId: params.facilityId,
      encounterId: params.encounterId,
      createdById: params.createdById,
      title: params.title,
      requestId: params.requestId,
      branding: rendered.theme,
      templateVersionId: rendered.templateVersionId,
    }).then(async (created) => {
      if (params.answers?.length) {
        await this.templateEngine.persistAnswers({
          packetSourceId: created.packetSourceId,
          answers: params.answers,
          fieldIdByKey: rendered.fieldIdByKey,
        });
      }
      return created;
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
      include: {
        document: {
          select: {
            facilityId: true,
            signatureStatus: true,
            lockedAt: true,
            fileName: true,
          },
        },
      },
    });
    if (!source) throw new NotFoundException("Packet source not found");

    if (facilityId && source.document.facilityId && source.document.facilityId !== facilityId) {
      throw new ForbiddenException("Access denied");
    }

    if (source.finalizedAt) {
      throw new ForbiddenException("Packet already finalized");
    }

    const now = new Date();
    const dbSignatures = await this.prisma.enterpriseDocumentSignature.findMany({
      where: { documentId },
      orderBy: { signedAt: "asc" },
    });

    const structuredModel = mergeStoredSignaturesIntoModel(
      source.sourceJson as unknown as StructuredPacketModel,
      dbSignatures,
      now.toISOString(),
    );

    let branding: ResolvedPacketTheme | undefined;
    if (source.templateVersionId) {
      const versionRow = await this.prisma.registrationPacketTemplateVersion.findUnique({
        where: { id: source.templateVersionId },
        select: { id: true, templateId: true },
      });
      if (versionRow) {
        branding = await this.templateEngine.resolveTheme(
          versionRow.id,
          versionRow.templateId,
          source.facilityId || facilityId,
          structuredModel.locale || "en",
        );
      }
    }

    // Re-render PDF with canonical DB signature vectors, then hash after embedding.
    const pdfBuffer = await this.renderPdfFromSource(structuredModel, branding);
    const renderedHashSha256 = hashPdfBytes(pdfBuffer);

    await this.documentsService.replaceFileContent({
      documentId,
      facilityId,
      fileName: source.document.fileName || "registration-packet.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    await this.prisma.enterpriseDocumentPacketSource.update({
      where: { documentId },
      data: {
        finalizedAt: now,
        renderedHashSha256,
        sourceJson: structuredModel as unknown as object,
      },
    });

    const isRefusal = dbSignatures.some(
      (s) =>
        (s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE") &&
        (s.signatureData as { refusal?: boolean } | null)?.refusal === true,
    );

    await this.prisma.enterpriseDocument.update({
      where: { id: documentId },
      data: {
        signatureStatus: isRefusal ? "REFUSED" : "COMPLETED",
        lockedAt: now,
        lockedById: userId || null,
        checksumSha256: renderedHashSha256,
      },
    });

    this.logger.log(`packet finalized: docId=${documentId} hash=${renderedHashSha256.slice(0, 12)}`);

    return {
      documentId,
      finalizedAt: now.toISOString(),
      locked: true,
      renderedHashSha256,
    };
  }
}

function mergeStoredSignaturesIntoModel(
  model: StructuredPacketModel,
  dbSignatures: Array<{
    signerType: string;
    signerName: string;
    relationship: string | null;
    signedAt: Date;
    attestation: string | null;
    signatureData: unknown;
  }>,
  finalizedAt: string,
): StructuredPacketModel {
  const patient = dbSignatures.find(
    (s) => s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE",
  );
  const staff = dbSignatures.find(
    (s) => s.signerType === "STAFF" || s.signerType === "WITNESS",
  );
  const refusal =
    patient &&
    typeof patient.signatureData === "object" &&
    patient.signatureData !== null &&
    (patient.signatureData as { refusal?: boolean }).refusal === true
      ? (patient.signatureData as { reason?: string }).reason
      : undefined;

  const nextSignatures: StructuredPacketSignature[] = [];
  if (patient) {
    nextSignatures.push({
      signerType: patient.signerType,
      signerName: patient.signerName,
      relationship: patient.relationship || undefined,
      signedAt: patient.signedAt.toISOString(),
      attestation: patient.attestation || undefined,
      refusalReason: refusal,
      patientStrokes: refusal ? undefined : patient.signatureData,
    });
  }
  if (staff) {
    nextSignatures.push({
      signerType: staff.signerType,
      signerName: staff.signerName,
      relationship: staff.relationship || undefined,
      signedAt: staff.signedAt.toISOString(),
      attestation: staff.attestation || undefined,
      staffStrokes: staff.signatureData,
    });
  }

  return {
    ...model,
    signatures: nextSignatures.length > 0 ? nextSignatures : model.signatures,
    finalizedAt,
  };
}
