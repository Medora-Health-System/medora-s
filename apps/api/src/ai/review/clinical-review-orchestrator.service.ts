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

type AiReviewLocale = "en" | "fr" | "es";

const LANGUAGE_NAME: Record<AiReviewLocale, string> = { en: "English", fr: "French", es: "Spanish" };

const DETERMINISTIC_COPY: Record<Exclude<AiReviewLocale, "en">, Record<string, { title: string; summary: string; why: string; action: string }>> = {
  es: {
    CLINICAL_SAFETY: { title: "Revisar seguridad clínica", summary: "Medora Asistente detectó un hallazgo estructurado de seguridad que requiere revisión clínica.", why: "Este hallazgo proviene de datos estructurados de este encuentro y requiere confirmación del profesional clínico.", action: "Revisar historia" },
    DIAGNOSTIC_GAP: { title: "Revisar diagnóstico y estudios", summary: "Hay un posible vacío o inconsistencia en la documentación diagnóstica de este encuentro.", why: "Revise los estudios, resultados y la documentación clínica relacionada antes de continuar.", action: "Revisar diagnóstico" },
    RESULT_FOLLOWUP: { title: "Revisar seguimiento de resultados", summary: "Hay un resultado que puede requerir revisión o seguimiento documentado.", why: "Los resultados relevantes deben reconciliarse con la evaluación y el plan del encuentro.", action: "Revisar resultados" },
    MEDICATION_CONSIDERATION: { title: "Revisar medicación y tratamiento", summary: "Hay una consideración relacionada con medicamentos o tratamiento que requiere revisión clínica.", why: "La recomendación es informativa y no prescribe ni modifica órdenes.", action: "Revisar medicamentos" },
    ORDER_CONSIDERATION: { title: "Revisar órdenes clínicas", summary: "Hay una consideración relacionada con las órdenes de este encuentro.", why: "Revise las órdenes y su relación con la evaluación, los resultados y el plan documentado.", action: "Revisar órdenes" },
    REASSESSMENT_GAP: { title: "Revisar reevaluación clínica", summary: "La documentación estructurada sugiere que la reevaluación puede estar ausente o incompleta.", why: "La reevaluación debe relacionar la evolución del paciente con el tratamiento, los resultados y la disposición.", action: "Revisar reevaluación" },
    DOCUMENTATION_GAP: { title: "Revisar documentación clínica", summary: "La documentación de este encuentro puede estar incompleta o pendiente.", why: "Complete o reconcilie la documentación aplicable antes de finalizar el encuentro.", action: "Revisar documentación" },
    MDM_GAP: { title: "La toma de decisiones médicas puede estar incompleta", summary: "La documentación del MDM tiene componentes clínicos pendientes de completar.", why: "Este hallazgo revisa la integridad de la documentación del MDM; no determina por sí solo que la decisión clínica sea incorrecta.", action: "Revisar toma de decisiones médicas" },
    DISPOSITION_GAP: { title: "Revisar disposición", summary: "La disposición documentada puede estar ausente o incompleta.", why: "La disposición debe ser coherente con la evaluación, los resultados, el tratamiento y la reevaluación documentados.", action: "Revisar disposición" },
    DISCHARGE_SAFETY: { title: "Revisar seguridad del alta", summary: "Hay un elemento de seguridad del alta que requiere revisión antes de finalizar el encuentro.", why: "Revise resultados pendientes, reevaluación, tratamiento, medicamentos e instrucciones de seguimiento aplicables.", action: "Revisar alta" },
    FOLLOW_UP_GAP: { title: "Revisar seguimiento", summary: "El seguimiento documentado puede estar incompleto o pendiente.", why: "El plan de seguimiento debe corresponder a la evaluación y disposición de este encuentro.", action: "Revisar seguimiento" },
    CONTRADICTION: { title: "Revisar posible inconsistencia clínica", summary: "Dos o más datos estructurados del encuentro pueden requerir reconciliación.", why: "Medora Asistente no decide cuál dato es correcto; señala la inconsistencia para revisión clínica.", action: "Revisar historia" },
    DUPLICATION: { title: "Revisar posible duplicación", summary: "Hay elementos estructurados que pueden representar una duplicación y requieren revisión.", why: "Confirme la intención clínica antes de realizar cambios.", action: "Revisar órdenes" },
    PENDING_ACTION: { title: "Revisar elemento pendiente", summary: "Hay un elemento clínico pendiente que requiere revisión.", why: "Confirme su estado y relación con el plan actual del encuentro.", action: "Revisar historia" },
  },
  fr: {
    CLINICAL_SAFETY: { title: "Revoir la sécurité clinique", summary: "Medora Assistance a détecté un élément structuré de sécurité nécessitant une revue clinique.", why: "Ce constat provient des données structurées de cette consultation et doit être confirmé par le clinicien.", action: "Consulter le dossier" },
    DIAGNOSTIC_GAP: { title: "Revoir le diagnostic et les examens", summary: "Il existe un possible manque ou une incohérence dans la documentation diagnostique de cette consultation.", why: "Revoyez les examens, résultats et la documentation clinique associée.", action: "Revoir le diagnostic" },
    RESULT_FOLLOWUP: { title: "Revoir le suivi des résultats", summary: "Un résultat peut nécessiter une revue ou un suivi documenté.", why: "Les résultats pertinents doivent être rapprochés de l'évaluation et du plan.", action: "Revoir les résultats" },
    MEDICATION_CONSIDERATION: { title: "Revoir les médicaments et le traitement", summary: "Une considération liée aux médicaments ou au traitement nécessite une revue clinique.", why: "Cette recommandation est informative et ne prescrit ni ne modifie d'ordonnance.", action: "Revoir les médicaments" },
    ORDER_CONSIDERATION: { title: "Revoir les ordres cliniques", summary: "Une considération liée aux ordres de cette consultation nécessite une revue.", why: "Revoyez les ordres avec l'évaluation, les résultats et le plan documenté.", action: "Revoir les ordres" },
    REASSESSMENT_GAP: { title: "Revoir la réévaluation clinique", summary: "La documentation structurée suggère que la réévaluation peut être absente ou incomplète.", why: "La réévaluation doit relier l'évolution du patient au traitement, aux résultats et à la disposition.", action: "Revoir la réévaluation" },
    DOCUMENTATION_GAP: { title: "Revoir la documentation clinique", summary: "La documentation de cette consultation peut être incomplète ou en attente.", why: "Complétez ou rapprochez la documentation applicable avant de finaliser la consultation.", action: "Revoir la documentation" },
    MDM_GAP: { title: "La prise de décision médicale peut être incomplète", summary: "La documentation du MDM contient des éléments cliniques à compléter.", why: "Ce constat évalue l'intégrité de la documentation du MDM; il ne détermine pas à lui seul qu'une décision clinique est incorrecte.", action: "Revoir la prise de décision médicale" },
    DISPOSITION_GAP: { title: "Revoir la disposition", summary: "La disposition documentée peut être absente ou incomplète.", why: "La disposition doit être cohérente avec l'évaluation, les résultats, le traitement et la réévaluation documentés.", action: "Revoir la disposition" },
    DISCHARGE_SAFETY: { title: "Revoir la sécurité de sortie", summary: "Un élément de sécurité de sortie nécessite une revue avant de finaliser la consultation.", why: "Revoyez les résultats en attente, la réévaluation, le traitement, les médicaments et le suivi applicables.", action: "Revoir la sortie" },
    FOLLOW_UP_GAP: { title: "Revoir le suivi", summary: "Le suivi documenté peut être incomplet ou en attente.", why: "Le plan de suivi doit correspondre à l'évaluation et à la disposition de cette consultation.", action: "Revoir le suivi" },
    CONTRADICTION: { title: "Revoir une possible incohérence clinique", summary: "Deux données structurées ou plus peuvent nécessiter un rapprochement.", why: "Medora Assistance ne décide pas quelle donnée est correcte; elle signale l'incohérence pour revue clinique.", action: "Consulter le dossier" },
    DUPLICATION: { title: "Revoir une possible duplication", summary: "Des éléments structurés peuvent représenter une duplication et nécessitent une revue.", why: "Confirmez l'intention clinique avant toute modification.", action: "Revoir les ordres" },
    PENDING_ACTION: { title: "Revoir un élément en attente", summary: "Un élément clinique en attente nécessite une revue.", why: "Confirmez son état et son lien avec le plan actuel.", action: "Consulter le dossier" },
  },
};

const MDM_DOMAIN_LABELS = {
  es: { "working assessment": "evaluación clínica de trabajo", "data reviewed": "datos revisados", "risk/management reasoning": "razonamiento de riesgo y manejo", "plan/disposition reasoning": "razonamiento del plan y la disposición" },
  fr: { "working assessment": "évaluation clinique de travail", "data reviewed": "données examinées", "risk/management reasoning": "raisonnement sur le risque et la prise en charge", "plan/disposition reasoning": "raisonnement du plan et de la disposition" },
} as const;

function localizedMdmSummary(summary: string, locale: Exclude<AiReviewLocale, "en">): string | null {
  if (summary.includes("do not contain documented clinical reasoning")) {
    return locale === "es"
      ? "La documentación del profesional está presente, pero el MDM no contiene razonamiento clínico documentado."
      : "La documentation du clinicien est présente, mais le MDM ne contient pas de raisonnement clinique documenté.";
  }
  const prefix = "The structured MDM is missing documented ";
  if (!summary.startsWith(prefix)) return null;
  const raw = summary.slice(prefix.length).replace(/\.$/, "");
  const translated = raw.split(", ").map((item) => MDM_DOMAIN_LABELS[locale][item as keyof typeof MDM_DOMAIN_LABELS[typeof locale]] ?? item);
  if (!translated.length) return null;
  const joined = translated.length === 1 ? translated[0] : `${translated.slice(0, -1).join(", ")} ${locale === "es" ? "y" : "et"} ${translated.at(-1)}`;
  return locale === "es" ? `Falta documentar ${joined} en la toma de decisiones médicas.` : `Il manque la documentation de ${joined} dans la prise de décision médicale.`;
}

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
        reasoningSummary: pickAiLocalizedCopy(
          suggestion.reasoningSummaryLocalized,
          locale,
          suggestion.reasoningSummary
        ),
        clinicalDisclaimer: pickAiLocalizedCopy(
          suggestion.clinicalDisclaimerLocalized,
          locale,
          suggestion.clinicalDisclaimer
        ),
      };
    }
    if (locale === "en") return suggestion;
    const copy = DETERMINISTIC_COPY[locale][suggestion.category];
    if (!copy) return suggestion;

    let title = copy.title;
    let summary = copy.summary;
    let reasoningSummary = copy.why;

    if (suggestion.category === "MDM_GAP") {
      summary = localizedMdmSummary(suggestion.summary, locale) ?? summary;
    } else if (
      suggestion.category === "DOCUMENTATION_GAP" &&
      (suggestion.title.toLowerCase().includes("unsigned") || suggestion.summary.includes("expected SIGNED"))
    ) {
      summary = locale === "es"
        ? "La documentación del profesional clínico está en BORRADOR y todavía no está firmada o finalizada."
        : "La documentation du clinicien est encore en BROUILLON et n'est pas encore signée ou finalisée.";
    } else if (suggestion.title === "No vital signs are documented for this emergency encounter") {
      title = locale === "es" ? "No hay signos vitales documentados en este encuentro de urgencias" : "Aucun signe vital n'est documenté pour cette consultation d'urgence";
      summary = locale === "es"
        ? "La documentación del profesional ya comenzó, pero la historia no contiene ningún conjunto de signos vitales registrado. Confirme si se obtuvieron y documente los valores actuales si están disponibles."
        : "La documentation du clinicien a commencé, mais le dossier ne contient aucun ensemble de signes vitaux enregistré. Confirmez s'ils ont été obtenus et documentez les valeurs actuelles si elles sont disponibles.";
      reasoningSummary = locale === "es"
        ? "Este hallazgo identifica la ausencia de signos vitales estructurados después de iniciar la documentación clínica; no supone que no se hayan medido al lado del paciente."
        : "Ce constat signale l'absence de signes vitaux structurés après le début de la documentation clinique; il ne suppose pas qu'ils n'ont pas été mesurés au chevet.";
    } else if (suggestion.title === "Available diagnostic results are not reconciled in the MDM") {
      title = locale === "es" ? "Los resultados disponibles no están reconciliados en el MDM" : "Les résultats disponibles ne sont pas rapprochés dans le MDM";
      summary = locale === "es"
        ? "Hay resultados diagnósticos disponibles en la historia, pero el MDM no documenta los datos revisados. Documente cómo se revisaron y cómo influyeron en la evaluación y el plan cuando corresponda."
        : "Des résultats diagnostiques sont disponibles dans le dossier, mais le MDM ne documente pas les données examinées. Documentez comment ils ont été revus et intégrés à l'évaluation et au plan lorsque cela s'applique.";
      reasoningSummary = locale === "es"
        ? "Este hallazgo revisa si los datos diagnósticos disponibles están explícitamente integrados en la toma de decisiones médicas; no determina si la interpretación clínica es correcta."
        : "Ce constat vérifie si les données diagnostiques disponibles sont explicitement intégrées à la prise de décision médicale; il ne détermine pas si l'interprétation clinique est correcte.";
    } else if (suggestion.title === "Medication administration timestamp missing") {
      title = locale === "es" ? "Falta la hora de administración de un medicamento" : "L'heure d'administration d'un médicament est manquante";
      summary = locale === "es"
        ? "Una o más entradas del registro de administración están marcadas como administradas, pero no incluyen la hora de administración. Confirme y complete el registro cuando corresponda."
        : "Une ou plusieurs entrées du registre d'administration sont marquées comme administrées, mais l'heure d'administration est absente. Confirmez et complétez le registre lorsque cela s'applique.";
      reasoningSummary = locale === "es"
        ? "Este hallazgo compara únicamente la acción registrada y la hora de administración; no determina si el medicamento se administró realmente."
        : "Ce constat compare uniquement l'action enregistrée et l'heure d'administration; il ne détermine pas si le médicament a réellement été administré.";
    }

    return {
      ...suggestion,
      title,
      summary,
      reasoningSummary,
      evidence: [],
      recommendedActions: suggestion.recommendedActions.map((action) => ({ ...action, label: copy.action })),
      clinicalDisclaimer: locale === "es"
        ? "Requiere revisión del profesional clínico; Medora Asistente no diagnostica ni ejecuta acciones clínicas de forma autónoma."
        : "Nécessite une revue par le clinicien; Medora Assistance ne pose pas de diagnostic et n'exécute aucune action clinique de manière autonome.",
    };
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
