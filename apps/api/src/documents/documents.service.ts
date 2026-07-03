import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

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

const STORAGE_DIR =
  process.env.MEDORA_DOCUMENT_STORAGE_DIR || "/tmp/medora-documents";

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(private readonly prisma: PrismaService) {}

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

    const subDir = params.facilityId || "global";
    const targetDir = path.join(STORAGE_DIR, subDir);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (dirErr) {
      this.logger.error(`document upload failed: cannot create storage dir ${targetDir}`, (dirErr as Error)?.message);
      throw new BadRequestException("Storage directory unavailable");
    }

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(sanitizedName) || "";
    const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const storagePath = path.join(targetDir, storedName);

    try {
      fs.writeFileSync(storagePath, file.buffer);
    } catch (writeErr) {
      this.logger.error(`document upload failed: cannot write file ${storagePath}`, (writeErr as Error)?.message);
      throw new BadRequestException("Failed to write file to storage");
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
        storagePath,
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
    this.logger.log(`document upload saved: id=${doc.id} category=${doc.category} type=${doc.type}`);
    return doc;
  }

  async getFilePath(documentId: string, facilityId?: string) {
    const where: Record<string, unknown> = { id: documentId, status: "ACTIVE" };
    if (facilityId) where.facilityId = facilityId;

    const doc = await this.prisma.enterpriseDocument.findFirst({ where });
    if (!doc) throw new NotFoundException("Document not found");
    if (!fs.existsSync(doc.storagePath)) {
      throw new NotFoundException("File not found on disk");
    }
    return { storagePath: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType };
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
