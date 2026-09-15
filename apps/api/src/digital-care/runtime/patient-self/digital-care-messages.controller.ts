import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  PatientPortalAuthGuard,
  PatientPortalMessagingFacade,
  type PatientPortalPrincipal,
} from "../../../patient-portal/public";

type MessageCategory = "GENERAL" | "CLINICAL" | "MEDICATION" | "APPOINTMENT";

@Controller("digital-care/v1/me/conversations")
@UseGuards(PatientPortalAuthGuard)
export class DigitalCareMessagesController {
  constructor(private readonly messaging: PatientPortalMessagingFacade) {}

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

  @Get()
  list(@Query("facilityId") facilityId: string | undefined, @Req() req: any) {
    return this.messaging.listThreads(
      this.principal(req),
      this.facilityId(facilityId),
      this.context(req),
    );
  }

  @Post()
  create(
    @Query("facilityId") facilityId: string | undefined,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const input = this.parseCreate(body);
    return this.messaging.createThread(
      this.principal(req),
      this.facilityId(facilityId),
      input,
      this.context(req),
    );
  }

  @Get(":threadId")
  get(
    @Param("threadId") threadId: string,
    @Query("facilityId") facilityId: string | undefined,
    @Req() req: any,
  ) {
    return this.messaging.getThread(
      this.principal(req),
      this.facilityId(facilityId),
      threadId,
      this.context(req),
    );
  }

  @Post(":threadId/messages")
  reply(
    @Param("threadId") threadId: string,
    @Query("facilityId") facilityId: string | undefined,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const message = this.message(body);
    return this.messaging.reply(
      this.principal(req),
      this.facilityId(facilityId),
      threadId,
      { message },
      this.context(req),
    );
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
