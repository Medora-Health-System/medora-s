import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { z } from "zod";
import { FhirMachineIdentityService } from "../fhir/fhir-machine-identity.service";
import { AdminIntegrationsService } from "./admin-integrations.service";
import { integrationInputSchema, integrationPatchSchema } from "./dto/admin-integration.dto";
import { PlatformIntegrationAdminGuard } from "./platform-integration-admin.guard";

const clientProvisionSchema = z.object({
  facilityId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(160).optional(),
  sourceSystemIdentifier: z.string().trim().min(1).max(160).optional(),
  scopes: z.array(z.string().min(1).max(100)).min(1).optional(),
  credentialExpiresAt: z.string().datetime().optional(),
}).strict();
const credentialRotateSchema = z.object({ expiresAt: z.string().datetime().optional() }).strict();
const credentialTestSchema = z.object({ clientId: z.string().uuid(), keyId: z.string().min(4).max(96), clientSecret: z.string().min(32).max(512), facilityId: z.string().uuid() }).strict();

@Controller("admin/integrations")
@UseGuards(AuthGuard("jwt"), PlatformIntegrationAdminGuard)
export class AdminIntegrationsController {
  constructor(private readonly service: AdminIntegrationsService, private readonly machines: FhirMachineIdentityService) {}
  @Get("permission-options") permissions(@Req() req: any) { return this.service.authorize(req.user.userId).then(() => this.service.permissions()); }
  @Get("facility-options") facilities(@Req() req: any) { return this.service.facilityOptions(req.user.userId); }
  @Get("connection-info") async connectionInfo(@Req() req: any) { await this.service.authorize(req.user.userId); return this.machines.connectionInfo(); }
  @Get() list(@Req() req: any) { return this.service.list(req.user.userId); }
  @Get(":id") get(@Req() req: any, @Param("id") id: string) { return this.service.get(req.user.userId, id); }
  @Post() create(@Req() req: any, @Body() body: unknown) { const parsed = integrationInputSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.service.create(req.user.userId, parsed.data); }
  @Patch(":id") update(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const parsed = integrationPatchSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.service.update(req.user.userId, id, parsed.data); }
  @Post(":id/disable") disable(@Req() req: any, @Param("id") id: string) { return this.service.setEnabled(req.user.userId, id, false); }
  @Post(":id/enable") enable(@Req() req: any, @Param("id") id: string) { return this.service.setEnabled(req.user.userId, id, true); }

  @Get(":id/clients") async clients(@Req() req: any, @Param("id") id: string) { await this.service.authorize(req.user.userId); return this.machines.listClients(id); }
  @Post(":id/clients") async provisionClient(@Req() req: any, @Param("id") id: string, @Body() body: unknown) {
    await this.service.authorize(req.user.userId);
    const parsed = clientProvisionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.machines.provisionClient(req.user.userId, id, parsed.data);
  }
  @Post(":id/clients/:clientId/credentials/rotate") async rotateCredential(@Req() req: any, @Param("id") id: string, @Param("clientId") clientId: string, @Body() body: unknown) {
    await this.service.authorize(req.user.userId);
    const parsed = credentialRotateSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.machines.rotateCredential(req.user.userId, id, clientId, parsed.data);
  }
  @Post(":id/clients/:clientId/revoke") async revokeClient(@Req() req: any, @Param("id") id: string, @Param("clientId") clientId: string) {
    await this.service.authorize(req.user.userId);
    return this.machines.revokeClient(req.user.userId, id, clientId);
  }
  @Post(":id/test-connection") async testConnection(@Req() req: any, @Param("id") id: string, @Body() body: unknown) {
    await this.service.authorize(req.user.userId);
    await this.service.get(req.user.userId, id);
    const parsed = credentialTestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.machines.testCredentials(parsed.data);
  }
}
