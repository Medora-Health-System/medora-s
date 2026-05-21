import {
  BadRequestException,
  Controller,
  Post,
  Query,
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
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = controlledCatalogMedicationCommitBodySchema.safeParse({
      facilityId: query.facilityId,
      enableProviderOrderSearch: query.enableProviderOrderSearch === "true",
      confirmOrderSearchEnablement: query.confirmOrderSearchEnablement === "true",
      confirmMarRemainsOff: query.confirmMarRemainsOff === "true",
      confirmBillingRemainsOff: query.confirmBillingRemainsOff === "true",
      note: query.note ?? "",
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const buffer = this.requireUpload(file);
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.medicationImport.commit(
      buffer,
      file!.originalname ?? "upload",
      parsed.data,
      userId,
      req.user?.facilityId,
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
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = controlledCatalogProcedureCommitBodySchema.safeParse({
      facilityId: query.facilityId,
      note: query.note ?? "",
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const buffer = this.requireUpload(file);
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.procedureImport.commit(
      buffer,
      file!.originalname ?? "upload",
      parsed.data,
      userId,
      req.user?.facilityId,
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
