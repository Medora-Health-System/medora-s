"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AiClinicalReviewOutput as AiClinicalReviewOutputSchema,
  type AiSuggestion,
  type AiSuggestionCategory,
  type ClinicCareAmbulatoryWorkspaceSection,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";

type TabId = "safety" | "diagnostics" | "treatment" | "documentation" | "discharge" | "coding";
type FeedbackRating = "HELPFUL" | "NOT_HELPFUL";
type Locale = "en" | "fr" | "es";

type Copy = {
  title: string; refresh: string; loading: string; empty: string; unavailable: string; retry: string;
  evidence: string; why: string; reviewSection: string; helpful: string; notHelpful: string;
  feedbackThanks: string; feedbackFailed: string; codingInactive: string;
  tabs: Record<TabId, string>; priorities: Record<AiSuggestion["priority"], string>;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Medora Assist", refresh: "Refresh", loading: "Reviewing chart…", empty: "No findings in this section.",
    unavailable: "Medora Assist is temporarily unavailable. Clinical care can continue normally.", retry: "Retry",
    evidence: "Evidence", why: "Why this matters", reviewSection: "Review chart", helpful: "👍 Helpful", notHelpful: "👎 Not helpful",
    feedbackThanks: "Feedback recorded", feedbackFailed: "Feedback could not be recorded. Try again.",
    codingInactive: "Coding & Medical Necessity intelligence is not active yet.",
    tabs: { safety: "Safety", diagnostics: "Diagnostics", treatment: "Treatment", documentation: "Documentation", discharge: "Discharge", coding: "Coding" },
    priorities: { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  },
  fr: {
    title: "Medora Assistance", refresh: "Actualiser", loading: "Analyse du dossier…", empty: "Aucun élément signalé dans cette section.",
    unavailable: "Medora Assistance est temporairement indisponible. Les soins peuvent continuer normalement.", retry: "Réessayer",
    evidence: "Éléments probants", why: "Pourquoi c’est important", reviewSection: "Consulter le dossier", helpful: "👍 Utile", notHelpful: "👎 Pas utile",
    feedbackThanks: "Avis enregistré", feedbackFailed: "L’avis n’a pas pu être enregistré. Réessayez.",
    codingInactive: "L’intelligence de codage et de nécessité médicale n’est pas encore active.",
    tabs: { safety: "Sécurité", diagnostics: "Diagnostics", treatment: "Traitement", documentation: "Documentation", discharge: "Sortie", coding: "Codage" },
    priorities: { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" },
  },
  es: {
    title: "Medora Asistente", refresh: "Actualizar", loading: "Revisando historia…", empty: "No hay hallazgos en esta sección.",
    unavailable: "Medora Asistente no está disponible temporalmente. La atención clínica puede continuar normalmente.", retry: "Reintentar",
    evidence: "Evidencia", why: "Por qué es importante", reviewSection: "Revisar historia", helpful: "👍 Útil", notHelpful: "👎 No útil",
    feedbackThanks: "Comentario registrado", feedbackFailed: "No se pudo registrar el comentario. Inténtelo de nuevo.",
    codingInactive: "La inteligencia de codificación y necesidad médica aún no está activa.",
    tabs: { safety: "Seguridad", diagnostics: "Diagnóstico", treatment: "Tratamiento", documentation: "Documentación", discharge: "Alta", coding: "Codificación" },
    priorities: { CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" },
  },
};

const TAB_ORDER: TabId[] = ["safety", "diagnostics", "treatment", "documentation", "discharge", "coding"];
const TAB_ICON: Record<TabId, string> = { safety: "🛡️", diagnostics: "🩺", treatment: "💊", documentation: "📋", discharge: "🏠", coding: "🧾" };
const TAB_TONE: Record<TabId, { bg: string; border: string; color: string }> = {
  safety: { bg: "#fff1f2", border: "#fecdd3", color: "#be123c" }, diagnostics: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  treatment: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" }, documentation: { bg: "#faf5ff", border: "#e9d5ff", color: "#7e22ce" },
  discharge: { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" }, coding: { bg: "#f8fafc", border: "#cbd5e1", color: "#475569" },
};
const AUTO_REFRESH_MS = 30_000;
const TAB_BY_CATEGORY: Record<AiSuggestionCategory, TabId> = {
  CLINICAL_SAFETY: "safety", DIAGNOSTIC_GAP: "diagnostics", RESULT_FOLLOWUP: "diagnostics", MEDICATION_CONSIDERATION: "treatment",
  ORDER_CONSIDERATION: "treatment", REASSESSMENT_GAP: "documentation", DOCUMENTATION_GAP: "documentation", MDM_GAP: "documentation",
  DISPOSITION_GAP: "discharge", DISCHARGE_SAFETY: "discharge", FOLLOW_UP_GAP: "discharge", CONTRADICTION: "safety", DUPLICATION: "treatment", PENDING_ACTION: "diagnostics",
};
const SECTION_BY_CATEGORY: Partial<Record<AiSuggestionCategory, ClinicCareAmbulatoryWorkspaceSection>> = {
  CLINICAL_SAFETY: "results", DIAGNOSTIC_GAP: "results", RESULT_FOLLOWUP: "results", MEDICATION_CONSIDERATION: "medications", ORDER_CONSIDERATION: "orders",
  REASSESSMENT_GAP: "medical-evaluation", DOCUMENTATION_GAP: "notes", MDM_GAP: "medical-evaluation", DISPOSITION_GAP: "summary", DISCHARGE_SAFETY: "summary",
  FOLLOW_UP_GAP: "follow-up", CONTRADICTION: "medical-evaluation", DUPLICATION: "orders", PENDING_ACTION: "results",
};
const PRIORITY_RANK: Record<AiSuggestion["priority"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function localeKey(language: string): Locale { if (language.toLowerCase().startsWith("fr")) return "fr"; if (language.toLowerCase().startsWith("es")) return "es"; return "en"; }
function priorityTone(priority: AiSuggestion["priority"]) {
  if (priority === "CRITICAL") return { bg: "#fff1f2", border: "#fecdd3", color: "#be123c", icon: "🚨" };
  if (priority === "HIGH") return { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c", icon: "⚠️" };
  if (priority === "MEDIUM") return { bg: "#fffbeb", border: "#fde68a", color: "#a16207", icon: "💡" };
  return { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "ℹ️" };
}

export function AiChartReviewPanel({ encounterId, facilityId, language, onNavigate }: { encounterId: string; facilityId: string; language: string; onNavigate: (section: ClinicCareAmbulatoryWorkspaceSection) => void; }) {
  const copy = COPY[localeKey(language)];
  const [activeTab, setActiveTab] = useState<TabId>("safety");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, FeedbackRating>>({}); const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<Record<string, boolean>>({}); const requestSequence = useRef(0); const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (silent = false) => {
    const sequence = ++requestSequence.current; activeRequest.current?.abort(); const controller = new AbortController(); activeRequest.current = controller;
    if (!silent) { setLoading(true); setError(false); }
    try {
      const raw = await apiFetch(`/ai/chart-review/${encodeURIComponent(encounterId)}`, { facilityId, signal: controller.signal });
      if (sequence !== requestSequence.current) return; const parsed = AiClinicalReviewOutputSchema.safeParse(raw); if (!parsed.success) throw new Error("Invalid AI chart review response");
      setSuggestions([...parsed.data.suggestions].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])); setError(false);
    } catch { if (controller.signal.aborted || sequence !== requestSequence.current) return; if (!silent) { setSuggestions([]); setError(true); } }
    finally { if (sequence === requestSequence.current && !silent) setLoading(false); }
  }, [encounterId, facilityId]);

  useEffect(() => { void load(false); return () => { activeRequest.current?.abort(); requestSequence.current += 1; }; }, [load]);
  useEffect(() => {
    const refreshIfActive = () => { if (document.visibilityState === "visible") void load(true); };
    const interval = window.setInterval(refreshIfActive, AUTO_REFRESH_MS); window.addEventListener("focus", refreshIfActive); document.addEventListener("visibilitychange", refreshIfActive);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refreshIfActive); document.removeEventListener("visibilitychange", refreshIfActive); };
  }, [load]);

  const submitFeedback = useCallback(async (suggestion: AiSuggestion, rating: FeedbackRating) => {
    setFeedbackPending((v) => ({ ...v, [suggestion.id]: true })); setFeedbackError((v) => ({ ...v, [suggestion.id]: false }));
    try { await apiFetch(`/ai/chart-review/${encodeURIComponent(encounterId)}/feedback`, { facilityId, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suggestionId: suggestion.id, category: suggestion.category, snapshotVersion: suggestion.snapshotVersion, rating }) }); setFeedback((v) => ({ ...v, [suggestion.id]: rating })); }
    catch { setFeedbackError((v) => ({ ...v, [suggestion.id]: true })); } finally { setFeedbackPending((v) => ({ ...v, [suggestion.id]: false })); }
  }, [encounterId, facilityId]);

  const grouped = useMemo(() => { const result: Record<TabId, AiSuggestion[]> = { safety: [], diagnostics: [], treatment: [], documentation: [], discharge: [], coding: [] }; for (const suggestion of suggestions) result[TAB_BY_CATEGORY[suggestion.category]].push(suggestion); return result; }, [suggestions]);
  const current = grouped[activeTab];

  return <aside aria-label={copy.title} data-testid="ai-chart-review-panel" data-read-only="true" style={{ position: "sticky", top: 12, width: "100%", maxHeight: "calc(100vh - 120px)", overflow: "auto", padding: 14, boxSizing: "border-box", alignSelf: "flex-start", border: "1px solid #c7d2fe", borderRadius: 16, background: "linear-gradient(155deg,#ffffff 0%,#f5f7ff 52%,#fdf4ff 100%)", boxShadow: "0 10px 28px rgba(79,70,229,.10)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#dbeafe,#ede9fe,#fae8ff)", fontSize: 21 }}>✨</span><h2 style={{ margin: 0, fontSize: 17, color: "#172554", letterSpacing: "-.01em" }}>{copy.title}</h2></div>
      <button type="button" aria-label={copy.refresh} title={copy.refresh} onClick={() => void load(false)} disabled={loading} style={{ width: 32, height: 32, border: "1px solid #dbeafe", background: "rgba(255,255,255,.85)", borderRadius: 10, cursor: "pointer", fontSize: 15 }}>↻</button>
    </div>

    <div role="tablist" aria-label={copy.title} style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 14 }}>
      {TAB_ORDER.map((tab) => { const tone = TAB_TONE[tab]; const active = activeTab === tab; return <button key={tab} type="button" role="tab" aria-selected={active} onClick={() => setActiveTab(tab)} style={{ minHeight: 54, border: `1px solid ${tone.border}`, background: active ? tone.bg : "rgba(255,255,255,.72)", color: tone.color, borderRadius: 11, padding: "6px 4px", fontSize: 9.5, fontWeight: active ? 750 : 600, cursor: "pointer", boxShadow: active ? "0 4px 12px rgba(15,23,42,.06)" : "none" }}><span aria-hidden="true" style={{ display: "block", fontSize: 17, marginBottom: 2 }}>{TAB_ICON[tab]}</span>{copy.tabs[tab]}{tab !== "coding" && grouped[tab].length ? ` · ${grouped[tab].length}` : ""}</button>; })}
    </div>

    {loading ? <div role="status" style={{ padding: 14, textAlign: "center", color: "#64748b", fontSize: 12 }}>✨ {copy.loading}</div> : null}
    {!loading && error ? <div role="alert" style={{ padding: 12, border: "1px solid #fecdd3", borderRadius: 12, background: "#fff1f2" }}><p style={{ margin: 0, fontSize: 12, color: "#9f1239" }}>{copy.unavailable}</p><button type="button" onClick={() => void load(false)} style={{ marginTop: 8, border: "1px solid #fda4af", background: "#fff", borderRadius: 8, padding: "5px 9px" }}>{copy.retry}</button></div> : null}
    {!loading && !error && activeTab === "coding" ? <div style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: "rgba(255,255,255,.75)", color: "#475569", fontSize: 12 }}>🧾 {copy.codingInactive}</div> : null}
    {!loading && !error && activeTab !== "coding" && current.length === 0 ? <div style={{ padding: "18px 10px", textAlign: "center", color: "#64748b", fontSize: 12 }}><div style={{ fontSize: 22, marginBottom: 5 }}>✓</div>{copy.empty}</div> : null}

    {!loading && !error && activeTab !== "coding" ? current.map((suggestion) => {
      const section = suggestion.recommendedActions.find((action) => action.targetSection)?.targetSection ?? SECTION_BY_CATEGORY[suggestion.category];
      const ambulatorySection = typeof section === "string" ? section as ClinicCareAmbulatoryWorkspaceSection : undefined; const tone = priorityTone(suggestion.priority);
      return <article key={suggestion.id} style={{ border: `1px solid ${tone.border}`, borderRadius: 13, padding: 11, marginBottom: 9, background: tone.bg, boxShadow: "0 4px 14px rgba(15,23,42,.04)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><span aria-hidden="true" style={{ fontSize: 19 }}>{tone.icon}</span><div style={{ minWidth: 0, flex: 1 }}><span style={{ color: tone.color, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>{copy.priorities[suggestion.priority]}</span><h3 style={{ margin: "2px 0 3px", fontSize: 13.5, color: "#0f172a" }}>{suggestion.title}</h3><p style={{ margin: 0, fontSize: 11.8, lineHeight: 1.45, color: "#334155" }}>{suggestion.summary}</p></div></div>
        {suggestion.evidence.length ? <details style={{ marginTop: 8 }}><summary style={{ cursor: "pointer", fontSize: 11, color: tone.color, fontWeight: 650 }}>{copy.evidence}</summary><ul style={{ margin: "5px 0 0", paddingLeft: 18, fontSize: 11, color: "#475569" }}>{suggestion.evidence.map((item, index) => <li key={`${item.label}-${index}`}>{item.label}{item.value !== undefined && item.value !== null ? `: ${String(item.value)}` : ""}</li>)}</ul></details> : null}
        <details style={{ marginTop: 5 }}><summary style={{ cursor: "pointer", fontSize: 11, color: tone.color, fontWeight: 650 }}>{copy.why}</summary><p style={{ fontSize: 11, lineHeight: 1.45, color: "#475569" }}>{suggestion.reasoningSummary}</p></details>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>{ambulatorySection ? <button type="button" onClick={() => onNavigate(ambulatorySection)} style={{ border: `1px solid ${tone.border}`, background: "#fff", color: tone.color, borderRadius: 8, padding: "5px 9px", fontSize: 10.5, fontWeight: 650 }}>{copy.reviewSection} →</button> : null}<button type="button" disabled={feedbackPending[suggestion.id]} onClick={() => void submitFeedback(suggestion,"HELPFUL")} style={{ border: "1px solid #e2e8f0", background: feedback[suggestion.id] === "HELPFUL" ? "#ecfdf5" : "#fff", borderRadius: 8, padding: "5px 8px", fontSize: 10 }}>{copy.helpful}</button><button type="button" disabled={feedbackPending[suggestion.id]} onClick={() => void submitFeedback(suggestion,"NOT_HELPFUL")} style={{ border: "1px solid #e2e8f0", background: feedback[suggestion.id] === "NOT_HELPFUL" ? "#fff7ed" : "#fff", borderRadius: 8, padding: "5px 8px", fontSize: 10 }}>{copy.notHelpful}</button></div>
        {feedback[suggestion.id] ? <p style={{ margin: "6px 0 0", fontSize: 10, color: "#64748b" }}>{copy.feedbackThanks}</p> : null}{feedbackError[suggestion.id] ? <p style={{ margin: "6px 0 0", fontSize: 10, color: "#b91c1c" }}>{copy.feedbackFailed}</p> : null}
      </article>;
    }) : null}
  </aside>;
}
