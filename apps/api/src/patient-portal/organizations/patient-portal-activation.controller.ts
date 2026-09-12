import { BadRequestException, Body, Controller, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { PatientPortalActivationService } from "./patient-portal-activation.service";

const activationBodySchema = z.object({
  accountId: z.string().uuid(),
  password: z.string().min(1).max(256),
  activationCode: z.string().trim().min(10).max(512),
});

@Controller("patient/v1/organizations")
export class PatientPortalActivationController {
  constructor(private readonly activation: PatientPortalActivationService) {}

  @Post("activate")
  async activate(@Body() body: unknown, @Req() req: any) {
    const parsed = activationBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid activation payload", { cause: parsed.error });
    }
    return this.activation.activate({
      ...parsed.data,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
