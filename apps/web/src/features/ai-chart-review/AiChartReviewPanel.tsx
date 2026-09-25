"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AiClinicalReviewOutput as AiClinicalReviewOutputSchema,
  pickAiLocalizedCopy,
  type AiSuggestion,
  type AiSuggestionCategory,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { medoraAssistRequestIdentity, shouldAcceptMedoraAssistResponse } from "./medoraAssistRequestIdentity";

type TabId = "safety" | "diagnostics" | "treatment" | "documentation" | "discharge" | "coding";
type FeedbackRating = "HELPFUL" | "NOT_HELPFUL";
type Locale = "en" | "fr" | "es";

type Copy = {
  title: string;
  refresh: string;
  loading: string;
  empty: string;
  unavailable: string;
  retry: string;
  helpful: string;
  notHelpful: string;
  feedbackThanks: string;
  feedbackFailed: string;
  codingInactive: string;
  tabs: Record<TabId, string>;
  priorities: Record<AiSuggestion["priority"], string>;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Medora Assist",
    refresh: "Refresh",
    loading: "Reviewing chart…",
    empty: "No findings in this section.",
    unavailable: "Medora Assist is temporarily unavailable. Clinical care can continue normally.",
    retry: "Retry",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    feedbackThanks: "Feedback recorded",
    feedbackFailed: "Feedback could not be recorded. Try again.",
    codingInactive: "Coding intelligence is not active. No coding, payer, E/M, or reimbursement recommendations are being generated.",
    tabs: { safety: "Safety", diagnostics: "Diagnosis", treatment: "Treatment", documentation: "Documentation", discharge: "Discharge", coding: "Coding" },
    priorities: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  },
  fr: {
    title: "Medora Assistance",
    refresh: "Actualiser",
    loading: "Analyse du dossier…",
    empty: "Aucun constat dans cette section.",
    unavailable: "Medora Assistance est temporairement indisponible. Les soins peuvent continuer normalement.",
    retry: "Réessayer",
    helpful: "Utile",
    notHelpful: "Pas utile",
    feedbackThanks: "Avis enregistré",
    feedbackFailed: "L’avis n’a pas pu être enregistré. Réessayez.",
    codingInactive: "L’intelligence de codage n’est pas active. Aucune recommandation de codage, payeur, E/M ou remboursement n’est générée.",
    tabs: { safety: "Sécurité", diagnostics: "Diagnostic", treatment: "Traitement", documentation: "Documentation", discharge: "Sortie", coding: "Codage" },
    priorities: { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" },
  },
  es: {
    title: "Medora Asistente",
    refresh: "Actualizar",
    loading: "Revisando historia…",
    empty: "No hay hallazgos en esta sección.",
    unavailable: "Medora Asistente no está disponible temporalmente. La atención clínica puede continuar normalmente.",
    retry: "Reintentar",
    helpful: "Útil",
    notHelpful: "No útil",
    feedbackThanks: "Comentario registrado",
    feedbackFailed: "No se pudo registrar el comentario. Inténtelo de nuevo.",
    codingInactive: "La inteligencia de codificación no está activa. No se generan recomendaciones de codificación, pagador, E/M ni reembolso.",
    tabs: { safety: "Seguridad", diagnostics: "Diagnóstico", treatment: "Tratamiento", documentation: "Documentación", discharge: "Alta", coding: "Codificación" },
    priorities: { CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" },
  },
};

const TAB_ORDER: TabId[] = ["safety", "diagnostics", "treatment", "documentation", "discharge", "coding"];
const SECTION_ORDER: TabId[] = ["safety", "diagnostics", "treatment", "documentation", "discharge"];
const AUTO_REFRESH_MS = 30_000;
const TAB_BY_CATEGORY: Record<AiSuggestionCategory, TabId> = {
  CLINICAL_SAFETY: "safety",
  DIAGNOSTIC_GAP: "diagnostics",
  RESULT_FOLLOWUP: "diagnostics",
  MEDICATION_CONSIDERATION: "treatment",
  ORDER_CONSIDERATION: "treatment",
  REASSESSMENT_GAP: "safety",
  DOCUMENTATION_GAP: "documentation",
  MDM_GAP: "documentation",
  DISPOSITION_GAP: "discharge",
  DISCHARGE_SAFETY: "discharge",
  FOLLOW_UP_GAP: "discharge",
  CONTRADICTION: "treatment",
  DUPLICATION: "treatment",
  PENDING_ACTION: "diagnostics",
};
const PRIORITY_RANK: Record<AiSuggestion["priority"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function localeKey(language: string): Locale {
  if (language.toLowerCase().startsWith("fr")) return "fr";
  if (language.toLowerCase().startsWith("es")) return "es";
  return "en";
}

function priorityTone(priority: AiSuggestion["priority"]) {
  if (priority === "CRITICAL") return { bg: "#fff1f2", border: "#fecdd3", color: "#be123c", icon: "🚨" };
  if (priority === "HIGH") return { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", icon: "⚠️" };
  if (priority === "MEDIUM") return { bg: "#fffbeb", border: "#fde68a", color: "#a16207", icon: "💡" };
  return { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "ℹ️" };
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
  onNavigate?: (section: ClinicCareAmbulatoryWorkspaceSection) => void;
}) {
  void onNavigate;
  const locale = localeKey(language);
  const copy = COPY[locale];
  const identity = medoraAssistRequestIdentity({ facilityId, encounterId });
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, FeedbackRating>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, boolean>>({});
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const activeIdentity = useRef(identity);

  useEffect(() => {
    activeIdentity.current = identity;
    setSuggestions([]);
    setError(false);
    setFeedback({});
    setFeedbackPending({});
    setFeedbackError({});
    setLoading(true);
  }, [identity]);

  const load = useCallback(async (silent = false) => {
    const requestIdentity = identity;
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const raw = await apiFetch(
        `/ai/chart-review/${encodeURIComponent(encounterId)}?locale=${encodeURIComponent(locale)}`,
        { facilityId, signal: controller.signal }
      );
      if (!shouldAcceptMedoraAssistResponse({
        requestIdentity,
        activeIdentity: activeIdentity.current,
        requestSequence: sequence,
        activeSequence: requestSequence.current,
      })) return;
      const parsed = AiClinicalReviewOutputSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid AI chart review response");
      setSuggestions([...parsed.data.suggestions].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]));
      setError(false);
    } catch {
      if (controller.signal.aborted || !shouldAcceptMedoraAssistResponse({
        requestIdentity,
        activeIdentity: activeIdentity.current,
        requestSequence: sequence,
        activeSequence: requestSequence.current,
      })) return;
      if (!silent) {
        setSuggestions([]);
        setError(true);
      }
    } finally {
      if (
        shouldAcceptMedoraAssistResponse({
          requestIdentity,
          activeIdentity: activeIdentity.current,
          requestSequence: sequence,
          activeSequence: requestSequence.current,
        }) && !silent
      ) {
        setLoading(false);
      }
    }
  }, [encounterId, facilityId, identity, locale]);

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
    setFeedbackPending((value) => ({ ...value, [suggestion.id]: true }));
    setFeedbackError((value) => ({ ...value, [suggestion.id]: false }));
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
      setFeedback((value) => ({ ...value, [suggestion.id]: rating }));
    } catch {
      setFeedbackError((value) => ({ ...value, [suggestion.id]: true }));
    } finally {
      setFeedbackPending((value) => ({ ...value, [suggestion.id]: false }));
    }
  }, [encounterId, facilityId]);

  const grouped = useMemo(() => {
    const result: Record<TabId, AiSuggestion[]> = {
      safety: [],
      diagnostics: [],
      treatment: [],
      documentation: [],
      discharge: [],
      coding: [],
    };
    for (const suggestion of suggestions) result[TAB_BY_CATEGORY[suggestion.category]].push(suggestion);
    return result;
  }, [suggestions]);


  return (
    <aside
      aria-label={copy.title}
      data-testid="ai-chart-review-panel"
      data-read-only="true"
      data-request-identity={identity}
      style={{
        position: "sticky",
        top: 12,
        width: "100%",
        maxHeight: "calc(100vh - 120px)",
        overflow: "auto",
        padding: 14,
        boxSizing: "border-box",
        alignSelf: "flex-start",
        border: "1px solid #cbd5e1",
        borderRadius: 10,
        background: "#f8fafc",
        boxShadow: "0 4px 14px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#e2e8f0",
              fontSize: 17,
              color: "#334155",
            }}
          >
            +
          </span>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a", letterSpacing: "-.01em" }}>{copy.title}</h2>
        </div>
        <button
          type="button"
          aria-label={copy.refresh}
          title={copy.refresh}
          onClick={() => void load(false)}
          disabled={loading}
          style={{
            width: 32,
            height: 32,
            border: "1px solid #cbd5e1",
            background: "#fff",
            borderRadius: 7,
            cursor: "pointer",
            fontSize: 15,
          }}
        >
          ↻
        </button>
      </div>

      {loading ? (
        <div role="status" style={{ padding: 14, textAlign: "center", color: "#64748b", fontSize: 12 }}>
          {copy.loading}
        </div>
      ) : null}

      {!loading && error ? (
        <div role="alert" style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#334155" }}>{copy.unavailable}</p>
          <button type="button" onClick={() => void load(false)}>{copy.retry}</button>
        </div>
      ) : null}

      {!loading && !error ? SECTION_ORDER.map((section) => {
        const findings = grouped[section];
        return (
          <section key={section} aria-labelledby={`medora-assist-${section}`} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
              <h3 id={`medora-assist-${section}`} style={{ margin: 0, fontSize: 12, fontWeight: 750, color: "#1e293b" }}>{copy.tabs[section]}</h3>
              {findings.length ? <span style={{ fontSize: 10.5, color: "#64748b" }}>{findings.length}</span> : null}
            </div>
            {findings.length === 0 ? (
              <div style={{ padding: "3px 0 7px", color: "#94a3b8", fontSize: 11 }}>{copy.empty}</div>
            ) : findings.map((suggestion) => {
              const selectedFeedback = feedback[suggestion.id];
              const pending = feedbackPending[suggestion.id] === true;
              const title = pickAiLocalizedCopy(suggestion.titleLocalized, locale, suggestion.title);
              const summary = pickAiLocalizedCopy(suggestion.summaryLocalized, locale, suggestion.summary);
              const priorityColor = suggestion.priority === "CRITICAL" ? "#991b1b" : suggestion.priority === "HIGH" ? "#9a3412" : "#475569";
              return (
                <article key={suggestion.id} style={{ borderLeft: `3px solid ${priorityColor}`, padding: "8px 8px 8px 10px", marginBottom: 7, background: "#fff" }}>
                  <span style={{ color: priorityColor, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase" }}>{copy.priorities[suggestion.priority]}</span>
                  <h4 style={{ margin: "2px 0 3px", fontSize: 13, color: "#0f172a" }}>{title}</h4>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: "#475569" }}>{summary}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
                    <button type="button" disabled={pending || Boolean(selectedFeedback)} onClick={() => void submitFeedback(suggestion, "HELPFUL")}>{copy.helpful}</button>
                    <button type="button" disabled={pending || Boolean(selectedFeedback)} onClick={() => void submitFeedback(suggestion, "NOT_HELPFUL")}>{copy.notHelpful}</button>
                    {selectedFeedback ? <span role="status" style={{ fontSize: 10, color: "#64748b" }}>{copy.feedbackThanks}</span> : null}
                    {feedbackError[suggestion.id] ? <span role="alert" style={{ fontSize: 10, color: "#b91c1c" }}>{copy.feedbackFailed}</span> : null}
                  </div>
                </article>
              );
            })}
          </section>
        );
      }) : null}

      {!loading && !error ? (
        <section style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, marginTop: 10 }}>
          <h3 style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 750, color: "#475569" }}>{copy.tabs.coding}</h3>
          <div style={{ color: "#64748b", fontSize: 11 }}>{copy.codingInactive}</div>
        </section>
      ) : null}
    </aside>
  );
}
