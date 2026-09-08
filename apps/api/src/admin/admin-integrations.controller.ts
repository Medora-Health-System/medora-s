import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminIntegrationsService } from "./admin-integrations.service";
import { integrationInputSchema, integrationPatchSchema } from "./dto/admin-integration.dto";

@Controller("admin/integrations")
@UseGuards(AuthGuard("jwt"))
export class AdminIntegrationsController {
  constructor(private readonly service: AdminIntegrationsService) {}
  @Get("permission-options") permissions(@Req() req: any) { return this.service.authorize(req.user.userId).then(() => this.service.permissions()); }
  @Get() list(@Req() req: any) { return this.service.list(req.user.userId); }
  @Get(":id") get(@Req() req: any, @Param("id") id: string) { return this.service.get(req.user.userId, id); }
  @Post() create(@Req() req: any, @Body() body: unknown) { const parsed = integrationInputSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.service.create(req.user.userId, parsed.data); }
  @Patch(":id") update(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const parsed = integrationPatchSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.service.update(req.user.userId, id, parsed.data); }
  @Post(":id/disable") disable(@Req() req: any, @Param("id") id: string) { return this.service.setEnabled(req.user.userId, id, false); }
  @Post(":id/enable") enable(@Req() req: any, @Param("id") id: string) { return this.service.setEnabled(req.user.userId, id, true); }
}
