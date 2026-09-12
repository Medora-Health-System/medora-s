"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AiClinicalReviewOutput as AiClinicalReviewOutputSchema,
  type AiSuggestion,
  type AiSuggestionCategory,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type TabId = "safety" | "diagnostics" | "treatment" | "documentation" | "discharge" | "coding";
type FeedbackRating = "HELPFUL" | "NOT_HELPFUL";

type Copy = {
  title: string;
  subtitle: string;
  refresh: string;
  loading: string;
  empty: string;
  unavailable: string;
  retry: string;
  evidence: string;
  why: string;
  reviewSection: string;
  readOnly: string;
  snapshot: string;
  generated: string;
  helpful: string;
  notHelpful: string;
  feedbackThanks: string;
  feedbackFailed: string;
  live: string;
  codingInactive: string;
  tabs: Record<TabId, string>;
  priorities: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW", string>;
};

const COPY: Record<"en" | "fr" | "es", Copy> = {
  en: {
    title: "AI Chart Review",
    subtitle: "Live clinical chart review",
    refresh: "Refresh review",
    loading: "Reviewing the current chart snapshot…",
    empty: "No findings in this section.",
    unavailable: "AI chart review is unavailable right now. Clinical care can continue normally.",
    retry: "Retry",
    evidence: "Evidence",
    why: "Why this was flagged",
    reviewSection: "Review chart section",
    readOnly: "Read-only clinical decision support. Review every finding before acting. Medora AI does not modify the chart or place orders.",
    snapshot: "Snapshot",
    generated: "Generated",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    feedbackThanks: "Feedback recorded",
    feedbackFailed: "Feedback could not be recorded. Refresh and try again.",
    live: "Auto-refreshes while this chart is active",
    codingInactive: "Coding & Medical Necessity intelligence is not active in Phase 1D. No coding, payer, E/M, or reimbursement recommendations are being generated.",
    tabs: {
      safety: "Clinical Safety",
      diagnostics: "Diagnostics",
      treatment: "Treatment & Orders",
      documentation: "Documentation / MDM",
      discharge: "Discharge",
      coding: "Coding & Medical Necessity",
    },
    priorities: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  },
  fr: {
    title: "Révision IA du dossier",
    subtitle: "Révision clinique en direct",
    refresh: "Actualiser la révision",
    loading: "Analyse de l’instantané actuel du dossier…",
    empty: "Aucun élément signalé dans cette section.",
    unavailable: "La révision IA du dossier est indisponible pour le moment. Les soins cliniques peuvent continuer normalement.",
    retry: "Réessayer",
    evidence: "Éléments probants",
    why: "Pourquoi cet élément a été signalé",
    reviewSection: "Consulter la section du dossier",
    readOnly: "Aide à la décision clinique en lecture seule. Vérifiez chaque élément avant d’agir. Medora AI ne modifie pas le dossier et ne passe aucune ordonnance.",
    snapshot: "Instantané",
    generated: "Généré",
    helpful: "Utile",
    notHelpful: "Pas utile",
    feedbackThanks: "Avis enregistré",
    feedbackFailed: "L’avis n’a pas pu être enregistré. Actualisez puis réessayez.",
    live: "S’actualise automatiquement lorsque ce dossier est actif",
    codingInactive: "L’intelligence de codage et de nécessité médicale n’est pas active en phase 1D. Aucune recommandation de codage, payeur, E/M ou remboursement n’est générée.",
    tabs: {
      safety: "Sécurité clinique",
      diagnostics: "Diagnostics",
      treatment: "Traitement et ordres",
      documentation: "Documentation / MDM",
      discharge: "Sortie",
      coding: "Codage et nécessité médicale",
    },
    priorities: { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" },
  },
  es: {
    title: "Revisión de historia con IA",
    subtitle: "Revisión clínica en vivo",
    refresh: "Actualizar revisión",
    loading: "Revisando la instantánea actual de la historia…",
    empty: "No hay hallazgos en esta sección.",
    unavailable: "La revisión de historia con IA no está disponible en este momento. La atención clínica puede continuar normalmente.",
    retry: "Reintentar",
    evidence: "Evidencia",
    why: "Por qué se marcó",
    reviewSection: "Revisar sección de la historia",
    readOnly: "Soporte de decisión clínica de solo lectura. Revise cada hallazgo antes de actuar. Medora AI no modifica la historia ni coloca órdenes.",
    snapshot: "Instantánea",
    generated: "Generado",
    helpful: "Útil",
    notHelpful: "No útil",
    feedbackThanks: "Comentario registrado",
    feedbackFailed: "No se pudo registrar el comentario. Actualice e inténtelo de nuevo.",
    live: "Se actualiza automáticamente mientras esta historia está activa",
    codingInactive: "La inteligencia de codificación y necesidad médica no está activa en la fase 1D. No se generan recomendaciones de codificación, pagador, E/M ni reembolso.",
    tabs: {
      safety: "Seguridad clínica",
      diagnostics: "Diagnósticos",
      treatment: "Tratamiento y órdenes",
      documentation: "Documentación / MDM",
      discharge: "Alta",
      coding: "Codificación y necesidad médica",
    },
    priorities: { CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" },
  },
};

const TAB_ORDER: TabId[] = ["safety", "diagnostics", "treatment", "documentation", "discharge", "coding"];
const AUTO_REFRESH_MS = 30_000;

const TAB_BY_CATEGORY: Record<AiSuggestionCategory, TabId> = {
  CLINICAL_SAFETY: "safety",
  DIAGNOSTIC_GAP: "diagnostics",
  RESULT_FOLLOWUP: "diagnostics",
  MEDICATION_CONSIDERATION: "treatment",
  ORDER_CONSIDERATION: "treatment",
  REASSESSMENT_GAP: "documentation",
  DOCUMENTATION_GAP: "documentation",
  MDM_GAP: "documentation",
  DISPOSITION_GAP: "discharge",
  DISCHARGE_SAFETY: "discharge",
  FOLLOW_UP_GAP: "discharge",
  CONTRADICTION: "safety",
  DUPLICATION: "treatment",
  PENDING_ACTION: "diagnostics",
};

const SECTION_BY_CATEGORY: Partial<Record<AiSuggestionCategory, ClinicCareAmbulatoryWorkspaceSection>> = {
  CLINICAL_SAFETY: "results",
  DIAGNOSTIC_GAP: "results",
  RESULT_FOLLOWUP: "results",
  MEDICATION_CONSIDERATION: "medications",
  ORDER_CONSIDERATION: "orders",
  REASSESSMENT_GAP: "medical-evaluation",
  DOCUMENTATION_GAP: "notes",
  MDM_GAP: "medical-evaluation",
  DISPOSITION_GAP: "summary",
  DISCHARGE_SAFETY: "summary",
  FOLLOW_UP_GAP: "follow-up",
  CONTRADICTION: "medical-evaluation",
  DUPLICATION: "orders",
  PENDING_ACTION: "results",
};

const priorityRank: Record<AiSuggestion["priority"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function localeKey(language: string): "en" | "fr" | "es" {
  if (language.toLowerCase().startsWith("fr")) return "fr";
  if (language.toLowerCase().startsWith("es")) return "es";
  return "en";
}

function priorityStyle(priority: AiSuggestion["priority"]): React.CSSProperties {
  if (priority === "CRITICAL") return { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
  if (priority === "HIGH") return { background: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" };
  if (priority === "MEDIUM") return { background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
  return { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" };
}

export function AiChartReviewPanel({
  encounterId,
  facilityId,
  language,
  onNavigate,
}: {
  encounterId: string;
  facilityId: string;
  language: string;
  onNavigate: (section: ClinicCareAmbulatoryWorkspaceSection) => void;
}) {
  const copy = COPY[localeKey(language)];
  const [activeTab, setActiveTab] = useState<TabId>("safety");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedbackBySuggestion, setFeedbackBySuggestion] = useState<Record<string, FeedbackRating>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, boolean>>({});
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (silent = false) => {
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    if (!silent) setLoading(true);
    setError(false);
    try {
      const raw = await apiFetch(`/ai/chart-review/${encodeURIComponent(encounterId)}`, {
        facilityId,
        signal: controller.signal,
      });
      if (sequence !== requestSequence.current) return;
      const parsed = AiClinicalReviewOutputSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid AI chart review response");
      setSuggestions([...parsed.data.suggestions].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]));
    } catch (loadError) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      if (!silent) setSuggestions([]);
      setError(true);
    } finally {
      if (sequence === requestSequence.current && !silent) setLoading(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void load(false);
    return () => {
      activeRequest.current?.abort();
      requestSequence.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const refreshIfActive = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const interval = window.setInterval(refreshIfActive, AUTO_REFRESH_MS);
    window.addEventListener("focus", refreshIfActive);
    document.addEventListener("visibilitychange", refreshIfActive);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfActive);
      document.removeEventListener("visibilitychange", refreshIfActive);
    };
  }, [load]);

  const submitFeedback = useCallback(async (suggestion: AiSuggestion, rating: FeedbackRating) => {
    setFeedbackPending((current) => ({ ...current, [suggestion.id]: true }));
    setFeedbackError((current) => ({ ...current, [suggestion.id]: false }));
    try {
      await apiFetch(`/ai/chart-review/${encodeURIComponent(encounterId)}/feedback`, {
        facilityId,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          category: suggestion.category,
          snapshotVersion: suggestion.snapshotVersion,
          rating,
        }),
      });
      setFeedbackBySuggestion((current) => ({ ...current, [suggestion.id]: rating }));
    } catch {
      setFeedbackError((current) => ({ ...current, [suggestion.id]: true }));
    } finally {
      setFeedbackPending((current) => ({ ...current, [suggestion.id]: false }));
    }
  }, [encounterId, facilityId]);

  const grouped = useMemo(() => {
    const map: Record<TabId, AiSuggestion[]> = {
      safety: [], diagnostics: [], treatment: [], documentation: [], discharge: [], coding: [],
    };
    for (const suggestion of suggestions) map[TAB_BY_CATEGORY[suggestion.category]].push(suggestion);
    return map;
  }, [suggestions]);

  const current = grouped[activeTab];
  const firstSuggestion = suggestions[0];

  return (
    <aside
      aria-label={copy.title}
      data-testid="ai-chart-review-panel"
      data-read-only="true"
      style={{
        ...MEDORA_CARD_SHELL,
        position: "sticky",
        top: 12,
        width: "100%",
        maxHeight: "calc(100vh - 120px)",
        overflow: "auto",
        padding: 14,
        boxSizing: "border-box",
        alignSelf: "flex-start",
      }}
    >
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>{copy.title}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#64748b" }}>{copy.subtitle}</p>
          <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "#94a3b8" }}>{copy.live}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(false)}
          disabled={loading}
          style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 7, padding: "5px 8px", fontSize: 11, cursor: loading ? "default" : "pointer" }}
        >
          {copy.refresh}
        </button>
      </div>

      <p style={{ margin: "10px 0", padding: 9, borderRadius: 8, background: "#f8fafc", color: "#475569", fontSize: 11.5, lineHeight: 1.45 }}>
        {copy.readOnly}
      </p>

      <div role="tablist" aria-label={copy.title} style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            style={{
              border: activeTab === tab ? "1px solid #0f766e" : "1px solid #e2e8f0",
              background: activeTab === tab ? "#f0fdfa" : "#fff",
              color: activeTab === tab ? "#115e59" : "#475569",
              borderRadius: 999,
              padding: "5px 8px",
              fontSize: 10.5,
              cursor: "pointer",
            }}
          >
            {copy.tabs[tab]}{tab !== "coding" && grouped[tab].length ? ` (${grouped[tab].length})` : ""}
          </button>
        ))}
      </div>

      {loading ? <p role="status" style={{ fontSize: 12.5, color: "#64748b" }}>{copy.loading}</p> : null}

      {!loading && error ? (
        <div role="alert" style={{ padding: 10, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#991b1b", lineHeight: 1.45 }}>{copy.unavailable}</p>
          <button type="button" onClick={() => void load(false)} style={{ marginTop: 8, border: "1px solid #fca5a5", borderRadius: 7, background: "#fff", padding: "5px 8px", fontSize: 11 }}>
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!loading && !error && activeTab === "coding" ? (
        <div style={{ padding: 11, borderRadius: 8, border: "1px dashed #cbd5e1", background: "#f8fafc", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          {copy.codingInactive}
        </div>
      ) : null}

      {!loading && !error && activeTab !== "coding" && current.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>{copy.empty}</p>
      ) : null}

      {!loading && !error && activeTab !== "coding" ? current.map((suggestion) => {
        const section = SECTION_BY_CATEGORY[suggestion.category];
        const feedback = feedbackBySuggestion[suggestion.id];
        const isFeedbackPending = feedbackPending[suggestion.id] === true;
        const hasFeedbackError = feedbackError[suggestion.id] === true;
        return (
          <article key={suggestion.id} style={{ borderTop: "1px solid #e2e8f0", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ ...priorityStyle(suggestion.priority), border: "1px solid", borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                {copy.priorities[suggestion.priority]}
              </span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{suggestion.category.replaceAll("_", " ")}</span>
            </div>
            <h3 style={{ margin: "7px 0 4px", fontSize: 13.5, color: "#0f172a" }}>{suggestion.title}</h3>
            <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{suggestion.summary}</p>

            {suggestion.reasoningSummary ? (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11.5, color: "#475569", cursor: "pointer", fontWeight: 600 }}>{copy.why}</summary>
                <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#64748b", lineHeight: 1.45 }}>{suggestion.reasoningSummary}</p>
              </details>
            ) : null}

            {suggestion.evidence.length ? (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11.5, color: "#475569", cursor: "pointer", fontWeight: 600 }}>{copy.evidence} ({suggestion.evidence.length})</summary>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11.5, color: "#64748b", lineHeight: 1.45 }}>
                  {suggestion.evidence.map((item, index) => (
                    <li key={`${item.sourceType}-${item.sourceId ?? index}-${index}`}>
                      {item.label}{item.value !== undefined ? `: ${item.value === null ? "—" : String(item.value)}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 9 }}>
              {section ? (
                <button
                  type="button"
                  onClick={() => onNavigate(section)}
                  style={{ border: "1px solid #99f6e4", background: "#f0fdfa", color: "#115e59", borderRadius: 7, padding: "6px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                >
                  {copy.reviewSection}
                </button>
              ) : null}

              <button
                type="button"
                disabled={isFeedbackPending || Boolean(feedback)}
                onClick={() => void submitFeedback(suggestion, "HELPFUL")}
                style={{ border: "1px solid #cbd5e1", background: feedback === "HELPFUL" ? "#f0fdf4" : "#fff", borderRadius: 7, padding: "6px 8px", fontSize: 11, cursor: isFeedbackPending || feedback ? "default" : "pointer" }}
              >
                {copy.helpful}
              </button>
              <button
                type="button"
                disabled={isFeedbackPending || Boolean(feedback)}
                onClick={() => void submitFeedback(suggestion, "NOT_HELPFUL")}
                style={{ border: "1px solid #cbd5e1", background: feedback === "NOT_HELPFUL" ? "#f8fafc" : "#fff", borderRadius: 7, padding: "6px 8px", fontSize: 11, cursor: isFeedbackPending || feedback ? "default" : "pointer" }}
              >
                {copy.notHelpful}
              </button>
              {feedback ? <span role="status" style={{ fontSize: 10.5, color: "#64748b" }}>{copy.feedbackThanks}</span> : null}
              {hasFeedbackError ? <span role="alert" style={{ fontSize: 10.5, color: "#991b1b" }}>{copy.feedbackFailed}</span> : null}
            </div>
          </article>
        );
      }) : null}

      {!loading && !error && firstSuggestion ? (
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, fontSize: 9.5, color: "#94a3b8", wordBreak: "break-all" }}>
          <div>{copy.generated}: {new Date(firstSuggestion.generatedAt).toLocaleString()}</div>
          <div>{copy.snapshot}: {firstSuggestion.snapshotVersion}</div>
        </div>
      ) : null}
    </aside>
  );
}
