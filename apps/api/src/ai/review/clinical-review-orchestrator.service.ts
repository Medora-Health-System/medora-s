import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AiClinicalReviewOutput, type AiSuggestion } from "@medora/shared";
import { AiFeatureFlagsService } from "../core/ai-feature-flags.service.js";
import type { AiModelProvider } from "../providers/ai-model-provider.interface.js";
import { AI_MODEL_PROVIDER } from "../providers/ai-provider.tokens.js";
import { EncounterAiSnapshotBuilder } from "../snapshot/encounter-ai-snapshot.builder.js";
import type { EncounterAiSnapshotBuildInput } from "../snapshot/encounter-ai-snapshot.types.js";
import { DeterministicReviewEngine } from "./deterministic-review-engine.service.js";
import {
  EXTERNAL_CLINICAL_REVIEW_JSON_SCHEMA,
  externalClinicalReviewSchema,
} from "./external-clinical-review.contract.js";
import { buildExternalClinicalInput } from "./external-clinical-input.js";

const EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION = `You are Medora's clinical chart-review assistant. Review only the supplied encounter facts.
Return only the requested structured suggestions. Do not diagnose autonomously, place or imply orders, modify documentation, fabricate facts, infer unsupported payer/coding rules, or recommend services for reimbursement. Do not provide CPT/E&M/payer/reimbursement advice. Every suggestion is advisory and requires clinician review. Evidence must come only from the supplied payload. Recommended actions may only ask the clinician to review or navigate to an existing chart section.`;

@Injectable()
export class ClinicalReviewOrchestratorService {
  private readonly logger = new Logger(ClinicalReviewOrchestratorService.name);

  constructor(
    private readonly snapshotBuilder: EncounterAiSnapshotBuilder,
    private readonly deterministicReview: DeterministicReviewEngine,
    private readonly featureFlags: AiFeatureFlagsService,
    @Inject(AI_MODEL_PROVIDER) private readonly modelProvider: AiModelProvider
  ) {}

  async run(input: EncounterAiSnapshotBuildInput): Promise<AiClinicalReviewOutput> {
    const initialSnapshot = await this.snapshotBuilder.build(input);
    const deterministic = this.deterministicReview.run(initialSnapshot);

    if (!this.featureFlags.isFacilityEnabled(input.facilityId)) {
      return deterministic;
    }

    try {
      const providerResponse = await this.modelProvider.generateStructured({
        snapshotContext: {
          snapshotVersion: initialSnapshot.snapshotVersion,
          facilityId: input.facilityId,
          encounterId: input.encounterId,
        },
        clinicalInput: buildExternalClinicalInput(initialSnapshot),
        systemInstruction: EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION,
        responseSchemaName: "medora_clinical_chart_review",
        responseJsonSchema: EXTERNAL_CLINICAL_REVIEW_JSON_SCHEMA,
      });

      if (providerResponse.snapshotVersion !== initialSnapshot.snapshotVersion) {
        this.logger.warn("External clinical AI response snapshot mismatch; result discarded");
        return deterministic;
      }

      const parsedExternal = externalClinicalReviewSchema.safeParse(providerResponse.output);
      if (!parsedExternal.success) {
        this.logger.warn("External clinical AI output failed Medora schema validation; result discarded");
        return deterministic;
      }

      // Rebuild after the external call. If the chart changed while the model was
      // running, discard the model output and return deterministic findings for
      // the newest authorized snapshot instead of surfacing stale advice.
      const currentSnapshot = await this.snapshotBuilder.build(input);
      if (currentSnapshot.snapshotVersion !== initialSnapshot.snapshotVersion) {
        this.logger.warn("Encounter changed during external clinical AI review; stale result discarded");
        return this.deterministicReview.run(currentSnapshot);
      }

      const generatedAt = new Date().toISOString();
      const externalSuggestions: AiSuggestion[] = parsedExternal.data.suggestions.map((suggestion) => ({
        id: randomUUID(),
        category: suggestion.category,
        priority: suggestion.priority,
        title: suggestion.title,
        summary: suggestion.summary,
        reasoningSummary: suggestion.reasoningSummary,
        evidence: suggestion.evidence,
        recommendedActions: suggestion.recommendedActions,
        clinicalDisclaimer: suggestion.clinicalDisclaimer,
        source: this.modelProvider.providerName,
        generatedAt,
        snapshotVersion: initialSnapshot.snapshotVersion,
        status: "PENDING",
      }));

      const merged = this.mergeSuggestions(deterministic.suggestions, externalSuggestions);
      const validated = AiClinicalReviewOutput.safeParse({ suggestions: merged });
      if (!validated.success) {
        this.logger.warn("Merged clinical AI output failed Medora schema validation; external result discarded");
        return deterministic;
      }
      return validated.data;
    } catch {
      // External AI must never block care or hide deterministic safety findings.
      this.logger.warn("External clinical AI unavailable; returning deterministic review");
      return deterministic;
    }
  }

  private mergeSuggestions(deterministic: AiSuggestion[], external: AiSuggestion[]): AiSuggestion[] {
    const seen = new Set<string>();
    const merged: AiSuggestion[] = [];

    for (const suggestion of [...deterministic, ...external]) {
      const key = `${suggestion.category}:${suggestion.title.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(suggestion);
      if (merged.length >= 200) break;
    }

    return merged;
  }
}
