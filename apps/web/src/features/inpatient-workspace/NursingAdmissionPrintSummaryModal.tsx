"use client";

import { useEffect, useState } from "react";
import { pickProductUiCopy, resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { fetchNursingAdmissionPrintSummary } from "@/features/hospital-care/inpatientOperationsApi";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

type Section = { sectionId: string; answersSummary?: Record<string, unknown> | null };
type PrintSummary = {
  printStatus?: string;
  facility?: { name?: string | null };
  patient?: { legalName?: string | null; mrn?: string | null; dob?: string | null; sexAtBirth?: string | null };
  encounter?: { admittedAt?: string | null; roomBed?: string | null };
  overview?: Record<string, unknown>;
  sections?: Section[];
  signature?: { signedAt?: string | null; displayName?: string | null; credentials?: string | null } | null;
  amendments?: Array<{ amendmentId: string; reason: string; note?: string | null; createdAt: string; credentials?: string | null }>;
};

const GROUPS = [
  ["ARRIVAL", ["OVERVIEW", "IDENTITY_DEMOGRAPHICS", "SOURCE_ENCOUNTER_SUMMARY"]],
  ["INITIAL", ["NURSING_ADMISSION_ASSESSMENT"]],
  ["HISTORY", ["MEDICAL_HISTORY", "SURGICAL_HISTORY", "HOME_MEDICATIONS", "ALLERGIES", "SOCIAL_HISTORY"]],
  ["SAFETY", ["SKIN_WOUND", "LINES_DRAINS_DEVICES", "FALL_SAFETY", "PAIN", "FUNCTIONAL_MOBILITY", "BELONGINGS_VALUABLES"]],
  ["NUTRITION", ["NUTRITION", "ELIMINATION"]],
  ["PSYCHOSOCIAL", ["PSYCHOSOCIAL", "EDUCATION_COMMUNICATION"]],
] as const;

/** Haiti nursing-admission print timestamps (FR stays fr-CA; ES uses product BCP 47). */
function nursingAdmissionPrintBcp47(language: string): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  if (locale === "fr") return "fr-CA";
  if (locale === "es") return "es-419";
  return "en-US";
}

type NursingAdmissionPrintChrome = {
  title: string;
  close: string;
  print: string;
  patient: string;
  room: string;
  facility: string;
  admission: string;
  reason: string;
  status: string;
  signature: string;
  amendments: string;
  none: string;
  empty: string;
  error: string;
  headings: Record<(typeof GROUPS)[number][0], string>;
};

const PRINT_CHROME = {
  en: {
    title: "Nursing Admission Assessment",
    close: "Close",
    print: "Print",
    patient: "Patient",
    room: "Room",
    facility: "Facility",
    admission: "Admission",
    reason: "Reason for admission",
    status: "Status",
    signature: "SIGNATURE",
    amendments: "Addenda and Corrections",
    none: "No addenda or corrections.",
    empty: "No findings documented.",
    error: "Unable to load the summary.",
    headings: {
      ARRIVAL: "ARRIVAL",
      INITIAL: "INITIAL NURSING ASSESSMENT",
      HISTORY: "HISTORY & RECONCILIATION",
      SAFETY: "SAFETY & FUNCTION",
      NUTRITION: "NUTRITION / ELIMINATION",
      PSYCHOSOCIAL: "PSYCHOSOCIAL / EDUCATION",
    },
  },
  fr: {
    title: "Évaluation infirmière à l’admission",
    close: "Fermer",
    print: "Imprimer",
    patient: "Patient",
    room: "Chambre",
    facility: "Établissement",
    admission: "Admission",
    reason: "Motif d’admission",
    status: "Statut",
    signature: "SIGNATURE",
    amendments: "Addenda et corrections",
    none: "Aucun addenda ni correction.",
    empty: "Aucun constat documenté.",
    error: "Impossible de charger le résumé.",
    headings: {
      ARRIVAL: "ARRIVÉE",
      INITIAL: "ÉVALUATION INFIRMIÈRE INITIALE",
      HISTORY: "ANTÉCÉDENTS ET RÉCONCILIATION",
      SAFETY: "SÉCURITÉ ET FONCTION",
      NUTRITION: "NUTRITION / ÉLIMINATION",
      PSYCHOSOCIAL: "PSYCHOSOCIAL / ÉDUCATION",
    },
  },
  es: {
    title: "Evaluación de enfermería a la admisión",
    close: "Cerrar",
    print: "Imprimir",
    patient: "Paciente",
    room: "Habitación",
    facility: "Establecimiento",
    admission: "Admisión",
    reason: "Motivo de admisión",
    status: "Estado",
    signature: "FIRMA",
    amendments: "Addenda y correcciones",
    none: "No hay addenda ni correcciones.",
    empty: "Ningún hallazgo documentado.",
    error: "No se pudo cargar el resumen.",
    headings: {
      ARRIVAL: "LLEGADA",
      INITIAL: "EVALUACIÓN DE ENFERMERÍA INICIAL",
      HISTORY: "ANTECEDENTES Y RECONCILIACIÓN",
      SAFETY: "SEGURIDAD Y FUNCIÓN",
      NUTRITION: "NUTRICIÓN / ELIMINACIÓN",
      PSYCHOSOCIAL: "PSICOSOCIAL / EDUCACIÓN",
    },
  },
} as const satisfies Record<"en" | "fr" | "es", NursingAdmissionPrintChrome>;

export function formatNursingAdmissionClinicalValue(value: unknown, language: SupportedLanguage): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  if (typeof value === "boolean") {
    return i18nMessage(locale, value ? "nursingAdmissionPrint.yes" : "nursingAdmissionPrint.no");
  }
  if (Array.isArray(value)) return value.map((v) => formatNursingAdmissionClinicalValue(v, language)).join(", ");
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d\d-\d\dT/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.valueOf())) {
      return new Intl.DateTimeFormat(nursingAdmissionPrintBcp47(locale), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    }
  }
  const codeKey = `nursingAdmissionPrint.codes.${raw}`;
  const labeled = i18nMessage(locale, codeKey);
  if (labeled !== codeKey) return labeled;
  return raw.replaceAll("_", " ").toLocaleLowerCase(locale).replace(/^./, (c) => c.toLocaleUpperCase());
}

function fieldLabel(key: string, language: SupportedLanguage): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
  return spaced.charAt(0).toLocaleUpperCase(language) + spaced.slice(1).toLocaleLowerCase(language);
}

function dateTime(value: string | null | undefined, language: SupportedLanguage) {
  if (!value) return DISPLAY_DASH;
  const date = new Date(value);
  const locale = resolveProductUiLanguageOrDefault(language);
  return Number.isNaN(date.valueOf())
    ? DISPLAY_DASH
    : new Intl.DateTimeFormat(nursingAdmissionPrintBcp47(locale), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function NursingAdmissionPrintSummaryModal({ encounterId, open, onClose }: { encounterId: string; open: boolean; onClose: () => void }) {
  const { language } = useI18n();
  const locale = resolveProductUiLanguageOrDefault(language);
  const [summary, setSummary] = useState<PrintSummary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(false);
    void fetchNursingAdmissionPrintSummary(encounterId).then((value) => { if (!cancelled) setSummary(value as PrintSummary); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [encounterId, open]);
  if (!open) return null;
  const text = pickProductUiCopy(locale, PRINT_CHROME, PRINT_CHROME.es);
  const reason = summary?.overview?.reasonForAdmission ?? summary?.overview?.admissionDiagnosis;
  return <div role="dialog" aria-modal="true" data-testid="nursing-admission-print-modal" style={{ position: "fixed", inset: 0, background: "#0f172a73", zIndex: 80, padding: 16, overflow: "auto" }}>
    <article data-testid="nursing-admission-print-summary" style={{ background: "white", borderRadius: 12, maxWidth: 860, margin: "auto", padding: 24 }}>
      <div className="no-print" style={{ display: "flex", gap: 8 }}><button onClick={onClose}>{text.close}</button><button disabled={!summary} onClick={() => window.print()}>{text.print}</button></div>
      {error ? <p role="alert">{text.error}</p> : null}
      {summary ? <>
        <header style={{ borderBottom: "2px solid #0f172a", marginBottom: 16 }}><h2>{text.title}</h2>
          <p><strong>{text.patient}:</strong> {summary.patient?.legalName || DISPLAY_DASH}<br/><strong>MRN:</strong> {summary.patient?.mrn || DISPLAY_DASH}<br/><strong>DOB:</strong> {dateTime(summary.patient?.dob, locale).split(",")[0]} · <strong>Sex:</strong> {formatNursingAdmissionClinicalValue(summary.patient?.sexAtBirth, locale)}<br/><strong>{text.room}:</strong> {summary.encounter?.roomBed || DISPLAY_DASH} · <strong>{text.facility}:</strong> {summary.facility?.name || DISPLAY_DASH}</p>
          <p><strong>{text.admission}:</strong> {dateTime(summary.encounter?.admittedAt, locale)}<br/><strong>{text.reason}:</strong> {reason ? formatNursingAdmissionClinicalValue(reason, locale) : DISPLAY_DASH}<br/><strong>{text.status}:</strong> {formatNursingAdmissionClinicalValue(summary.printStatus, locale)}</p>
        </header>
        {GROUPS.map(([heading, ids]) => {
          const rows = (summary.sections ?? []).filter((s) => (ids as readonly string[]).includes(s.sectionId)).flatMap((s) => Object.entries(s.answersSummary ?? {}));
          return <section key={heading}><h3>{text.headings[heading]}</h3>{rows.length ? <ul>{rows.map(([key, value], i) => <li key={`${key}-${i}`}><strong>{fieldLabel(key, locale)}:</strong> {formatNursingAdmissionClinicalValue(value, locale)}</li>)}</ul> : <p>{text.empty}</p>}</section>;
        })}
        <section><h3>{text.signature}</h3><p>{summary.signature?.displayName || DISPLAY_DASH}{summary.signature?.credentials ? `, ${summary.signature.credentials}` : ""}<br/>{dateTime(summary.signature?.signedAt, locale)}</p></section>
        <section><h3>{text.amendments}</h3>{summary.amendments?.length ? <ul>{summary.amendments.map((a) => <li key={a.amendmentId}>{dateTime(a.createdAt, locale)} — {a.note || a.reason}</li>)}</ul> : <p>{text.none}</p>}</section>
      </> : null}
    </article>
  </div>;
}
