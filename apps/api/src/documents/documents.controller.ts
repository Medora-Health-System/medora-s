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
import { RoleCode } from "@prisma/client";

@Controller("documents")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
    const { storagePath, fileName, mimeType } =
      await this.documentsService.getFilePath(documentId, facilityId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    if (mimeType) res.setHeader("Content-Type", mimeType);
    res.sendFile(storagePath);
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
}
