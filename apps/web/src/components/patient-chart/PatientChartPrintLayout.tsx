/**
 * Impression navigateur du dossier médical patient (résumé chart-summary + suivis).
 * Données déjà chargées — aucun fetch. Libellés FR, pas d’UUID dans le HTML.
 */

import type { ChartSummary, ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import {
  getEncounterStatusLabelFr,
  getEncounterTypeLabelFr,
  getFollowUpStatusLabelFr,
  getPatientSexLabelFr,
} from "@/lib/uiLabels";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLine } from "@/lib/patientVitals";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import {
  diagnosisDisplayFr,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  nirMrnDisplay,
  type DischargeSummaryFieldsFr,
} from "./patientChartHelpers";
import { parseNursingProceduresForChart } from "@/lib/nursingProcedures";

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

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

const DISCHARGE_LABELS: Record<keyof DischargeSummaryFieldsFr, string> = {
  disposition: "Disposition",
  exitCondition: "État à la sortie",
  dischargeInstructions: "Instructions de sortie",
  medicationsGiven: "Médicaments remis / prescrits",
  followUp: "Suivi recommandé",
  returnIfWorse: "Retour si aggravation",
  patientDestination: "Destination du patient",
  dischargeMode: "Mode de sortie",
};

function dischargeFieldsHtml(d: DischargeSummaryFieldsFr): string {
  const parts: string[] = [];
  (Object.keys(DISCHARGE_LABELS) as (keyof DischargeSummaryFieldsFr)[]).forEach((k) => {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      parts.push(`<div style="margin:2px 0;"><strong>${esc(DISCHARGE_LABELS[k])}</strong> ${esc(v)}</div>`);
    }
  });
  return parts.length ? parts.join("") : "";
}

function orderTypeHeadingFr(orderType: string): string {
  const m: Record<string, string> = {
    LAB: "Analyses demandées",
    IMAGING: "Imagerie demandée",
    MEDICATION: "Médicaments prescrits",
    CARE: "Soins / procédures demandés",
  };
  return m[orderType] ?? "Ordres";
}

function physicianName(u: { firstName: string; lastName: string } | null | undefined): string {
  if (!u) return "—";
  const s = `${u.firstName} ${u.lastName}`.trim();
  return s || "—";
}

function flattenOrderItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const orders = enc.orders ?? [];
  const items: ChartSummaryOrderItem[] = [];
  for (const o of orders) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function resultSnippet(it: ChartSummaryOrderItem): string {
  const parts: string[] = [];
  if (it.result?.resultText?.trim()) parts.push(it.result.resultText.trim().slice(0, 500));
  if (it.result?.attachmentSummaryFr?.trim()) parts.push(it.result.attachmentSummaryFr.trim());
  if (it.result?.verifiedAt) parts.push(`Validé le ${fmtShort(it.result.verifiedAt)}`);
  return parts.join(" — ") || "—";
}

function isResultLike(it: ChartSummaryOrderItem): boolean {
  if (it.catalogItemType !== "LAB_TEST" && it.catalogItemType !== "IMAGING_STUDY") return false;
  return !!(
    it.result?.resultText?.trim() ||
    it.result?.attachmentSummaryFr ||
    it.result?.verifiedAt ||
    it.status === "RESULTED" ||
    it.status === "VERIFIED"
  );
}

/**
 * HTML d’impression du dossier (identité, vitaux, historique, diagnostics, résultats, médicaments, sorties, suivis).
 */
export function getPatientChartPrintHtml(params: {
  chartSummary: ChartSummary;
  facilityName?: string;
  followUps?: FollowUpRow[];
}): string {
  const { chartSummary, facilityName, followUps } = params;
  const p = chartSummary.patient;
  const age = p.dob ? calculateAge(p.dob) : null;
  const sex = getPatientSexLabelFr(undefined, p.sexAtBirth ?? null);
  const ids = nirMrnDisplay({
    nationalId: undefined,
    mrn: p.mrn,
    globalMrn: p.globalMrn,
  });

  const latestVitalsJson = p.latestVitalsJson as Record<string, number | string | null | undefined> | null | undefined;
  const latestVitalsLine =
    latestVitalsJson && Object.keys(latestVitalsJson).length > 0
      ? formatVitalsHeaderLine(latestVitalsJson)
      : "—";
  const latestVitalsWhen = p.latestVitalsAt ? fmtDt(p.latestVitalsAt) : null;

  const encounters = [...(chartSummary.recentEncounters ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const encBlocks = encounters
    .map((enc) => {
      const vitalsJson = enc.triage?.vitalsJson as Record<string, number | string | null | undefined> | null | undefined;
      const vitalsLine = vitalsJson ? formatVitalsHeaderLine(vitalsJson) : "—";
      const dxVisit = (enc.encounterDiagnoses ?? [])
        .map((d) => diagnosisDisplayFr(d.description, d.code))
        .join(" ; ");

      const nursingLines = [
        ...parseNursingAssessmentSectionsForChart(enc.nursingAssessment),
        ...parseNursingProceduresForChart(enc.nursingAssessment),
      ];
      const nursingHtml =
        nursingLines.length > 0
          ? `<ul style="margin:4px 0 0 16px;">${nursingLines
              .map((s) => `<li><strong>${esc(s.labelFr)}</strong> — ${esc(s.text)}</li>`)
              .join("")}</ul>`
          : `<p style="margin:4px 0; color:#000;">—</p>`;

      const ordersHtml = (enc.orders ?? [])
        .map((o) => {
          const cancelNote =
            o.status === "CANCELLED" && (o.cancelledByDisplayFr || o.cancelledAt || o.cancellationReason)
              ? `<div style="font-size:11px;color:#b71c1c;margin:4px 0 6px 0;line-height:1.4;">${
                  o.cancelledByDisplayFr
                    ? `Annulée par ${esc(o.cancelledByDisplayFr)}${o.cancelledAt ? ` le ${esc(fmtDt(o.cancelledAt))}` : ""}`
                    : ""
                }${
                  o.cancellationReason
                    ? `${o.cancelledByDisplayFr || o.cancelledAt ? "<br/>" : ""}Raison : ${esc(o.cancellationReason)}`
                    : ""
                }</div>`
              : "";
          const items = (o.items ?? [])
            .map((it) => {
              const label = esc(it.displayLabel || "—");
              const st = esc(getOrderItemStatusLabel(it.status));
              return `<li>${label} <span style="color:#333;">(${st})</span></li>`;
            })
            .join("");
          return `<div style="margin:6px 0;"><strong>${esc(orderTypeHeadingFr(o.type))}</strong>${cancelNote}<ul style="margin:4px 0 0 16px;">${items || "<li>—</li>"}</ul></div>`;
        })
        .join("");

      const itemsFlat = flattenOrderItems(enc);
      const adminLines = itemsFlat.filter((it) => it.catalogItemType === "MEDICATION" && it.completedAt);
      const adminHtml =
        adminLines.length > 0
          ? `<ul style="margin:4px 0 0 16px;">${adminLines
              .map((it) => {
                const who = it.completedBy
                  ? esc(`${it.completedBy.firstName} ${it.completedBy.lastName}`.trim())
                  : "—";
                return `<li>${esc(it.displayLabel)} — ${fmtShort(it.completedAt)} — ${who}</li>`;
              })
              .join("")}</ul>`
          : `<p style="margin:4px 0;">—</p>`;

      const disp = (enc.encounterMedicationDispenses ?? [])
        .map(
          (d) =>
            `<li>${esc(d.catalogMedication.displayNameFr ?? d.catalogMedication.name)} × ${d.quantityDispensed} — ${fmtShort(d.dispensedAt)}</li>`
        )
        .join("");

      return `
        <section style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #000;">
          <h3 style="margin:0 0 8px 0; font-size:14px; font-weight:700;">${esc(getEncounterTypeLabelFr(enc.type))} — ${esc(
        getEncounterStatusLabelFr(enc.status)
      )} — ${fmtShort(enc.createdAt)}</h3>
          <div style="font-size:12px; line-height:1.5; color:#000;">
            <p style="margin:4px 0;"><strong>Motif :</strong> ${esc(enc.visitReason ?? enc.chiefComplaint ?? "—")}</p>
            <p style="margin:4px 0;"><strong>Salle :</strong> ${esc(enc.roomLabel?.trim() || "—")} · <strong>Médecin attribué :</strong> ${esc(
        physicianName(enc.physicianAssigned ?? null)
      )}</p>
            <p style="margin:4px 0;"><strong>Signes vitaux (accueil) :</strong> ${esc(vitalsLine)}</p>
            <p style="margin:8px 0 4px 0;"><strong>Évaluation infirmière</strong></p>
            ${nursingHtml}
            <p style="margin:8px 0 4px 0;"><strong>Évaluation médicale</strong></p>
            <p style="margin:4px 0;"><strong>Impression clinique :</strong> ${esc(enc.clinicianImpressionPreview ?? "—")}</p>
            <p style="margin:4px 0;"><strong>Plan thérapeutique :</strong> ${esc(enc.treatmentPlanPreview ?? "—")}</p>
            <p style="margin:4px 0;"><strong>Diagnostics (cette visite) :</strong> ${esc(dxVisit || "—")}</p>
            <p style="margin:8px 0 4px 0;"><strong>Ordres</strong></p>
            ${ordersHtml || "<p style=\"margin:4px 0;\">—</p>"}
            <p style="margin:8px 0 4px 0;"><strong>Administrations (médicaments)</strong></p>
            ${adminHtml}
            <p style="margin:8px 0 4px 0;"><strong>Dispensation (cette visite)</strong></p>
            <ul style="margin:4px 0 0 16px;">${disp || "<li>—</li>"}</ul>
          </div>
        </section>`;
    })
    .join("");

  const activeDx = (chartSummary.activeDiagnoses ?? [])
    .map(
      (d) =>
        `<li>${esc(diagnosisDisplayFr(d.description, d.code))}${
          d.onsetDate ? ` <span style="color:#333;">(début ${esc(fmtDt(d.onsetDate))})</span>` : ""
        }</li>`
    )
    .join("");

  const resultsLines: string[] = [];
  for (const enc of encounters) {
    const when = fmtShort(enc.createdAt);
    const typeLbl = getEncounterTypeLabelFr(enc.type);
    for (const it of flattenOrderItems(enc)) {
      if (!isResultLike(it)) continue;
      const label = esc(it.displayLabel || "—");
      const snip = esc(resultSnippet(it));
      resultsLines.push(
        `<li><strong>${typeLbl}</strong> (${when}) — ${label}<br/><span style="font-size:11px;">${snip}</span></li>`
      );
    }
  }

  const dispAll = (chartSummary.recentMedicationDispenses ?? [])
    .map((d) => {
      const med = esc(d.catalogMedication.displayNameFr ?? d.catalogMedication.name);
      const by = d.dispensedBy
        ? esc(`${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim())
        : "—";
      return `<li>${med} × ${d.quantityDispensed} — ${fmtShort(d.dispensedAt)} — ${by}${
        d.dosageInstructions ? ` — ${esc(d.dosageInstructions)}` : ""
      }</li>`;
    })
    .join("");

  const sortieBlocks = encounters
    .map((enc) => {
      const d = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
      if (!d) return "";
      const inner = dischargeFieldsHtml(d);
      if (!inner.trim()) return "";
      return `<div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #ccc;">
        <p style="margin:0 0 6px 0; font-weight:700;">${esc(getEncounterTypeLabelFr(enc.type))} — ${fmtShort(enc.createdAt)}</p>
        ${inner}
      </div>`;
    })
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
  <title>Dossier médical — ${esc([p.firstName, p.lastName].filter(Boolean).join(" "))}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; padding: 20px; font-size: 13px; color: #000; background: #fff; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 18px; margin: 0 0 10px 0; font-weight: 700; }
    h2 { font-size: 14px; margin: 22px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .meta p { margin: 4px 0; line-height: 1.45; }
    ul { margin: 6px 0 0 0; padding-left: 18px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>Dossier médical</h1>
  ${facilityName ? `<div class="meta"><p><strong>Établissement</strong> ${esc(facilityName)}</p></div>` : ""}

  <h2>Identité patient</h2>
  <div class="meta">
    <p><strong>Nom</strong> ${esc([p.firstName, p.lastName].filter(Boolean).join(" ") || "—")}</p>
    <p><strong>NIR / MRN</strong> ${esc(ids)}</p>
    <p><strong>Date de naissance</strong> ${p.dob ? fmtDt(p.dob) : "—"} · <strong>Âge</strong> ${age != null ? `${age} ans` : "—"} · <strong>Sexe</strong> ${esc(sex)}</p>
    <p><strong>Téléphone</strong> ${esc(p.phone ?? "—")}</p>
    ${p.address || p.city ? `<p><strong>Adresse</strong> ${esc([p.address, p.city, p.country].filter(Boolean).join(", ") || "—")}</p>` : ""}
  </div>

  <h2>Signes vitaux</h2>
  <div class="meta">
    <p><strong>Dernier relevé</strong> ${esc(latestVitalsLine)}</p>
    ${latestVitalsWhen ? `<p><strong>Date du relevé</strong> ${esc(latestVitalsWhen)}</p>` : ""}
  </div>

  <h2>Historique clinique par consultation</h2>
  ${encBlocks || "<p>—</p>"}

  <h2>Diagnostics</h2>
  <ul>${activeDx || "<li>—</li>"}</ul>

  <h2>Résultats</h2>
  <ul>${resultsLines.length ? resultsLines.join("") : "<li>—</li>"}</ul>

  <h2>Médicaments</h2>
  <p style="font-size:12px; margin:0 0 6px 0;">Dispensations récentes (toutes consultations)</p>
  <ul>${dispAll || "<li>—</li>"}</ul>

  <h2>Sortie</h2>
  ${sortieBlocks.trim() ? sortieBlocks : "<p>—</p>"}

  <h2>Suivis</h2>
  <ul>${followUpsHtml || "<li>—</li>"}</ul>

  <p style="margin-top:24px; font-size:11px; color:#000;">Document généré le ${esc(printedAt)} — Medora-S</p>
</body>
</html>`;
}

export function printPatientChart(html: string): void {
  const w = typeof window !== "undefined" ? window.open("", "_blank", "noopener,noreferrer") : null;
  if (!w) {
    alert(
      "Impossible d'ouvrir la fenêtre d'impression : les pop-ups sont peut-être bloqués. Autorisez les pop-ups pour ce site et réessayez."
    );
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
