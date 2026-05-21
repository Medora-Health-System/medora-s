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
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import { ControlledCatalogImportProcedureService } from "./controlled-catalog-import-procedure.service";
import {
  controlledCatalogMedicationCommitBodySchema,
  controlledCatalogProcedureCommitBodySchema,
} from "./dto/controlled-catalog-import.dto";
import { throwInventoryImportError } from "./priority-er-inventory-import.errors";

const FACILITY_OR_PLATFORM_ADMIN_ROLES = [
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
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

function formatZodCommitError(issues: { path: (string | number)[]; message: string }[]): string {
  const first = issues[0];
  if (!first) return "Requête invalide.";
  const path = first.path.join(".");
  if (path === "facilityId") {
    return "Identifiant d'établissement invalide (UUID requis).";
  }
  if (path === "note") return "La note de gouvernance dépasse la longueur maximale.";
  return first.message;
}

@Controller("medication-master/controlled-catalog")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ControlledCatalogImportController {
  constructor(
    private readonly medicationImport: ControlledCatalogImportMedicationService,
    private readonly procedureImport: ControlledCatalogImportProcedureService
  ) {}

  @Post("medications/dry-run")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async medicationsDryRun(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined
  ) {
    const buffer = this.requireUpload(file);
    return this.medicationImport.dryRun(buffer, file!.originalname ?? "upload");
  }

  @Post("medications/commit")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async medicationsCommit(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string }; body?: Record<string, unknown> }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const formBody = { ...(req.body ?? {}), ...body };
    const parsed = controlledCatalogMedicationCommitBodySchema.safeParse({
      facilityId: pickFormField(formBody, "facilityId"),
      enableProviderOrderSearch: pickFormField(formBody, "enableProviderOrderSearch") === "true",
      confirmOrderSearchEnablement: pickFormField(formBody, "confirmOrderSearchEnablement") === "true",
      confirmMarRemainsOff: pickFormField(formBody, "confirmMarRemainsOff") === "true",
      confirmBillingRemainsOff: pickFormField(formBody, "confirmBillingRemainsOff") === "true",
      note: pickFormField(formBody, "note") ?? "",
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_COMMIT_PARAMS",
        message: formatZodCommitError(parsed.error.issues),
      });
    }

    const buffer = this.requireUpload(file);
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    const callerFacilityId = facilityIdFromReq(req);

    return this.medicationImport.commit(
      buffer,
      file!.originalname ?? "upload",
      parsed.data,
      userId,
      callerFacilityId,
      { ip, userAgent: ua }
    );
  }

  @Post("procedures/dry-run")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async proceduresDryRun(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined
  ) {
    const buffer = this.requireUpload(file);
    return this.procedureImport.dryRun(buffer, file!.originalname ?? "upload");
  }

  @Post("procedures/commit")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async proceduresCommit(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = controlledCatalogProcedureCommitBodySchema.safeParse({
      facilityId: pickFormField(body, "facilityId"),
      note: pickFormField(body, "note") ?? "",
    });
    if (!parsed.success) {
      throw new BadRequestException({
        code: "INVALID_COMMIT_PARAMS",
        message: formatZodCommitError(parsed.error.issues),
      });
    }

    const buffer = this.requireUpload(file);
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    const callerFacilityId = facilityIdFromReq(req);

    return this.procedureImport.commit(
      buffer,
      file!.originalname ?? "upload",
      parsed.data,
      userId,
      callerFacilityId,
      { ip, userAgent: ua }
    );
  }

  private requireUpload(
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined
  ): Buffer {
    if (!file?.buffer?.length) {
      throwInventoryImportError({
        code: "MISSING_FILE",
        message: "Fichier requis (.csv ou .xlsx).",
      });
    }
    return file.buffer;
  }
}
