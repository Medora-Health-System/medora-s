import { Inject, Injectable, Logger } from "@nestjs/common";
import { AiClinicalReviewOutput, pickAiLocalizedCopy, type AiSuggestion } from "@medora/shared";
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
import { LANGUAGE_NAME, localizeDeterministicClinicalCopy, type AiReviewLocale } from "./clinical-review-copy.catalog.js";

const EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION = `You are Medora Assist, a strong structured clinical chart-review assistant. Review only the supplied encounter facts and evaluate the current encounter section by section. Never use facts from another patient, encounter, facility, or care setting.

CARE-SETTING ISOLATION IS A HARD BOUNDARY. The supplied encounter.careSetting is authoritative for this review. Apply expectations appropriate to that setting only. Do not apply emergency-department workflow expectations to an office/outpatient clinic encounter, do not apply outpatient assumptions to an emergency encounter, and do not transfer findings between encounters even when they share the same facility or user session.

CLINICIAN-FIRST DISPLAY IS REQUIRED. Each finding must be understandable from the card title and summary alone. The title must name the actual problem. The summary must be one or two direct sentences stating the exact chart gap, contradiction, pending item, medication issue, order/result issue, or discharge concern and the specific chart facts that support it. Never make the clinician decode labels such as "Evidence 1", "Evidence 2", counts such as "2 of 4", internal field names, IDs, hashes, namespaces, or implementation terminology. Evidence is optional supporting detail only and must never be necessary to understand the finding.

Review every domain with usable data; do not stop after the first finding:
1. Presentation and documentation: chief complaint, HPI, ROS, physical examination, reassessment, provider documentation, MDM completeness, internal consistency, and whether the assessment/plan addresses important chart facts.
2. Diagnostics and orders: laboratory, imaging and procedure orders; pending tests; available results; abnormal/critical result follow-up; duplicate or inconsistent orders; and whether important findings are reconciled in the documented MDM. You may identify a diagnostic or laboratory consideration for clinician review when supported by this encounter, but never place or require an order.
3. Treatment and medications: medication/treatment orders, administrations, duplication, order/MAR consistency, treatment response or reassessment, medication-safety/documentation concerns, and discharge-medication considerations supported by this encounter. Never prescribe, choose a dose, or execute an order.
4. Diagnoses: documented diagnoses and consistency with this encounter's assessment, results and MDM. Never invent or establish an undocumented diagnosis.
5. Disposition and discharge: disposition reasoning, discharge documentation, pending diagnostics, reassessment, follow-up, return precautions, and medication/documentation considerations supported by this encounter.
6. Cross-chart consistency: identify contradictions or unresolved relationships among presentation, vitals, examination, diagnostics/results, treatment, diagnoses, MDM, reassessment and disposition. Explain the exact supplied facts creating the concern.

Distinguish among: (a) missing/not documented, (b) internally inconsistent/needs review, and (c) a contextual clinical consideration supported by supplied facts. Do not manufacture a gap merely because a section is empty when this encounter does not establish that the content is clinically indicated. Avoid noisy generic alerts and return all meaningful, non-duplicative findings.

Return only the requested structured suggestions. Do not diagnose autonomously. Never place or imply orders. Do not autonomously diagnose, modify documentation, fabricate facts, infer unsupported payer/coding rules, or recommend services for reimbursement. Do not provide CPT/E&M/payer/reimbursement advice. Every suggestion is advisory and requires clinician review. Evidence must come only from the supplied payload. Recommended actions may only ask the clinician to review or navigate to an existing chart section.`;

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

    // Whole-chart review is fail-closed. A bounded/truncated or source-incomplete
    // snapshot must never be presented as a complete clinical chart review.
    // Do not invoke either review engine: deterministic rules can also create
    // unsupported cross-chart conclusions when their source domain was truncated.
    if (initialSnapshot.completeness?.complete !== true) {
      this.logger.warn(
        `AI chart review suppressed because snapshot is incomplete (truncated=${initialSnapshot.completeness?.truncatedDomains?.join(",") ?? "unknown"}; missing=${initialSnapshot.completeness?.missingSourceDomains?.join(",") ?? "unknown"})`
      );
      return { suggestions: [] };
    }

    const deterministicRaw = this.deterministicReview.run(initialSnapshot);
    const deterministic = { suggestions: deterministicRaw.suggestions.map((suggestion) => this.localizeDeterministic(suggestion, locale)) };

    if (!(await this.featureFlags.isFacilityEnabled(input.facilityId))) {
      return this.returnOnlyIfCurrent(input, initialSnapshot.snapshotVersion, deterministic, locale);
    }

    try {
      const providerResponse = await this.modelProvider.generateStructured({
        snapshotContext: { snapshotVersion: initialSnapshot.snapshotVersion, facilityId: input.facilityId, encounterId: input.encounterId },
        clinicalInput: buildExternalClinicalInput(initialSnapshot),
        systemInstruction: `${EXTERNAL_CLINICAL_REVIEW_SYSTEM_INSTRUCTION}\n\nCURRENT CARE SETTING: ${initialSnapshot.encounterContext.careSetting}. Treat this value as a hard clinical-context boundary.\nLANGUAGE REQUIREMENT: The clinician interface language is ${LANGUAGE_NAME[locale]}. Write every user-visible suggestion field in ${LANGUAGE_NAME[locale]}: title, summary, reasoningSummary, evidence labels/details, recommended-action labels, and clinicalDisclaimer. Do not mix English with ${LANGUAGE_NAME[locale]} except unavoidable clinical abbreviations, medication names, laboratory names, or source chart text quoted as evidence.`,
        responseSchemaName: "medora_clinical_chart_review",
        responseJsonSchema: EXTERNAL_CLINICAL_REVIEW_JSON_SCHEMA,
      });

      if (providerResponse.snapshotVersion !== initialSnapshot.snapshotVersion) {
        this.logger.warn("External clinical AI response snapshot mismatch; result discarded");
        return this.returnOnlyIfCurrent(input, initialSnapshot.snapshotVersion, deterministic, locale);
      }

      const parsedExternal = externalClinicalReviewSchema.safeParse(providerResponse.output);
      if (!parsedExternal.success) {
        this.logger.warn("External clinical AI output failed Medora schema validation; result discarded");
        return this.returnOnlyIfCurrent(input, initialSnapshot.snapshotVersion, deterministic, locale);
      }

      const currentSnapshot = await this.snapshotBuilder.build(input);
      if (currentSnapshot.snapshotVersion !== initialSnapshot.snapshotVersion) {
        this.logger.warn("Encounter changed during external clinical AI review; stale result discarded");
        return { suggestions: this.deterministicReview.run(currentSnapshot).suggestions.map((suggestion) => this.localizeDeterministic(suggestion, locale)) };
      }

      const generatedAt = new Date().toISOString();
      const externalSuggestions: AiSuggestion[] = parsedExternal.data.suggestions.map((suggestion) => ({
        id: buildStableSuggestionId({ snapshotVersion: initialSnapshot.snapshotVersion, source: this.modelProvider.providerName, category: suggestion.category, title: suggestion.title }),
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
      return this.returnOnlyIfCurrent(input, initialSnapshot.snapshotVersion, deterministic, locale);
    }
  }

  private async returnOnlyIfCurrent(
    input: EncounterAiSnapshotBuildInput,
    expectedSnapshotVersion: string,
    output: AiClinicalReviewOutput,
    locale: AiReviewLocale
  ): Promise<AiClinicalReviewOutput> {
    const currentSnapshot = await this.snapshotBuilder.build(input);
    if (currentSnapshot.completeness?.complete !== true) {
      this.logger.warn("Encounter became incomplete during clinical AI review; result discarded");
      return { suggestions: [] };
    }
    if (currentSnapshot.snapshotVersion === expectedSnapshotVersion) return output;

    this.logger.warn("Encounter changed during clinical AI review; stale result discarded");
    const currentDeterministic = this.deterministicReview.run(currentSnapshot);
    return {
      suggestions: currentDeterministic.suggestions.map((suggestion) =>
        this.localizeDeterministic(suggestion, locale)
      ),
    };
  }

  private localizeDeterministic(suggestion: AiSuggestion, locale: AiReviewLocale): AiSuggestion {
    if (suggestion.titleLocalized && suggestion.summaryLocalized) {
      return {
        ...suggestion,
        title: pickAiLocalizedCopy(suggestion.titleLocalized, locale, suggestion.title),
        summary: pickAiLocalizedCopy(suggestion.summaryLocalized, locale, suggestion.summary),
        reasoningSummary: pickAiLocalizedCopy(suggestion.reasoningSummaryLocalized, locale, suggestion.reasoningSummary),
        clinicalDisclaimer: pickAiLocalizedCopy(suggestion.clinicalDisclaimerLocalized, locale, suggestion.clinicalDisclaimer),
      };
    }
    return localizeDeterministicClinicalCopy(suggestion, locale);
  }

  private mergeSuggestions(deterministic: AiSuggestion[], external: AiSuggestion[]): AiSuggestion[] {
    const seen = new Set<string>();
    const merged: AiSuggestion[] = [];
    const rank: Record<AiSuggestion["priority"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    for (const suggestion of [...deterministic, ...external]) {
      const key = `${suggestion.category}:${suggestion.title.trim().toLowerCase()}:${suggestion.summary.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(suggestion);
      if (merged.length >= 200) break;
    }

    merged.sort((a, b) => rank[a.priority] - rank[b.priority]);
    return merged;
  }
}
