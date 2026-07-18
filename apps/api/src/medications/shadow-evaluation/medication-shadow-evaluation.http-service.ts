import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  analyzeSyntheticShadowBatch,
  certifySyntheticShadowBatch,
  classifyFindingReview,
  createOrGetSyntheticShadowBatch,
  deterministicRerunSyntheticShadow,
  executeSyntheticShadowBatch,
  getSyntheticShadowDashboard,
  runPhase14BSyntheticPipeline,
  validateSyntheticShadowBatch,
  type SeActor,
} from "./medication-shadow-evaluation.service";

@Injectable()
export class MedicationShadowEvaluationHttpService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getSyntheticShadowDashboard(this.prisma);
  }

  createBatch(actor: SeActor) {
    return createOrGetSyntheticShadowBatch(this.prisma, actor);
  }

  validate(actor: SeActor) {
    return validateSyntheticShadowBatch(this.prisma, actor);
  }

  execute(actor: SeActor) {
    return executeSyntheticShadowBatch(this.prisma, actor);
  }

  analyze(actor: SeActor) {
    return analyzeSyntheticShadowBatch(this.prisma, actor);
  }

  certify(actor: SeActor) {
    return certifySyntheticShadowBatch(this.prisma, actor);
  }

  determinism(actor: SeActor) {
    return deterministicRerunSyntheticShadow(this.prisma, actor);
  }

  pipeline(actor: SeActor) {
    return runPhase14BSyntheticPipeline(this.prisma, actor);
  }

  classify(
    findingResultId: string,
    classification: string,
    rationale: string,
    actor: SeActor
  ) {
    return classifyFindingReview(
      this.prisma,
      actor,
      findingResultId,
      classification,
      rationale
    );
  }
}
