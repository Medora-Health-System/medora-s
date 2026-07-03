import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { DocumentsService } from "./documents.service";
import { DocumentSignatureService } from "./document-signature.service";
import { PacketPdfService } from "./packet-pdf.service";
import { RoleCode } from "@prisma/client";

@Controller("documents")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly signatureService: DocumentSignatureService,
    private readonly packetPdfService: PacketPdfService,
  ) {}

  @Get()
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async list(
    @Query()
    query: {
      patientId?: string;
      encounterId?: string;
      category?: string;
      type?: string;
      status?: string;
    },
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.documentsService.list({ ...query, facilityId });
  }

  @Post("generate-packet-pdf")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK
  )
  async generatePacketPdf(
    @Body()
    body: {
      patientId: string;
      template: string;
      templateLabel: string;
      patient: any;
      insurance: any[];
      sections: { key: string; label: string; content: string }[];
      signatures: {
        signerName: string;
        signerRelationship: string;
        signedAt: string;
        staffName: string;
        staffSignedAt: string;
        refusalReason?: string;
      };
      facilityName?: string;
      title: string;
      notes?: string;
    },
    @Req() req: any,
  ) {
    if (!body.patientId) throw new BadRequestException("patientId is required");
    if (!body.template) throw new BadRequestException("template is required");

    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const generatedAt = new Date().toISOString();

    const pdfBuffer = await this.packetPdfService.generate({
      template: body.template,
      templateLabel: body.templateLabel || body.template,
      patient: body.patient || null,
      insurance: body.insurance || [],
      sections: body.sections || [],
      signatures: body.signatures,
      facilityName: body.facilityName,
      generatedAt,
    });

    const patientName = [body.patient?.firstName, body.patient?.lastName].filter(Boolean).join("_") || "Patient";
    const dateStr = generatedAt.slice(0, 10);
    const fileName = `${body.template}_Registration_Package_${patientName}_${dateStr}.pdf`;

    return this.documentsService.upload({
      patientId: body.patientId,
      facilityId,
      category: "REGISTRATION",
      type: "REGISTRATION_PACKET",
      title: body.title,
      notes: body.notes,
      source: "SYSTEM",
      uploadedById: req.user?.userId,
      file: {
        originalname: fileName,
        mimetype: "application/pdf",
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
    });
  }

  @Post("upload")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Body()
    body: {
      patientId?: string;
      encounterId?: string;
      category?: string;
      type?: string;
      title?: string;
      notes?: string;
      source?: string;
    },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException("File is required");
    if (!body.category) throw new BadRequestException("category is required");
    if (!body.type) throw new BadRequestException("type is required");

    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];

    return this.documentsService.upload({
      patientId: body.patientId,
      encounterId: body.encounterId,
      facilityId,
      category: body.category,
      type: body.type,
      title: body.title,
      notes: body.notes,
      source: body.source,
      uploadedById: req.user?.userId,
      file,
    });
  }

  @Get(":documentId/storage-health")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async storageHealth(
    @Param("documentId") documentId: string,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.documentsService.getStorageHealth(documentId, facilityId);
  }

  @Get(":documentId/download")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async download(
    @Param("documentId") documentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    const result = await this.documentsService.getFilePath(documentId, facilityId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    if (result.mimeType) res.setHeader("Content-Type", result.mimeType);

    if (result.storagePath) {
      res.sendFile(result.storagePath);
    } else if (result.buffer) {
      res.setHeader("Content-Length", result.buffer.length);
      res.end(result.buffer);
    } else {
      res.status(404).json({ message: "Document file is unavailable." });
    }
  }

  @Delete(":documentId")
  @RequireRoles(RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async remove(
    @Param("documentId") documentId: string,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.documentsService.softDelete(documentId, facilityId);
  }

  @Post(":documentId/signatures")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK
  )
  async addSignature(
    @Param("documentId") documentId: string,
    @Body()
    body: {
      signerType: string;
      signerName: string;
      signerRole?: string;
      relationship?: string;
      signatureData?: unknown;
      attestation?: string;
      refusalReason?: string;
    },
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.signatureService.addSignature({
      documentId,
      facilityId,
      signerType: body.signerType,
      signerName: body.signerName,
      signerRole: body.signerRole,
      relationship: body.relationship,
      signatureData: body.signatureData,
      attestation: body.attestation,
      refusalReason: body.refusalReason,
      ipAddress: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
      signedByUserId: req.user?.userId,
    });
  }

  @Get(":documentId/signatures")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK,
    RoleCode.BILLING
  )
  async listSignatures(
    @Param("documentId") documentId: string,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.signatureService.listSignatures(documentId, facilityId);
  }

  @Post(":documentId/finalize-signature")
  @RequireRoles(
    RoleCode.RN,
    RoleCode.PROVIDER,
    RoleCode.ADMIN,
    RoleCode.FRONT_DESK
  )
  async finalizeSignature(
    @Param("documentId") documentId: string,
    @Req() req: any,
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    return this.signatureService.finalizeSignature({
      documentId,
      facilityId,
      lockedByUserId: req.user?.userId,
    });
  }
}
