import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as path from "path";
import * as fs from "fs";

const VALID_DOCUMENT_TYPES = [
  "INSURANCE_CARD_FRONT",
  "INSURANCE_CARD_BACK",
  "PATIENT_ID",
  "CONSENT_FORM",
  "REFERRAL_PAPER",
  "OTHER_REGISTRATION",
] as const;

const UPLOAD_BASE_DIR =
  process.env.PATIENT_DOCUMENTS_DIR ||
  path.join(process.cwd(), "uploads", "patient-documents");

@Injectable()
export class PatientDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId: string, facilityId: string) {
    return this.prisma.patientDocument.findMany({
      where: { patientId, facilityId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        notes: true,
        createdAt: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async upload(
    patientId: string,
    facilityId: string,
    uploadedById: string | undefined,
    documentType: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    notes?: string,
  ) {
    if (!VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
      throw new BadRequestException(`Invalid document type: ${documentType}`);
    }

    await this.prisma.patient.findFirstOrThrow({
      where: { id: patientId, facilityId },
      select: { id: true },
    });

    const facilityDir = path.join(UPLOAD_BASE_DIR, facilityId, patientId);
    fs.mkdirSync(facilityDir, { recursive: true });

    const ext = path.extname(file.originalname) || "";
    const storedName = `${Date.now()}_${documentType}${ext}`;
    const storagePath = path.join(facilityDir, storedName);

    fs.writeFileSync(storagePath, file.buffer);

    return this.prisma.patientDocument.create({
      data: {
        patientId,
        facilityId,
        documentType,
        fileName: file.originalname,
        mimeType: file.mimetype || null,
        fileSize: file.size || null,
        storagePath,
        notes: notes?.trim() || null,
        uploadedById: uploadedById || null,
      },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        notes: true,
        createdAt: true,
      },
    });
  }

  async getFilePath(documentId: string, facilityId: string) {
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id: documentId, facilityId },
    });
    if (!doc) throw new NotFoundException("Document not found");
    if (!fs.existsSync(doc.storagePath)) {
      throw new NotFoundException("File not found on disk");
    }
    return { storagePath: doc.storagePath, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async remove(documentId: string, facilityId: string) {
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id: documentId, facilityId },
    });
    if (!doc) throw new NotFoundException("Document not found");

    try {
      if (fs.existsSync(doc.storagePath)) {
        fs.unlinkSync(doc.storagePath);
      }
    } catch {
      /* best-effort disk cleanup */
    }

    await this.prisma.patientDocument.delete({ where: { id: documentId } });
    return { deleted: true };
  }
}
