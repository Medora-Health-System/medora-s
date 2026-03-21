/**
 * Impression navigateur du dossier patient (aperçu synthétique).
 * Données issues du résumé dossier (GET chart-summary) + identité patient.
 */

import type { ChartSummary } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr, getFollowUpStatusLabelFr, getPatientSexLabelFr } from "@/lib/uiLabels";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLine } from "@/lib/patientVitals";
import {
  diagnosisDisplayFr,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  type DischargeSummaryFieldsFr,
} from "./patientChartHelpers";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR");
  } catch {
    return "—";
  }
}

const DISCHARGE_LABELS: Record<keyof DischargeSummaryFieldsFr, string> = {
  disposition: "Disposition",
  exitCondition: "État à la sortie",
  dischargeInstructions: "Consignes de sortie",
  medicationsGiven: "Médicaments administrés",
  followUp: "Suivi",
  returnIfWorse: "Réconsultation si aggravation",
};

function dischargeFieldsHtml(d: DischargeSummaryFieldsFr): string {
  const parts: string[] = [];
  (Object.keys(DISCHARGE_LABELS) as (keyof DischargeSummaryFieldsFr)[]).forEach((k) => {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      parts.push(`<div><strong>${esc(DISCHARGE_LABELS[k])}</strong> ${esc(v)}</div>`);
    }
  });
  return parts.length ? `<div style="font-size:12px;">${parts.join("")}</div>` : "—";
}

export function getPatientChartPrintHtml(params: {
  chartSummary: ChartSummary;
  /** Optionnel : libellé établissement */
  facilityName?: string;
  /** Suivis programmés (résumé) */
  followUps?: FollowUpRow[];
}): string {
  const { chartSummary, facilityName, followUps } = params;
  const p = chartSummary.patient;
  const age = p.dob ? calculateAge(p.dob) : null;
  const sex = getPatientSexLabelFr(undefined, p.sexAtBirth ?? null);

  const encBlocks = [...(chartSummary.recentEncounters ?? [])]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((enc) => {
      const vitalsJson = enc.triage?.vitalsJson as Record<string, number | string | null | undefined> | null | undefined;
      const vitalsLine = vitalsJson ? formatVitalsHeaderLine(vitalsJson) : "—";
      const dx = (enc.encounterDiagnoses ?? [])
        .map((d) => diagnosisDisplayFr(d.description, d.code))
        .join("; ");
      const ordersHtml = (enc.orders ?? [])
        .map((o) => {
          const items = (o.items ?? [])
            .map((it) => `<li>${esc(it.displayLabel)} — ${esc(it.status)}${it.result?.resultText ? ` — ${esc(String(it.result.resultText).slice(0, 400))}` : ""}</li>`)
            .join("");
          return `<div style="margin:6px 0;"><strong>${esc(o.type)}</strong> (${esc(o.status)})<ul style="margin:4px 0 0 16px;">${items}</ul></div>`;
        })
        .join("");

      const nursingLines = parseNursingAssessmentSectionsForChart(enc.nursingAssessment);
      const nursingHtml =
        nursingLines.length > 0
          ? `<ul style="margin:4px 0 0 16px;">${nursingLines.map((s) => `<li><strong>${esc(s.labelFr)}</strong> — ${esc(s.text)}</li>`).join("")}</ul>`
          : "—";

      const discharge = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
      const dischargeHtml = discharge ? dischargeFieldsHtml(discharge) : "—";

      const disp = (enc.encounterMedicationDispenses ?? [])
        .map(
          (d) =>
            `<li>${esc(d.catalogMedication.displayNameFr ?? d.catalogMedication.name)} × ${d.quantityDispensed} — ${fmtDt(d.dispensedAt)}</li>`
        )
        .join("");

      return `
        <section style="margin-bottom:18px; padding-bottom:12px; border-bottom:1px solid #ccc;">
          <h3 style="margin:0 0 8px 0; font-size:15px;">${esc(getEncounterTypeLabelFr(enc.type))} — ${esc(getEncounterStatusLabelFr(enc.status))} — ${fmtDt(enc.createdAt)}</h3>
          <div style="font-size:12px; line-height:1.45;">
            <div><strong>Motif :</strong> ${esc(enc.visitReason ?? enc.chiefComplaint ?? "—")}</div>
            <div><strong>Salle :</strong> ${esc(enc.roomLabel?.trim() || "—")} · <strong>Médecin attribué :</strong> ${esc(enc.physicianAssigned ? `${enc.physicianAssigned.firstName} ${enc.physicianAssigned.lastName}`.trim() : "—")}</div>
            <div><strong>Signes vitaux :</strong> ${esc(vitalsLine)}</div>
            <div><strong>Évaluation infirmière :</strong></div>
            ${nursingHtml}
            <div><strong>Impression / plan :</strong> ${esc(enc.clinicianImpressionPreview ?? "—")}</div>
            <div><strong>Plan :</strong> ${esc(enc.treatmentPlanPreview ?? "—")}</div>
            <div><strong>Diagnostics (visite) :</strong> ${esc(dx || "—")}</div>
            <div><strong>Ordres & résultats :</strong></div>
            ${ordersHtml || "—"}
            <div><strong>Dispensations (visite) :</strong></div>
            <ul style="margin:4px 0 0 16px;">${disp || "<li>—</li>"}</ul>
            <div><strong>Sortie :</strong> ${dischargeHtml}</div>
          </div>
        </section>`;
    })
    .join("");

  const activeDx = (chartSummary.activeDiagnoses ?? [])
    .map((d) => `<li>${esc(diagnosisDisplayFr(d.description, d.code))} (${fmtDt(d.createdAt)})</li>`)
    .join("");

  const dispAll = (chartSummary.recentMedicationDispenses ?? [])
    .map(
      (d) =>
        `<li>${esc(d.catalogMedication.displayNameFr ?? d.catalogMedication.name)} × ${d.quantityDispensed} — ${fmtDt(d.dispensedAt)}</li>`
    )
    .join("");

  const followUpsHtml = (followUps ?? [])
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((fu) => {
      const note = fu.notes?.trim() ? ` — ${esc(fu.notes)}` : "";
      const reason = fu.reason?.trim() ? esc(fu.reason) : "—";
      return `<li>${fmtDt(fu.dueDate)} — <strong>${esc(getFollowUpStatusLabelFr(fu.status))}</strong> — ${reason}${note}</li>`;
    })
    .join("");

  const printedAt = new Date().toLocaleString("fr-FR");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Dossier patient — ${esc([p.firstName, p.lastName].filter(Boolean).join(" "))}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; font-size: 13px; color: #111; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; margin: 0 0 8px 0; }
    h2 { font-size: 15px; margin: 20px 0 8px 0; border-bottom: 1px solid #333; padding-bottom: 4px; }
    .meta { color: #444; line-height: 1.5; margin-bottom: 16px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>Dossier patient</h1>
  ${facilityName ? `<div class="meta"><strong>Établissement :</strong> ${esc(facilityName)}</div>` : ""}
  <div class="meta">
    <strong>${esc([p.firstName, p.lastName].filter(Boolean).join(" "))}</strong><br />
    NIR / MRN : ${esc(p.mrn ?? "—")}<br />
    Date de naissance : ${p.dob ? fmtDt(p.dob) : "—"} · Âge : ${age != null ? `${age} ans` : "—"} · Sexe : ${esc(sex)}<br />
    Téléphone : ${esc(p.phone ?? "—")}
  </div>
  <h2>Consultations (fil chronologique)</h2>
  ${encBlocks || "<p>—</p>"}
  <h2>Diagnostics actifs</h2>
  <ul style="margin:0; padding-left:18px;">${activeDx || "<li>—</li>"}</ul>
  <h2>Dispensations récentes (synthèse)</h2>
  <ul style="margin:0; padding-left:18px;">${dispAll || "<li>—</li>"}</ul>
  <h2>Suivis</h2>
  <ul style="margin:0; padding-left:18px;">${followUpsHtml || "<li>—</li>"}</ul>
  <p style="margin-top:24px; font-size:11px; color:#666;">Document généré le ${esc(printedAt)} — impression à usage de démonstration.</p>
</body>
</html>`;
}

export function printPatientChart(html: string): void {
  const w = typeof window !== "undefined" ? window.open("", "_blank", "noopener,noreferrer") : null;
  if (!w) {
    alert("Impossible d’ouvrir la fenêtre d’impression (popup bloquée).");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}
