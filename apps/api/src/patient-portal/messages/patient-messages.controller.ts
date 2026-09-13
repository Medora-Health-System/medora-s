import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import {
  createPatientMessageThreadSchema,
  patientMessageReplySchema,
} from "./patient-messages.schemas";
import { PatientMessagesService } from "./patient-messages.service";

@Controller("patient/v1/facilities/:facilityId/messages")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientMessagesController {
  constructor(private readonly messages: PatientMessagesService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  private requestContext(req: any) {
    return {
      ip: req.ip as string | undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
    };
  }

  @Get("threads")
  async listThreads(@Req() req: any) {
    return this.messages.listPatientThreads(this.access(req), this.requestContext(req));
  }

  @Post("threads")
  async createThread(@Body() body: unknown, @Req() req: any) {
    const parsed = createPatientMessageThreadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid secure message payload", {
        cause: parsed.error,
      });
    }
    return this.messages.createPatientThread(
      this.access(req),
      parsed.data,
      this.requestContext(req),
    );
  }

  @Get("threads/:threadId")
  async getThread(@Param("threadId") threadId: string, @Req() req: any) {
    return this.messages.getPatientThread(
      this.access(req),
      threadId,
      this.requestContext(req),
    );
  }

  @Post("threads/:threadId/messages")
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
    return this.messages.replyAsPatient(
      this.access(req),
      threadId,
      parsed.data,
      this.requestContext(req),
    );
  }
}
