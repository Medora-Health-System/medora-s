import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request } from "express";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ErProcedureCatalogImportService } from "./er-procedure-catalog-import.service";
import { erProcedureCatalogCommitBodySchema } from "./dto/er-procedure-catalog-import.dto";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";

const ER_PROCEDURE_IMPORT_ROLES = [
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.PHARMACY,
  RoleCode.BILLING,
] as const;

function facilityIdFromReq(req: {
  user?: { facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  return typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : undefined;
}

function pickFormField(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

@Controller("medication-master/er-procedure-catalog")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ErProcedureCatalogImportController {
  constructor(private readonly importService: ErProcedureCatalogImportService) {}

  @Post("dry-run")
  @RequireRoles(...ER_PROCEDURE_IMPORT_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  )
  async dryRun(
    @UploadedFile()
    file: { buffer?: Buffer; originalname?: string } | undefined
  ) {
    const buffer = this.requireUpload(file);
    return this.importService.dryRun(buffer, file!.originalname ?? "upload");
  }

  @Post("commit")
  @RequireRoles(...ER_PROCEDURE_IMPORT_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  )
  async commit(
    @UploadedFile()
    file: { buffer?: Buffer; originalname?: string } | undefined,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string }; body?: Record<string, unknown> }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const formBody = { ...(req.body ?? {}), ...body };
    const parsed = erProcedureCatalogCommitBodySchema.safeParse({
      facilityId: pickFormField(formBody, "facilityId"),
      note: pickFormField(formBody, "note") ?? "",
      confirmOrderingOnly: pickFormField(formBody, "confirmOrderingOnly") === "true",
      confirmBillingOff: pickFormField(formBody, "confirmBillingOff") === "true",
      confirmInventoryOff: pickFormField(formBody, "confirmInventoryOff") === "true",
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const buffer = this.requireUpload(file);
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.importService.commit(
      buffer,
      file!.originalname ?? "upload",
      parsed.data,
      userId,
      facilityIdFromReq(req),
      { ip, userAgent: ua }
    );
  }

  private requireUpload(file: { buffer?: Buffer; originalname?: string } | undefined): Buffer {
    if (!file?.buffer?.length) {
      throwInventoryImportError({
        code: "MISSING_FILE",
        message: "Fichier requis (.csv ou .xlsx).",
      });
    }
    return file.buffer;
  }
}
