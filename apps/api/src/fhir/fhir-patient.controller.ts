import { Controller, Get, Header, Param, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { assertZod } from "../common/http/zod-parse";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { fhirResourceIdParamSchema } from "./dto/fhir-read.schemas";
import { FhirResourceService } from "./fhir-resource.service";

@Controller("fhir/Patient")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class FhirPatientController {
  constructor(private readonly fhirResource: FhirResourceService) {}

  /** FHIR R4 instance read: `GET [base]/Patient/{id}` */
  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async read(@Param("id") id: string, @Req() req: { user?: { userId?: string; facilityId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    const facilityId = this.facilityId(req);
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const validId = assertZod(fhirResourceIdParamSchema.safeParse(id));
    return this.fhirResource.readPatient(facilityId, validId, req.user?.userId, req.ip, this.ua(req));
  }

  private ua(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
    const h = req.headers?.["user-agent"];
    return typeof h === "string" ? h : Array.isArray(h) ? h[0] : undefined;
  }

  private facilityId(req: {
    user?: { facilityId?: string };
    headers?: Record<string, string | string[] | undefined>;
  }): string | undefined {
    const raw = req.user?.facilityId ?? req.headers?.["x-facility-id"];
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  }
}
