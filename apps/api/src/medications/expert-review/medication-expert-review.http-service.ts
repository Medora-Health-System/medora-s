import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  calculateFamilyQualityScores,
  completeClinicalDomainReviews,
  completeSafetyDomainReviews,
  createOrGetExpertReviewBatch,
  getExpertReviewDashboard,
  listReviewConflicts,
  qualifyWave1ForShadow,
  resolveReviewConflict,
  runCrossDomainValidation,
  runPhase14BPipeline,
  seedDomainReviews,
  type ErActor,
} from "./medication-expert-review.service";

@Injectable()
export class MedicationExpertReviewHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getExpertReviewDashboard(this.prisma);
  }

  createBatch(actor: ErActor) {
    return createOrGetExpertReviewBatch(this.prisma, actor);
  }

  seed(actor: ErActor) {
    return seedDomainReviews(this.prisma, actor);
  }

  clinicalReview(actor: ErActor) {
    return completeClinicalDomainReviews(this.prisma, actor);
  }

  safetyReview(actor: ErActor) {
    return completeSafetyDomainReviews(this.prisma, actor);
  }

  consistency(actor: ErActor) {
    return runCrossDomainValidation(this.prisma, actor);
  }

  quality(actor: ErActor) {
    return calculateFamilyQualityScores(this.prisma, actor);
  }

  qualifyShadow(actor: ErActor) {
    return qualifyWave1ForShadow(this.prisma, actor);
  }

  pipeline(actor: ErActor) {
    return runPhase14BPipeline(this.prisma, actor);
  }

  conflicts() {
    return listReviewConflicts(this.prisma);
  }

  resolveConflict(id: string, notes: string, actor: ErActor) {
    return resolveReviewConflict(this.prisma, actor, id, notes);
  }
}
