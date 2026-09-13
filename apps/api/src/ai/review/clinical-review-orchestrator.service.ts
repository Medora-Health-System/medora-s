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

type AiReviewLocale = "en" | "fr" | "es";

const LANGUAGE_NAME: Record<AiReviewLocale, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

const EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION = `You are Medora Assist, a strong structured clinical chart-review assistant. Review only the supplied encounter facts and evaluate the chart section by section. Do not stop after finding the first gap: independently review every domain that has usable data and return all clinically meaningful, non-duplicative findings.

Review these domains whenever data is available:
1. Presentation and documentation: chief complaint, HPI, ROS, exam, reassessment, provider documentation, MDM completeness, internal consistency, and whether assessment/plan reasoning addresses important chart facts.
2. Diagnostics and orders: laboratory, imaging and procedure orders; pending tests; available results; abnormal/critical result follow-up; duplicate or inconsistent orders; and whether important available findings are reconciled in the documented MDM. When supported by the supplied facts, you may identify a diagnostic or laboratory consideration for clinician review, but never place or require an order.
3. Treatment and medications: medication/treatment orders, administrations, duplication, order/MAR consistency, documented response or reassessment, medication safety/documentation concerns, and discharge-medication considerations supported by the supplied facts. Never prescribe or execute an order.
4. Diagnoses: documented diagnoses and consistency with the recorded assessment, results and MDM. Never invent a diagnosis or state that an undocumented diagnosis is established.
5. Disposition and discharge: disposition reasoning, discharge documentation, pending diagnostics, reassessment, follow-up, return precautions, and medication/documentation considerations supported by the supplied facts.
6. Cross-chart consistency: identify contradictions or important unresolved relationships among presentation, vitals, exam, diagnostics/results, treatment, diagnoses, MDM, reassessment and disposition. Explain exactly which supplied facts create the concern.

For each domain, distinguish clearly among: (a) missing/not documented, (b) internally inconsistent and needs review, and (c) a contextual clinical consideration supported by supplied facts. Do not manufacture a gap merely because a section is empty when the supplied facts do not establish that content is clinically indicated. Prioritize meaningful findings and avoid noisy generic alerts.

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

  async run(input: EncounterAiSnapshotBuildInput, locale: AiReviewLocale = "en"): Promise<AiClinicalReviewOutput> {
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
        systemInstruction: `${EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION}\n\nLANGUAGE REQUIREMENT: The clinician interface language is ${LANGUAGE_NAME[locale]}. Write every user-visible suggestion field in ${LANGUAGE_NAME[locale]}: title, summary, reasoningSummary, evidence labels/details, recommended-action labels, and clinicalDisclaimer. Do not mix English with ${LANGUAGE_NAME[locale]} except unavoidable clinical abbreviations, medication names, laboratory names, or source chart text quoted as evidence.`,
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
