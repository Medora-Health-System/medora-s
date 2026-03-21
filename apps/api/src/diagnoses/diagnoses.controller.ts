import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { DiagnosesService } from "./diagnoses.service";
import { updateDiagnosisDtoSchema } from "./dto";

@Controller("diagnoses")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  @Patch(":id")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const parsed = updateDiagnosisDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.diagnosesService.update(
      id,
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post(":id/resolve")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async resolve(@Param("id") id: string, @Req() req: any) {
    return this.diagnosesService.resolve(
      id,
      this.facilityId(req),
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}
