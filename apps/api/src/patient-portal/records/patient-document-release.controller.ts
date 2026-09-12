import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { AuthGuard } from "@nestjs/passport";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { PatientDocumentReleaseService } from "./patient-document-release.service";

@Controller("patient-portal/v1/staff/documents")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientDocumentReleaseController {
  constructor(private readonly releases: PatientDocumentReleaseService) {}

  private actor(req: any) {
    const userId = req.user?.userId as string | undefined;
    const facilityId = (req.user?.facilityId || req.headers?.["x-facility-id"]) as
      | string
      | undefined;
    if (!userId) throw new UnauthorizedException("Staff identity missing");
    if (!facilityId) throw new BadRequestException("Facility is required");
    return {
      userId,
      facilityId,
      ip: req.ip as string | undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
    };
  }

  @Post(":documentId/release")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async release(@Param("documentId") documentId: string, @Req() req: any) {
    return this.releases.release(documentId, this.actor(req));
  }

  @Delete(":documentId/release")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  async revoke(@Param("documentId") documentId: string, @Req() req: any) {
    return this.releases.revoke(documentId, this.actor(req));
  }
}
