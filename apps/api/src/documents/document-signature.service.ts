import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";
import * as fs from "fs";

const SIGNABLE_TYPES = ["REGISTRATION_PACKET"] as const;

@Injectable()
export class DocumentSignatureService {
  private readonly logger = new Logger(DocumentSignatureService.name);
  constructor(private readonly prisma: PrismaService) {}

  async addSignature(params: {
    documentId: string;
    facilityId?: string;
    signerType: string;
    signerName: string;
    signerRole?: string;
    relationship?: string;
    signatureData: unknown;
    attestation?: string;
    ipAddress?: string;
    userAgent?: string;
    signedByUserId?: string;
    refusalReason?: string;
  }) {
    const doc = await this.prisma.enterpriseDocument.findFirst({
      where: { id: params.documentId, status: "ACTIVE" },
    });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.lockedAt) throw new ForbiddenException("Document is locked and cannot be modified");
    if (!SIGNABLE_TYPES.includes(doc.type as typeof SIGNABLE_TYPES[number])) {
      throw new BadRequestException("Document type is not signable");
    }
    if (params.facilityId && doc.facilityId && doc.facilityId !== params.facilityId) {
      throw new ForbiddenException("Facility mismatch");
    }

    if (!params.signerName?.trim()) throw new BadRequestException("Signer name is required");
    if (!["PATIENT", "REPRESENTATIVE", "STAFF", "WITNESS"].includes(params.signerType)) {
      throw new BadRequestException("Invalid signer type");
    }

    const isRefusal = params.signerType === "PATIENT" && params.refusalReason;
    if (!isRefusal && (!params.signatureData || !hasStrokes(params.signatureData))) {
      throw new BadRequestException("Signature data (strokes) is required unless refusal");
    }
    if (!isRefusal && !isValidSignatureValue(params.signatureData)) {
      throw new BadRequestException("Invalid signature vector data");
    }

    const signatureRecord = await this.prisma.enterpriseDocumentSignature.create({
      data: {
        documentId: params.documentId,
        signerType: params.signerType,
        signerName: params.signerName.trim(),
        signerRole: params.signerRole?.trim() || null,
        relationship: params.relationship?.trim() || null,
        signatureData: isRefusal
          ? { refusal: true, reason: params.refusalReason }
          : (params.signatureData as object),
        attestation: params.attestation?.trim() || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent?.slice(0, 512) || null,
        signedByUserId: params.signedByUserId || null,
      },
      select: {
        id: true,
        signerType: true,
        signerName: true,
        relationship: true,
        signedAt: true,
        attestation: true,
      },
    });

    const newStatus = await this.computeSignatureStatus(params.documentId);
    await this.prisma.enterpriseDocument.update({
      where: { id: params.documentId },
      data: { signatureStatus: newStatus },
    });

    this.logger.log(`signature added: docId=${params.documentId} type=${params.signerType} status=${newStatus}`);
    return { ...signatureRecord, documentSignatureStatus: newStatus };
  }

  async listSignatures(documentId: string, facilityId?: string) {
    const doc = await this.prisma.enterpriseDocument.findFirst({
      where: { id: documentId, ...(facilityId ? { facilityId } : {}) },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException("Document not found");

    return this.prisma.enterpriseDocumentSignature.findMany({
      where: { documentId },
      orderBy: { signedAt: "asc" },
      select: {
        id: true,
        signerType: true,
        signerName: true,
        signerRole: true,
        relationship: true,
        signedAt: true,
        attestation: true,
        signatureData: true,
        signedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async finalizeSignature(params: {
    documentId: string;
    facilityId?: string;
    lockedByUserId?: string;
  }) {
    const doc = await this.prisma.enterpriseDocument.findFirst({
      where: { id: params.documentId, status: "ACTIVE" },
    });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.lockedAt) throw new ForbiddenException("Document is already locked");
    if (params.facilityId && doc.facilityId && doc.facilityId !== params.facilityId) {
      throw new ForbiddenException("Facility mismatch");
    }

    const signatures = await this.prisma.enterpriseDocumentSignature.findMany({
      where: { documentId: params.documentId },
    });

    const patientSig = signatures.find(
      (s) => s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE",
    );
    const staffSig = signatures.find(
      (s) => s.signerType === "STAFF" || s.signerType === "WITNESS",
    );

    if (!patientSig) throw new BadRequestException("Patient or representative signature is required");
    if (!staffSig) throw new BadRequestException("Staff or witness signature is required");

    let contentHash = doc.checksumSha256;
    if (!contentHash && doc.storagePath && fs.existsSync(doc.storagePath)) {
      const buffer = fs.readFileSync(doc.storagePath);
      contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    }

    const isRefusal = (patientSig.signatureData as { refusal?: boolean })?.refusal === true;

    await this.prisma.enterpriseDocument.update({
      where: { id: params.documentId },
      data: {
        signatureStatus: isRefusal ? "REFUSED" : "SIGNED",
        lockedAt: new Date(),
        lockedById: params.lockedByUserId || null,
        checksumSha256: contentHash,
      },
    });

    this.logger.log(`document finalized: docId=${params.documentId} status=${isRefusal ? "REFUSED" : "SIGNED"}`);
    return {
      locked: true,
      signatureStatus: isRefusal ? "REFUSED" : "SIGNED",
      contentHash,
    };
  }

  private async computeSignatureStatus(documentId: string): Promise<string> {
    const sigs = await this.prisma.enterpriseDocumentSignature.findMany({
      where: { documentId },
      select: { signerType: true, signatureData: true },
    });

    if (sigs.length === 0) return "UNSIGNED";

    const hasPatient = sigs.some(
      (s) => s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE",
    );
    const hasStaff = sigs.some(
      (s) => s.signerType === "STAFF" || s.signerType === "WITNESS",
    );
    const isRefusal = sigs.some(
      (s) =>
        (s.signerType === "PATIENT" || s.signerType === "REPRESENTATIVE") &&
        (s.signatureData as { refusal?: boolean })?.refusal === true,
    );

    if (isRefusal && hasStaff) return "REFUSED";
    if (hasPatient && hasStaff) return "COMPLETED";
    if (hasPatient) return "PATIENT_SIGNED";
    if (hasStaff) return "STAFF_SIGNED";
    return "IN_PROGRESS";
  }
}

export function hasStrokes(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.strokes)) return false;
  return obj.strokes.some((stroke) =>
    Array.isArray(stroke)
      ? stroke.length > 0
      : !!stroke && typeof stroke === "object" && Array.isArray((stroke as Record<string, unknown>).points) && (stroke as { points: unknown[] }).points.length > 0,
  );
}

/** Supports legacy Point[][] and the current `{ id, points }[]` signature vector shape. */
export function isValidSignatureValue(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const value = data as Record<string, unknown>;
  if (
    typeof value.width !== "number" ||
    !Number.isFinite(value.width) ||
    value.width < 1 ||
    value.width > 4000 ||
    typeof value.height !== "number" ||
    !Number.isFinite(value.height) ||
    value.height < 1 ||
    value.height > 4000 ||
    !Array.isArray(value.strokes) ||
    value.strokes.length === 0 ||
    value.strokes.length > 50
  ) return false;

  return value.strokes.every((stroke) => {
    const points = Array.isArray(stroke)
      ? stroke
      : stroke && typeof stroke === "object"
        ? (stroke as Record<string, unknown>).points
        : null;
    if (!Array.isArray(points) || points.length === 0 || points.length > 5000) return false;
    return points.every((point) => {
      if (!point || typeof point !== "object") return false;
      const p = point as Record<string, unknown>;
      const timestamp = typeof p.timestamp === "number" ? p.timestamp : p.t;
      return (
        typeof p.x === "number" && Number.isFinite(p.x) &&
        typeof p.y === "number" && Number.isFinite(p.y) &&
        typeof timestamp === "number" && Number.isFinite(timestamp) &&
        (p.pressure === undefined || (typeof p.pressure === "number" && Number.isFinite(p.pressure)))
      );
    });
  });
}
