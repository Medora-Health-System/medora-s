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
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { medoraAssistRequestIdentity, shouldAcceptMedoraAssistResponse } from "./medoraAssistRequestIdentity";

type TabId = "safety" | "diagnostics" | "treatment" | "documentation" | "discharge" | "coding";
type FeedbackRating = "HELPFUL" | "NOT_HELPFUL";
type Locale = "en" | "fr" | "es";

type Copy = {
  title: string;
  subtitle: string;
  live: string;
  refresh: string;
  loading: string;
  empty: string;
  unavailable: string;
  retry: string;
  readOnly: string;
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
    subtitle: "Clinical decision support for clinician review",
    live: "Auto-refreshes while this chart is active",
    refresh: "Refresh review",
    loading: "Reviewing the current chart snapshot…",
    empty: "No findings in this section.",
    unavailable: "Medora Assist is unavailable right now. Clinical care can continue normally.",
    retry: "Retry",
    readOnly: "Read-only clinical decision support. Review every finding before acting. Medora AI does not modify the chart or place orders.",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    feedbackThanks: "Feedback recorded",
    feedbackFailed: "Feedback could not be recorded. Refresh and try again.",
    codingInactive: "Coding intelligence is not active. No coding, payer, E/M, or reimbursement recommendations are being generated.",
    tabs: { safety: "Safety", diagnostics: "Diagnosis", treatment: "Treatment", documentation: "Documentation", discharge: "Discharge", coding: "Coding" },
    priorities: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  },
  fr: {
    title: "Medora Assistance",
    subtitle: "Aide à la décision clinique à revoir par le clinicien",
    live: "S’actualise automatiquement lorsque ce dossier est actif",
    refresh: "Actualiser la revue",
    loading: "Analyse de l’instantané actuel du dossier…",
    empty: "Aucun constat dans cette section.",
    unavailable: "Medora Assistance est indisponible pour le moment. Les soins cliniques peuvent continuer normalement.",
    retry: "Réessayer",
    readOnly: "Aide à la décision clinique en lecture seule. Vérifiez chaque constat avant d’agir. Medora AI ne modifie pas le dossier et ne passe aucune ordonnance.",
    helpful: "Utile",
    notHelpful: "Pas utile",
    feedbackThanks: "Avis enregistré",
    feedbackFailed: "L’avis n’a pas pu être enregistré. Actualisez puis réessayez.",
    codingInactive: "L’intelligence de codage n’est pas active. Aucune recommandation de codage, payeur, E/M ou remboursement n’est générée.",
    tabs: { safety: "Sécurité", diagnostics: "Diagnostic", treatment: "Traitement", documentation: "Documentation", discharge: "Sortie", coding: "Codage" },
    priorities: { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" },
  },
  es: {
    title: "Medora Asistente",
    subtitle: "Apoyo a la decisión clínica para revisión del clínico",
    live: "Se actualiza automáticamente mientras esta historia está activa",
    refresh: "Actualizar revisión",
    loading: "Revisando la instantánea actual de la historia…",
    empty: "No hay hallazgos en esta sección.",
    unavailable: "Medora Asistente no está disponible en este momento. La atención clínica puede continuar normalmente.",
    retry: "Reintentar",
    readOnly: "Soporte de decisión clínica de solo lectura. Revise cada hallazgo antes de actuar. Medora AI no modifica la historia ni coloca órdenes.",
    helpful: "Útil",
    notHelpful: "No útil",
    feedbackThanks: "Comentario registrado",
    feedbackFailed: "No se pudo registrar el comentario. Actualice e inténtelo de nuevo.",
    codingInactive: "La inteligencia de codificación no está activa. No se generan recomendaciones de codificación, pagador, E/M ni reembolso.",
    tabs: { safety: "Seguridad", diagnostics: "Diagnóstico", treatment: "Tratamiento", documentation: "Documentación", discharge: "Alta", coding: "Codificación" },
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

function priorityStyle(priority: AiSuggestion["priority"]): React.CSSProperties {
  if (priority === "CRITICAL") return { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
  if (priority === "HIGH") return { background: "#ffedd5", color: "#9a3412", borderColor: "#fed7aa" };
  if (priority === "MEDIUM") return { background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
  return { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" };
}

export function AiChartReviewPanel({ encounterId, facilityId, language }: {
  encounterId: string;
  facilityId: string;
  language: string;
  onNavigate?: (section: ClinicCareAmbulatoryWorkspaceSection) => void;
}) {
  const locale = localeKey(language);
  const copy = COPY[locale];
  const identity = medoraAssistRequestIdentity({ facilityId, encounterId });
  const [activeTab, setActiveTab] = useState<TabId>("safety");
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
      const raw = await apiFetch(`/ai/chart-review/${encodeURIComponent(encounterId)}`, { facilityId, signal: controller.signal });
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
      if (shouldAcceptMedoraAssistResponse({
        requestIdentity,
        activeIdentity: activeIdentity.current,
        requestSequence: sequence,
        activeSequence: requestSequence.current,
      }) && !silent) setLoading(false);
    }
  }, [encounterId, facilityId, identity]);

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
        body: JSON.stringify({ suggestionId: suggestion.id, category: suggestion.category, snapshotVersion: suggestion.snapshotVersion, rating }),
      });
      setFeedback((value) => ({ ...value, [suggestion.id]: rating }));
    } catch {
      setFeedbackError((value) => ({ ...value, [suggestion.id]: true }));
    } finally {
      setFeedbackPending((value) => ({ ...value, [suggestion.id]: false }));
    }
  }, [encounterId, facilityId]);

  const grouped = useMemo(() => {
    const result: Record<TabId, AiSuggestion[]> = { safety: [], diagnostics: [], treatment: [], documentation: [], discharge: [], coding: [] };
    for (const suggestion of suggestions) result[TAB_BY_CATEGORY[suggestion.category]].push(suggestion);
    return result;
  }, [suggestions]);

  const current = grouped[activeTab];

  return (
    <aside aria-label={copy.title} data-testid="ai-chart-review-panel" data-read-only="true" data-request-identity={identity} style={{
      ...MEDORA_CARD_SHELL, position: "sticky", top: 12, width: "100%", maxHeight: "calc(100vh - 120px)",
      overflow: "auto", padding: 14, boxSizing: "border-box", alignSelf: "flex-start",
    }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>{copy.title}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#64748b" }}>{copy.subtitle}</p>
          <p style={{ margin: "2px 0 0", fontSize: 9.5, color: "#94a3b8" }}>{copy.live}</p>
        </div>
        <button type="button" onClick={() => void load(false)} disabled={loading} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 7, padding: "5px 8px", fontSize: 11 }}>
          {copy.refresh}
        </button>
      </div>

      <p style={{ margin: "10px 0", padding: 9, borderRadius: 8, background: "#f8fafc", color: "#475569", fontSize: 11.5, lineHeight: 1.45 }}>{copy.readOnly}</p>

      <div role="tablist" aria-label={copy.title} style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {TAB_ORDER.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} style={{
            border: activeTab === tab ? "1px solid #0f766e" : "1px solid #e2e8f0",
            background: activeTab === tab ? "#f0fdfa" : "#fff", color: activeTab === tab ? "#115e59" : "#475569",
            borderRadius: 999, padding: "5px 8px", fontSize: 10.5,
          }}>
            {copy.tabs[tab]}{tab !== "coding" && grouped[tab].length ? ` (${grouped[tab].length})` : ""}
          </button>
        ))}
      </div>

      {loading ? <p role="status" style={{ fontSize: 12.5, color: "#64748b" }}>{copy.loading}</p> : null}
      {!loading && error ? (
        <div role="alert" style={{ padding: 10, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#991b1b" }}>{copy.unavailable}</p>
          <button type="button" onClick={() => void load(false)} style={{ marginTop: 8 }}>{copy.retry}</button>
        </div>
      ) : null}
      {!loading && !error && activeTab === "coding" ? (
        <div style={{ padding: 11, borderRadius: 8, border: "1px dashed #cbd5e1", background: "#f8fafc", fontSize: 12, color: "#475569" }}>{copy.codingInactive}</div>
      ) : null}
      {!loading && !error && activeTab !== "coding" && current.length === 0 ? <p style={{ fontSize: 12.5, color: "#64748b" }}>{copy.empty}</p> : null}

      {!loading && !error && activeTab !== "coding" ? current.map((suggestion) => {
        const selectedFeedback = feedback[suggestion.id];
        const pending = feedbackPending[suggestion.id] === true;
        const title = pickAiLocalizedCopy(suggestion.titleLocalized, locale, suggestion.title);
        const summary = pickAiLocalizedCopy(suggestion.summaryLocalized, locale, suggestion.summary);
        return (
          <article key={suggestion.id} style={{ borderTop: "1px solid #e2e8f0", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ ...priorityStyle(suggestion.priority), border: "1px solid", borderRadius: 999, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{copy.priorities[suggestion.priority]}</span>
            </div>
            <h3 style={{ margin: "7px 0 4px", fontSize: 13.5, color: "#0f172a" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{summary}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 9 }}>
              <button type="button" disabled={pending || Boolean(selectedFeedback)} onClick={() => void submitFeedback(suggestion, "HELPFUL")}>{copy.helpful}</button>
              <button type="button" disabled={pending || Boolean(selectedFeedback)} onClick={() => void submitFeedback(suggestion, "NOT_HELPFUL")}>{copy.notHelpful}</button>
              {selectedFeedback ? <span role="status" style={{ fontSize: 10.5, color: "#64748b" }}>{copy.feedbackThanks}</span> : null}
              {feedbackError[suggestion.id] ? <span role="alert" style={{ fontSize: 10.5, color: "#991b1b" }}>{copy.feedbackFailed}</span> : null}
            </div>
          </article>
        );
      }) : null}
    </aside>
  );
}
