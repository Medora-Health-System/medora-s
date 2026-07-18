import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Phase16FeedbackType, Phase16RecommendationLifecycle } from "@medora/shared";
import type { RecommendationActor } from "./medication-recommendation.types";
import {
  captureRecommendationAnalytics,
  getPhase16Readiness,
  getRecommendationEvidence,
  getRecommendationExplanation,
  getRecommendationGovernanceDashboard,
  getRecommendationHistory,
  listRecommendations,
  promoteWave1DraftsToShadow,
  runShadowRecommendationEvaluation,
  seedRecommendationCandidatesFromShadow,
  submitExpertReview,
  submitProviderFeedback,
  transitionRecommendationLifecycle,
} from "./medication-recommendation.service";

@Injectable()
export class MedicationRecommendationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getRecommendationGovernanceDashboard(this.prisma);
  }

  readiness() {
    return getPhase16Readiness(this.prisma);
  }

  analytics(actor?: RecommendationActor) {
    return captureRecommendationAnalytics(this.prisma, actor);
  }

  list(opts?: {
    exposableOnly?: boolean;
    familyKey?: string;
    lifecycleStatus?: string;
  }) {
    return listRecommendations(this.prisma, opts);
  }

  explanation(id: string) {
    return getRecommendationExplanation(this.prisma, id);
  }

  evidence(id: string) {
    return getRecommendationEvidence(this.prisma, id);
  }

  history(id: string) {
    return getRecommendationHistory(this.prisma, id);
  }

  seed(actor: RecommendationActor) {
    return seedRecommendationCandidatesFromShadow(this.prisma, actor);
  }

  promoteToShadow(actor: RecommendationActor) {
    return promoteWave1DraftsToShadow(this.prisma, actor);
  }

  transition(
    actor: RecommendationActor,
    body: {
      definitionId: string;
      toStatus: Phase16RecommendationLifecycle;
      reason: string;
    }
  ) {
    return transitionRecommendationLifecycle(this.prisma, actor, body);
  }

  review(
    actor: RecommendationActor,
    body: {
      definitionId: string;
      decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "DEFERRED";
      rationale: string;
      promoteToShadow?: boolean;
    }
  ) {
    return submitExpertReview(this.prisma, actor, body);
  }

  shadowEvaluate(
    actor: RecommendationActor,
    body: {
      facilityId: string;
      patientId?: string;
      encounterId?: string;
      familyKeys?: string[];
    }
  ) {
    return runShadowRecommendationEvaluation(this.prisma, actor, body);
  }

  feedback(
    actor: RecommendationActor,
    body: {
      definitionId: string;
      facilityId: string;
      feedbackType: Phase16FeedbackType;
      evaluationId?: string;
      encounterId?: string;
      overrideReason?: string;
      notes?: string;
    }
  ) {
    return submitProviderFeedback(this.prisma, actor, body);
  }
}
