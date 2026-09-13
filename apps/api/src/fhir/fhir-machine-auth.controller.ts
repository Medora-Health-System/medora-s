import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { FhirDeploymentGuard } from "./fhir-context.guard";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";

const tokenRequestSchema = z.object({
  grant_type: z.literal("client_credentials").default("client_credentials"),
  client_id: z.string().uuid(),
  key_id: z.string().min(4).max(96),
  client_secret: z.string().min(32).max(512),
  facility_id: z.string().uuid(),
  scope: z.union([z.string(), z.array(z.string())]).optional(),
}).strict();

@Controller("fhir/auth")
@UseGuards(FhirDeploymentGuard)
export class FhirMachineAuthController {
  constructor(private readonly identities: FhirMachineIdentityService) {}

  @Post("token")
  async token(@Body() body: unknown) {
    const parsed = tokenRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid machine token request");
    const scopes = Array.isArray(parsed.data.scope)
      ? parsed.data.scope
      : parsed.data.scope?.split(/\s+/).map((value) => value.trim()).filter(Boolean);
    return this.identities.issueToken({
      clientId: parsed.data.client_id,
      keyId: parsed.data.key_id,
      clientSecret: parsed.data.client_secret,
      facilityId: parsed.data.facility_id,
      scopes,
    });
  }
}
