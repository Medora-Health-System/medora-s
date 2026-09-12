import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { PatientDocumentsService } from "./patient-documents.service";

const INLINE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

@Controller("patient/v1/facilities/:facilityId/documents")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientDocumentsController {
  constructor(private readonly documents: PatientDocumentsService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  private requestContext(req: any) {
    return {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    };
  }

  private safeFileName(value: string): string {
    const cleaned = value.replace(/[\r\n\0]/g, "").trim();
    return cleaned || "document";
  }

  @Get()
  async list(@Req() req: any) {
    return this.documents.listDocuments(this.access(req), this.requestContext(req));
  }

  @Get(":documentId/content")
  async content(
    @Param("documentId") documentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const result = await this.documents.getDocumentContent(
      this.access(req),
      documentId,
      this.requestContext(req),
    );

    const mimeType = result.document.mimeType || "application/octet-stream";
    const disposition = INLINE_MIME_TYPES.has(mimeType) ? "inline" : "attachment";
    const encodedName = encodeURIComponent(this.safeFileName(result.document.fileName));

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodedName}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.end(result.buffer);
  }
}
