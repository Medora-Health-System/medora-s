import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  approveReviewCandidate,
  assignReviewCandidate,
  bulkReviewCandidates,
  deferReviewCandidate,
  getReviewCandidateDetail,
  getReviewDashboardMetrics,
  listReviewQueue,
  loadEmRealMappingPilotConfig,
  rejectReviewCandidate,
  retireReviewMapping,
  supersedeReviewMapping,
  type ReviewQueueFilters,
} from "./rxnorm-review-operations";
import type {
  ReviewApproveBody,
  ReviewAssignBody,
  ReviewBulkBody,
  ReviewDeferBody,
  ReviewRejectBody,
  ReviewRetireBody,
  ReviewSupersedeBody,
} from "./dto/rxnorm-review.dto";

@Injectable()
export class RxNormReviewService {
  constructor(private readonly prisma: PrismaService) {}

  listCandidates(filters: ReviewQueueFilters) {
    return listReviewQueue(this.prisma, filters);
  }

  async getCandidate(candidateId: string, actorUserId: string, actorRoleLabel?: string) {
    try {
      return await getReviewCandidateDetail(this.prisma, candidateId, {
        userId: actorUserId,
        roleLabel: actorRoleLabel,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw new NotFoundException("Candidat de revue introuvable.");
      }
      throw error;
    }
  }

  dashboard() {
    return getReviewDashboardMetrics(this.prisma);
  }

  pilotConfig() {
    return loadEmRealMappingPilotConfig();
  }

  async approve(body: ReviewApproveBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await approveReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmVerify: true,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Approbation impossible.");
    }
  }

  async reject(body: ReviewRejectBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await rejectReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmReject: true,
        rejectionReasonCategory: body.rejectionReasonCategory,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Rejet impossible.");
    }
  }

  async defer(body: ReviewDeferBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await deferReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmDefer: true,
        deferredReason: body.deferredReason,
        reviewerUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Report impossible.");
    }
  }

  async assign(body: ReviewAssignBody, actorUserId: string, actorRoleLabel?: string) {
    try {
      return await assignReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        assignedToUserId: body.assignedToUserId,
        actorUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Affectation impossible.");
    }
  }

  async retire(body: ReviewRetireBody, retiredByUserId: string, actorRoleLabel?: string) {
    try {
      return await retireReviewMapping(this.prisma, {
        verifiedMappingId: body.verifiedMappingId,
        confirmRetire: true,
        retireReason: body.retireReason,
        retiredByUserId,
        reviewerActorLabel: actorRoleLabel,
        candidateId: body.candidateId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Retrait impossible.");
    }
  }

  async supersede(body: ReviewSupersedeBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await supersedeReviewMapping(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        previousVerifiedMappingId: body.previousVerifiedMappingId,
        confirmVerify: true,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Remplacement impossible.");
    }
  }

  async bulk(body: ReviewBulkBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await bulkReviewCandidates(this.prisma, {
        action: body.action,
        items: body.items,
        reviewerUserId,
        actorRoleLabel,
        rationaleNotes: body.rationaleNotes,
        confirmBulk: true,
        rejectionReasonCategory: body.rejectionReasonCategory,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Revue en lot impossible.");
    }
  }
}
