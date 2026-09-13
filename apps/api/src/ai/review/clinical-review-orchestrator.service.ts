import { Inject, Injectable, Logger } from "@nestjs/common";
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
import { buildStableSuggestionId } from "./review.utils.js";

const EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION = `You are Medora Assist, a structured clinical chart-review assistant. Review only the supplied encounter facts and evaluate the chart section by section.

Review these domains whenever data is available:
1. Presentation and documentation: chief complaint, HPI/ROS/exam/reassessment, provider documentation, MDM completeness and internal consistency.
2. Diagnostics: laboratory/imaging/procedure orders, pending tests, results, result follow-up, and whether documented MDM reconciles important available findings.
3. Treatment and medications: active medication orders, administrations, duplication, documented treatment response, and medication-safety/documentation concerns supported by the supplied facts.
4. Diagnoses: documented diagnoses and consistency with the recorded assessment; never invent a diagnosis.
5. Disposition/discharge: discharge documentation, pending diagnostics, reassessment, follow-up, and discharge-medication/documentation considerations supported by the supplied facts.

You may identify a diagnostic, laboratory, medication, treatment, reassessment, or follow-up consideration for clinician review only when it is supported by the supplied chart facts and you explain the evidence. A consideration is not an order or prescription. Never automatically place, imply that Medora placed, or execute an order; never prescribe a dose; never state that a test or medication is mandatory when the supplied facts do not establish that. Distinguish clearly between "not documented" and "clinically inconsistent/needs review."

Return only the requested structured suggestions. Do not autonomously diagnose, modify documentation, fabricate facts, infer unsupported payer/coding rules, or recommend services for reimbursement. Do not provide CPT/E&M/payer/reimbursement advice. Every suggestion is advisory and requires clinician review. Evidence must come only from the supplied payload. Recommended actions may only ask the clinician to REVIEW or NAVIGATE to an existing chart section.`;

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

      const currentSnapshot = await this.snapshotBuilder.build(input);
      if (currentSnapshot.snapshotVersion !== initialSnapshot.snapshotVersion) {
        this.logger.warn("Encounter changed during external clinical AI review; stale result discarded");
        return this.deterministicReview.run(currentSnapshot);
      }

      const generatedAt = new Date().toISOString();
      const externalSuggestions: AiSuggestion[] = parsedExternal.data.suggestions.map((suggestion) => ({
        id: buildStableSuggestionId({
          snapshotVersion: initialSnapshot.snapshotVersion,
          source: this.modelProvider.providerName,
          category: suggestion.category,
          title: suggestion.title,
        }),
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
