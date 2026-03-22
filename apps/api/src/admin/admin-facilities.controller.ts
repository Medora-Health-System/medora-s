import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { createFacilityDtoSchema } from "@medora/shared";
import { AdminFacilitiesService } from "./admin-facilities.service";

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminFacilitiesController {
  constructor(private readonly facilities: AdminFacilitiesService) {}

  @Post("facilities")
  @RequireRoles(RoleCode.ADMIN)
  async create(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    const parsed = createFacilityDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.facilities.create(parsed.data.name, req.user.userId);
  }

  @Get("facilities")
  @RequireRoles(RoleCode.ADMIN)
  async list() {
    return this.facilities.list();
  }
}
