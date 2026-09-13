import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { patientMessageReplySchema } from "./patient-messages.schemas";
import {
  PatientMessagesService,
  type PatientPortalStaffMessagingActor,
} from "./patient-messages.service";

@Controller("patient-portal/v1/staff/messages")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientMessagesStaffController {
  constructor(private readonly messages: PatientMessagesService) {}

  private actor(req: any): PatientPortalStaffMessagingActor {
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

  @Get("threads")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN)
  async listThreads(@Req() req: any) {
    return this.messages.listStaffThreads(this.actor(req));
  }

  @Get("threads/:threadId")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN)
  async getThread(@Param("threadId") threadId: string, @Req() req: any) {
    return this.messages.getStaffThread(this.actor(req), threadId);
  }

  @Post("threads/:threadId/messages")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN)
  async reply(
    @Param("threadId") threadId: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const parsed = patientMessageReplySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid secure message payload", {
        cause: parsed.error,
      });
    }
    return this.messages.replyAsStaff(this.actor(req), threadId, parsed.data);
  }

  @Post("threads/:threadId/close")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN)
  async close(@Param("threadId") threadId: string, @Req() req: any) {
    return this.messages.closeAsStaff(this.actor(req), threadId);
  }
}
