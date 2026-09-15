import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";
import type {
  CreatePatientMessageThreadInput,
  PatientMessageReplyInput,
} from "../messages/patient-messages.schemas";
import { PatientMessagesService } from "../messages/patient-messages.service";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";

type RequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class PatientPortalMessagingFacade {
  constructor(
    private readonly repository: PatientPortalRepository,
    private readonly messages: PatientMessagesService,
  ) {}

  private async access(
    principal: PatientPortalPrincipal,
    facilityId: string,
  ) {
    const normalizedFacilityId = facilityId?.trim();
    if (!normalizedFacilityId) {
      throw new BadRequestException("facilityId is required");
    }

    const link = await this.repository.findVerifiedFacilityLink(
      principal.portalAccountId,
      normalizedFacilityId,
    );
    if (!link) {
      throw new NotFoundException("Messaging facility not found");
    }

    return {
      portalAccountId: principal.portalAccountId,
      sessionId: principal.sessionId,
      patientId: link.patientId,
      facilityId: link.facilityId,
    };
  }

  async listThreads(
    principal: PatientPortalPrincipal,
    facilityId: string,
    context: RequestContext,
  ) {
    return this.messages.listPatientThreads(
      await this.access(principal, facilityId),
      context,
    );
  }

  async createThread(
    principal: PatientPortalPrincipal,
    facilityId: string,
    input: CreatePatientMessageThreadInput,
    context: RequestContext,
  ) {
    return this.messages.createPatientThread(
      await this.access(principal, facilityId),
      input,
      context,
    );
  }

  async getThread(
    principal: PatientPortalPrincipal,
    facilityId: string,
    threadId: string,
    context: RequestContext,
  ) {
    return this.messages.getPatientThread(
      await this.access(principal, facilityId),
      threadId,
      context,
    );
  }

  async reply(
    principal: PatientPortalPrincipal,
    facilityId: string,
    threadId: string,
    input: PatientMessageReplyInput,
    context: RequestContext,
  ) {
    return this.messages.replyAsPatient(
      await this.access(principal, facilityId),
      threadId,
      input,
      context,
    );
  }
}
