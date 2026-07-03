import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import { DocumentStorageService } from "./storage";

const VALID_CATEGORIES = [
  "REGISTRATION",
  "EMERGENCY",
  "CLINICAL",
  "BILLING",
  "LEGAL",
  "ADMINISTRATIVE",
  "OTHER",
] as const;

const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats", "text/"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: DocumentStorageService,
  ) {}

  async list(filters: {
    patientId?: string;
    encounterId?: string;
    facilityId?: string;
    category?: string;
    type?: string;
    status?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.encounterId) where.encounterId = filters.encounterId;
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.category) where.category = filters.category;
    if (filters.type) where.type = filters.type;
    where.status = filters.status || "ACTIVE";

    return this.prisma.enterpriseDocument.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        patientId: true,
        encounterId: true,
        facilityId: true,
        category: true,
        type: true,
        status: true,
        title: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        pageCount: true,
        source: true,
        notes: true,
        signatureStatus: true,
        lockedAt: true,
        uploadedAt: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        packetSource: {
          select: {
            packetType: true,
            packetVersion: true,
            locale: true,
            sourceHashSha256: true,
            renderedHashSha256: true,
            generatedAt: true,
            finalizedAt: true,
          },
        },
      },
    });
  }

  async upload(params: {
    patientId?: string;
    encounterId?: string;
    facilityId?: string;
    category: string;
    type: string;
    title?: string;
    notes?: string;
    source?: string;
    uploadedById?: string;
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer };
  }) {
    this.logger.log(`document upload received: category=${params.category} type=${params.type} mime=${params.file?.mimetype} size=${params.file?.size}`);

    if (!VALID_CATEGORIES.includes(params.category as typeof VALID_CATEGORIES[number])) {
      this.logger.warn(`document upload rejected: invalid category ${params.category}`);
      throw new BadRequestException(`Invalid category: ${params.category}`);
    }
    if (!params.type?.trim()) {
      this.logger.warn("document upload rejected: missing type");
      throw new BadRequestException("Document type is required");
    }

    const { file } = params;
    if (file.size > MAX_FILE_SIZE) {
      this.logger.warn(`document upload rejected: file too large (${file.size} bytes)`);
      throw new BadRequestException(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))) {
      this.logger.warn(`document upload rejected: unsupported mime ${file.mimetype}`);
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (params.patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: params.patientId },
        select: { id: true },
      });
      if (!patient) throw new BadRequestException("Patient not found");
    }

    const checksumSha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");

    const doc = await this.prisma.enterpriseDocument.create({
      data: {
        patientId: params.patientId || null,
        encounterId: params.encounterId || null,
        facilityId: params.facilityId || null,
        category: params.category,
        type: params.type,
        title: params.title?.trim() || null,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: "",
        checksumSha256,
        source: params.source || "UPLOAD",
        notes: params.notes?.trim() || null,
        uploadedById: params.uploadedById || null,
      },
      select: {
        id: true,
        category: true,
        type: true,
        title: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        source: true,
        notes: true,
        uploadedAt: true,
      },
    });

    try {
      const saveResult = await this.storageService.save({
        documentId: doc.id,
        facilityId: params.facilityId || null,
        fileName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
      });

      await this.prisma.enterpriseDocument.update({
        where: { id: doc.id },
        data: { storagePath: saveResult.storagePath },
      });
    } catch (storageErr) {
      this.logger.error(`document storage failed: docId=${doc.id} err=${(storageErr as Error)?.message}`);
      await this.prisma.enterpriseDocument.delete({ where: { id: doc.id } });
      throw new BadRequestException("Failed to store document file");
    }

    this.logger.log(`document upload saved: id=${doc.id} category=${doc.category} type=${doc.type}`);
    return doc;
  }

  async getFilePath(documentId: string, facilityId?: string) {
    const where: Record<string, unknown> = { id: documentId, status: "ACTIVE" };
    if (facilityId) where.facilityId = facilityId;

    const doc = await this.prisma.enterpriseDocument.findFirst({ where });
    if (!doc) throw new NotFoundException("Document not found");

    const result = await this.storageService.read(doc.storagePath, documentId);
    if (result) {
      if (result.provider === "local" && doc.storagePath) {
        return { storagePath: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType, buffer: null };
      }
      return { storagePath: null, fileName: doc.fileName, mimeType: doc.mimeType, buffer: result.buffer };
    }

    this.logger.warn(`document file unavailable: docId=${documentId} storagePath=${doc.storagePath}`);
    throw new NotFoundException("Document file is unavailable. Please re-upload or contact administrator.");
  }

  async getStorageHealth(documentId: string, facilityId?: string) {
    const where: Record<string, unknown> = { id: documentId, status: "ACTIVE" };
    if (facilityId) where.facilityId = facilityId;

    const doc = await this.prisma.enterpriseDocument.findFirst({
      where,
      select: { id: true, storagePath: true },
    });
    if (!doc) return null;

    return this.storageService.getAvailability(doc.storagePath, doc.id);
  }

  async softDelete(documentId: string, facilityId?: string) {
    const where: Record<string, unknown> = { id: documentId, status: "ACTIVE" };
    if (facilityId) where.facilityId = facilityId;

    const doc = await this.prisma.enterpriseDocument.findFirst({ where });
    if (!doc) throw new NotFoundException("Document not found");

    await this.prisma.enterpriseDocument.update({
      where: { id: documentId },
      data: { status: "DELETED" },
    });

    return { deleted: true };
  }
}
