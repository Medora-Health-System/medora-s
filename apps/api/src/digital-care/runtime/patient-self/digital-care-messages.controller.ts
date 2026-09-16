import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { FacilityConfigurationService } from "../../../facility-configuration/facility-configuration.service";
import {
  PatientPortalAuthGuard,
  PatientPortalMessagingFacade,
  type PatientPortalPrincipal,
} from "../../../patient-portal/public";

type MessageCategory = "GENERAL" | "CLINICAL" | "MEDICATION" | "APPOINTMENT";

@Controller("digital-care/v1/me/conversations")
@UseGuards(PatientPortalAuthGuard)
export class DigitalCareMessagesController {
  constructor(
    private readonly messaging: PatientPortalMessagingFacade,
    private readonly configuration: FacilityConfigurationService,
  ) {}

  private principal(req: any): PatientPortalPrincipal {
    const principal = req.patientPrincipal as PatientPortalPrincipal | undefined;
    if (!principal) throw new BadRequestException("Patient principal missing");
    return principal;
  }

  private context(req: any) {
    return {
      ip: req.ip as string | undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
    };
  }

  private facilityId(value: string | undefined): string {
    const normalized = value?.trim();
    if (!normalized) throw new BadRequestException("facilityId is required");
    return normalized;
  }

  private async requireMessagingEnabled(facilityId: string) {
    const runtime = await this.configuration.runtimeForFacility(facilityId);
    const module = runtime.modules.digitalCare;
    const enabled =
      module.enabled &&
      module.visible &&
      !module.hidden &&
      runtime.patientPortal.enabled &&
      runtime.patientPortal.messages &&
      runtime.digitalCare.secureMessaging &&
      runtime.digitalCare.patientChat;
    if (!enabled) {
      throw new ForbiddenException("Secure patient messaging is disabled for this facility.");
    }
  }

  @Get()
  async list(@Query("facilityId") facilityId: string | undefined, @Req() req: any) {
    const id = this.facilityId(facilityId);
    await this.requireMessagingEnabled(id);
    return this.messaging.listThreads(this.principal(req), id, this.context(req));
  }

  @Post()
  async create(
    @Query("facilityId") facilityId: string | undefined,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const id = this.facilityId(facilityId);
    await this.requireMessagingEnabled(id);
    const input = this.parseCreate(body);
    return this.messaging.createThread(this.principal(req), id, input, this.context(req));
  }

  @Get(":threadId")
  async get(
    @Param("threadId") threadId: string,
    @Query("facilityId") facilityId: string | undefined,
    @Req() req: any,
  ) {
    const id = this.facilityId(facilityId);
    await this.requireMessagingEnabled(id);
    return this.messaging.getThread(this.principal(req), id, threadId, this.context(req));
  }

  @Post(":threadId/messages")
  async reply(
    @Param("threadId") threadId: string,
    @Query("facilityId") facilityId: string | undefined,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const id = this.facilityId(facilityId);
    await this.requireMessagingEnabled(id);
    const message = this.message(body);
    return this.messaging.reply(this.principal(req), id, threadId, { message }, this.context(req));
  }

  private parseCreate(body: unknown): {
    category: MessageCategory;
    subject: string;
    message: string;
  } {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid secure message payload");
    }
    const record = body as Record<string, unknown>;
    const allowed: readonly MessageCategory[] = [
      "GENERAL",
      "CLINICAL",
      "MEDICATION",
      "APPOINTMENT",
    ];
    const category = record.category;
    const subject = typeof record.subject === "string" ? record.subject.trim() : "";
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (
      typeof category !== "string" ||
      !allowed.includes(category as MessageCategory) ||
      subject.length < 1 ||
      subject.length > 120 ||
      message.length < 1 ||
      message.length > 4000
    ) {
      throw new BadRequestException("Invalid secure message payload");
    }
    return { category: category as MessageCategory, subject, message };
  }

  private message(body: unknown): string {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Invalid secure message payload");
    }
    const raw = (body as Record<string, unknown>).message;
    const message = typeof raw === "string" ? raw.trim() : "";
    if (message.length < 1 || message.length > 4000) {
      throw new BadRequestException("Invalid secure message payload");
    }
    return message;
  }
}