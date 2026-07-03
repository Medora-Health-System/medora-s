import {
  Injectable,
  BadRequestException,
  NotFoundException,
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

const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const STORAGE_DIR =
  process.env.MEDORA_DOCUMENT_STORAGE_DIR || "/tmp/medora-documents";

@Injectable()
export class DocumentsService {
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
    if (!VALID_CATEGORIES.includes(params.category as typeof VALID_CATEGORIES[number])) {
      throw new BadRequestException(`Invalid category: ${params.category}`);
    }
    if (!params.type?.trim()) {
      throw new BadRequestException("Document type is required");
    }

    const { file } = params;
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))) {
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
    fs.mkdirSync(targetDir, { recursive: true });

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(sanitizedName) || "";
    const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const storagePath = path.join(targetDir, storedName);

    fs.writeFileSync(storagePath, file.buffer);

    const checksumSha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");

    return this.prisma.enterpriseDocument.create({
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
