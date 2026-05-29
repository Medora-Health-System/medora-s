/**
 * Browser print of patient chart preview (chart summary + follow-ups).
 * Live preview only — not a finalized legal export. Data already loaded — no fetch.
 */

import type { SupportedLanguage } from "@/i18n/config";
import type { ChartSummary, ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import {
  printDateLocale,
  printOrderItemChartLabel,
  printPatientSexLabel,
  printT,
} from "@/lib/printI18n";
import { calculateAge } from "@/lib/patientDisplay";
import { selectClinicalDocumentationPayloadSummary } from "@medora/shared";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import {
  diagnosisDisplayFr,
  DISCHARGE_SUMMARY_CORE_STRING_KEYS,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS,
  nirMrnDisplay,
  type DischargeSummaryFieldsFr,
} from "./patientChartHelpers";
import { parseNursingProceduresForChart } from "@/lib/nursingProcedures";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { chartSummaryAttachmentSummary, chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";
import { formatOrderAuthorityLines } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDt(iso: string | null | undefined, lang: SupportedLanguage): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(printDateLocale(lang));
  } catch {
    return "—";
  }
}

function fmtShort(iso: string | null | undefined, lang: SupportedLanguage): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(printDateLocale(lang), { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

const DISCHARGE_CORE_FIELD_LABEL_KEYS: Record<(typeof DISCHARGE_SUMMARY_CORE_STRING_KEYS)[number], string> = {
  disposition: "encounterChrome.modals.dischargeField.disposition",
  exitCondition: "encounterChrome.modals.dischargeField.exitCondition",
  dischargeInstructions: "encounterChrome.modals.dischargeField.dischargeInstructions",
  medicationsGiven: "encounterChrome.modals.dischargeField.medicationsGiven",
  followUp: "encounterChrome.modals.dischargeField.followUp",
  returnIfWorse: "encounterChrome.modals.dischargeField.returnIfWorse",
  patientDestination: "encounterChrome.modals.dischargeField.patientDestination",
  dischargeMode: "encounterChrome.modals.dischargeField.dischargeMode",
};

function dischargeFieldsHtml(lang: SupportedLanguage, d: DischargeSummaryFieldsFr): string {
  const parts: string[] = [];
  for (const k of DISCHARGE_SUMMARY_CORE_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      parts.push(
        `<div style="margin:2px 0;"><strong>${esc(printT(lang, DISCHARGE_CORE_FIELD_LABEL_KEYS[k]))}</strong> ${esc(v)}</div>`
      );
    }
  }
  for (const k of PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) {
      parts.push(
        `<div style="margin:2px 0;"><strong>${esc(printT(lang, `patientDischargeInstructions.${k}`))}</strong> ${esc(v)}</div>`
      );
    }
  }
  if (d.patientInstructionsGiven === true) {
    parts.push(
      `<div style="margin:2px 0;"><strong>${esc(printT(lang, "printOutput.patientDischargeInstructions.givenYes"))}</strong> ${esc(printT(lang, "printOutput.erPacket.yes"))}</div>`
    );
  }
  if (d.instructionsGivenBy?.trim()) {
    parts.push(
      `<div style="margin:2px 0;"><strong>${esc(printT(lang, "printOutput.patientDischargeInstructions.metaBy"))}</strong> ${esc(d.instructionsGivenBy.trim())}</div>`
    );
  }
  if (d.instructionsGivenAt?.trim()) {
    parts.push(
      `<div style="margin:2px 0;"><strong>${esc(printT(lang, "printOutput.patientDischargeInstructions.metaAt"))}</strong> ${esc(fmtShort(d.instructionsGivenAt, lang))}</div>`
    );
  }
  return parts.length ? parts.join("") : "";
}

function orderTypeHeading(lang: SupportedLanguage, orderType: string): string {
  const map: Record<string, string> = {
    LAB: "encounterChrome.chartTabs.orderTypeLAB",
    IMAGING: "encounterChrome.chartTabs.orderTypeIMAGING",
    MEDICATION: "encounterChrome.chartTabs.orderTypeMEDICATION",
    CARE: "encounterChrome.chartTabs.orderTypeCARE",
  };
  const sub = map[orderType];
  return sub ? printT(lang, sub) : printT(lang, "encounterChrome.chartTabs.orderTypeOTHER");
}

function encounterTypeLabel(lang: SupportedLanguage, type: string): string {
  const k = `encounterChrome.encounterTypes.${type}`;
  const v = printT(lang, k);
  return v !== k ? v : type;
}

function encounterStatusLabel(lang: SupportedLanguage, status: string): string {
  const k = `encounterChrome.encounterStatuses.${status}`;
  const v = printT(lang, k);
  return v !== k ? v : status;
}

function followUpStatusLabel(lang: SupportedLanguage, status: string): string {
  const k = `printOutput.patientChart.followUpStatus.${status}`;
  const v = printT(lang, k);
  return v !== k ? v : status;
}

function physicianName(u: { firstName: string; lastName: string } | null | undefined): string {
  if (!u) return "—";
  const s = `${u.firstName} ${u.lastName}`.trim();
  return s || "—";
}

function chartOrderLineT(lang: SupportedLanguage): (k: string) => string {
  return (k: string) => printT(lang, k);
}

function flattenOrderItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const orders = enc.orders ?? [];
  const items: ChartSummaryOrderItem[] = [];
  for (const o of orders) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function resultSnippet(lang: SupportedLanguage, it: ChartSummaryOrderItem): string {
  const parts: string[] = [];
  if (it.result?.resultText?.trim()) parts.push(it.result.resultText.trim().slice(0, 500));
  const attSnip = chartSummaryAttachmentSummary(it.result, lang);
  if (attSnip) parts.push(attSnip);
  if (it.result?.verifiedAt) {
    parts.push(
      `${printT(lang, "printOutput.patientChart.resultVerified")} ${fmtShort(it.result.verifiedAt, lang)}`
    );
  }
  return parts.join(" — ") || "—";
}

function isResultLike(it: ChartSummaryOrderItem, lang: SupportedLanguage): boolean {
  if (it.catalogItemType !== "LAB_TEST" && it.catalogItemType !== "IMAGING_STUDY") return false;
  return !!(
    it.result?.resultText?.trim() ||
    chartSummaryAttachmentSummary(it.result, lang) ||
    (it.result?.attachments && it.result.attachments.length > 0) ||
    it.status === "RESULTED" ||
    it.status === "VERIFIED"
  );
}

/**
 * HTML for patient chart preview print (identity, vitals, history, diagnoses, results, medications, discharge, follow-ups).
 * Live preview — not a finalized legal export.
 */
export function getPatientChartPrintHtml(params: {
  chartSummary: ChartSummary;
  facilityName?: string;
  followUps?: FollowUpRow[];
  language: SupportedLanguage;
}): string {
  const { chartSummary, facilityName, followUps, language } = params;
  const lang = language;
  const loc = printDateLocale(lang);
  const pc = (key: string) => printT(lang, `printOutput.patientChart.${key}`);
  const p = chartSummary.patient;
  const age = p.dob ? calculateAge(p.dob) : null;
  const sex = printPatientSexLabel(lang, undefined, p.sexAtBirth ?? null);
  const ids = nirMrnDisplay({
    nationalId: undefined,
    mrn: p.mrn,
    globalMrn: p.globalMrn,
  });

  const latestVitalsJson = p.latestVitalsJson as Record<string, number | string | null | undefined> | null | undefined;
  const latestVitalsLine =
    latestVitalsJson && Object.keys(latestVitalsJson).length > 0
      ? formatVitalsHeaderLineForLocale(latestVitalsJson, lang)
      : "—";
  const latestVitalsWhen = p.latestVitalsAt ? fmtDt(p.latestVitalsAt, lang) : null;

  const encounters = [...(chartSummary.recentEncounters ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const encBlocks = encounters
    .map((enc) => {
      const vitalsJson = enc.triage?.vitalsJson as Record<string, number | string | null | undefined> | null | undefined;
      const vitalsLine = vitalsJson ? formatVitalsHeaderLineForLocale(vitalsJson, lang) : "—";
      const dxVisit = (enc.encounterDiagnoses ?? [])
        .map((d) => diagnosisDisplayFr(d.description, d.code))
        .join(" ; ");

      const nursingLines = [
        ...parseNursingAssessmentSectionsForChart(enc.nursingAssessment, language),
        ...parseNursingProceduresForChart(enc.nursingAssessment, language),
      ];
      const nursingHtml =
        nursingLines.length > 0
          ? `<ul style="margin:4px 0 0 16px;">${nursingLines
              .map((s) => `<li><strong>${esc(s.label)}</strong> — ${esc(s.text)}</li>`)
              .join("")}</ul>`
          : `<p style="margin:4px 0; color:#000;">${esc(pc("emptyDash"))}</p>`;

      const cancelPrefix = printT(lang, "printOutput.patientChart.orderCancelledPrefix");
      const cancelOn = printT(lang, "printOutput.patientChart.orderCancelledOn");
      const reasonLbl = printT(lang, "printOutput.patientChart.cancellationReason");

      const ordersHtml = (enc.orders ?? [])
        .map((o) => {
          const authorityHtml = formatOrderAuthorityLines(o, (key) => printT(lang, key))
            .map((line) => esc(line))
            .join(" · ");
          const attributionHtml = formatOrderAttributionLines(o, (key) => printT(lang, key), lang)
            .map((line) => esc(line))
            .join("<br/>");
          const cancelNote =
            o.status === "CANCELLED" && (o.cancelledByDisplayFr || o.cancelledAt || o.cancellationReason)
              ? `<div style="font-size:11px;color:#b71c1c;margin:4px 0 6px 0;line-height:1.4;">${
                  o.cancelledByDisplayFr
                    ? `${esc(cancelPrefix)} ${esc(o.cancelledByDisplayFr)}${o.cancelledAt ? ` ${esc(cancelOn)} ${esc(fmtDt(o.cancelledAt, lang))}` : ""}`
                    : ""
                }${
                  o.cancellationReason
                    ? `${o.cancelledByDisplayFr || o.cancelledAt ? "<br/>" : ""}${esc(reasonLbl)}: ${esc(o.cancellationReason)}`
                    : ""
                }</div>`
              : "";
          const items = (o.items ?? [])
            .map((it) => {
              const rawLabel = chartSummaryOrderItemLineLabel(it, lang, chartOrderLineT(lang)) || "—";
              const label = esc(rawLabel);
              const highRiskWarning =
                it.catalogItemType === "MEDICATION"
                  ? highRiskMedicationWarning({ ...it, label: rawLabel }, (key) => printT(lang, key))
                  : null;
              const st = esc(printOrderItemChartLabel(lang, it.status));
              return `<li>${label} <span style="color:#333;">(${st})</span>${
                highRiskWarning
                  ? `<div style="font-size:11px;color:#b45309;margin-top:2px;font-weight:600;">${esc(highRiskWarning)}</div>`
                  : ""
              }</li>`;
            })
            .join("");
          return `<div style="margin:6px 0;"><strong>${esc(orderTypeHeading(lang, o.type))}</strong><div style="font-size:11px;color:#555;margin-top:2px;overflow-wrap:anywhere;">${authorityHtml}</div>${attributionHtml ? `<div style="font-size:11px;color:#555;margin-top:2px;overflow-wrap:anywhere;">${attributionHtml}</div>` : ""}${cancelNote}<ul style="margin:4px 0 0 16px;">${items || `<li>${esc(pc("emptyDash"))}</li>`}</ul></div>`;
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
                  : esc(pc("emptyDash"));
                return `<li>${esc(chartSummaryOrderItemLineLabel(it, lang, chartOrderLineT(lang)))} — ${fmtShort(it.completedAt, lang)} — ${who}</li>`;
              })
              .join("")}</ul>`
          : `<p style="margin:4px 0;">${esc(pc("emptyDash"))}</p>`;

      const disp = (enc.encounterMedicationDispenses ?? [])
        .map(
          (d) =>
            `<li>${esc(
              catalogMedicationNameForLocale(d.catalogMedication, lang) ||
                d.catalogMedication.code ||
                "—"
            )} × ${d.quantityDispensed} — ${fmtShort(d.dispensedAt, lang)}</li>`
        )
        .join("");

      const signedOnWord = printT(lang, "printOutput.patientChart.signedOn");
      const addendumBy = printT(lang, "printOutput.patientChart.addendumBy");
      const onDateWord = printT(lang, "printOutput.patientChart.onDate");

      return `
        <section style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #000;">
          <h3 style="margin:0 0 8px 0; font-size:14px; font-weight:700;">${esc(encounterTypeLabel(lang, enc.type))} — ${esc(
        encounterStatusLabel(lang, enc.status)
      )} — ${fmtShort(enc.createdAt, lang)}</h3>
          <div style="font-size:12px; line-height:1.5; color:#000;">
            <p style="margin:4px 0;"><strong>${esc(pc("chiefComplaint"))} :</strong> ${esc(enc.visitReason ?? enc.chiefComplaint ?? "—")}</p>
            <p style="margin:4px 0;"><strong>${esc(pc("room"))} :</strong> ${esc(enc.roomLabel?.trim() || "—")} · <strong>${esc(pc("assignedPhysician"))} :</strong> ${esc(
        physicianName(enc.physicianAssigned ?? null)
      )}</p>
            <p style="margin:4px 0;"><strong>${esc(pc("vitalsIntake"))} :</strong> ${esc(vitalsLine)}</p>
            <p style="margin:8px 0 4px 0;"><strong>${esc(pc("nursingAssessment"))}</strong></p>
            ${nursingHtml}
            <p style="margin:8px 0 4px 0;"><strong>${esc(pc("physicianDocumentation"))}</strong></p>
            ${
              enc.providerDocumentationStatus === "SIGNED" &&
              enc.providerDocumentationSignedByDisplayFr &&
              enc.providerDocumentationSignedAt
                ? `<p style="margin:4px 0;font-size:11px;color:#1565c0;"><strong>${esc(
                    printT(lang, "printOutput.patientChart.signedPhysicianPrefix")
                  )}</strong> ${esc(enc.providerDocumentationSignedByDisplayFr)} <strong>${esc(signedOnWord)}</strong> ${esc(
                    fmtDt(enc.providerDocumentationSignedAt, lang)
                  )}</p>`
                : ""
            }
            ${
              (enc.providerAddenda ?? []).length > 0
                ? `<p style="margin:8px 0 4px 0;font-size:12px;"><strong>${esc(pc("addenda"))}</strong></p>${(enc.providerAddenda ?? [])
                    .map(
                      (ad) =>
                        `<div style="margin-bottom:8px;font-size:11px;"><p style="margin:0;"><strong>${esc(addendumBy)}</strong> ${esc(
                          ad.createdByDisplayFr ?? "—"
                        )} <strong>${esc(onDateWord)}</strong> ${esc(fmtDt(ad.createdAt, lang))}</p><p style="margin:4px 0 0 0;white-space:pre-wrap;">${esc(
                          ad.text
                        )}</p></div>`
                    )
                    .join("")}`
                : ""
            }
            ${
              (enc.encounterNotes ?? []).length > 0
                ? `<p style="margin:8px 0 4px 0;font-size:12px;"><strong>${esc(pc("encounterNotes"))}</strong></p>${(enc.encounterNotes ?? [])
                    .map(
                      (note) => {
                        const tags: string[] = [];
                        if (note.voidedAt) tags.push("[VOIDED]");
                        if (note.isAmendment) tags.push("[AMENDMENT]");
                        if (note.cosignedAt) tags.push("[COSIGNED]");
                        const tagLine = tags.length ? `<span style="color:#64748b;"> ${esc(tags.join(" "))}</span>` : "";
                        const reasonLine =
                          note.voidReasonCode
                            ? `<p style="margin:2px 0;font-size:10px;color:#b91c1c;">${esc(String(note.voidReasonCode))}</p>`
                            : note.amendmentReason
                              ? `<p style="margin:2px 0;font-size:10px;color:#1d4ed8;">${esc(note.amendmentReason)}</p>`
                              : "";
                        return `<div style="margin-bottom:8px;font-size:11px;"><p style="margin:0;"><strong>${esc(
                          note.noteType ?? "—"
                        )}</strong> — ${esc(note.authorDisplayName ?? "—")} (${esc(
                          note.authorRoleTitle ?? "—"
                        )}) <strong>${esc(onDateWord)}</strong> ${esc(fmtDt(note.createdAt, lang))}${tagLine}</p>${reasonLine}<p style="margin:4px 0 0 0;white-space:pre-wrap;">${esc(
                          note.body ?? ""
                        )}</p></div>`;
                      }
                    )
                    .join("")}`
                : ""
            }
            ${
              (enc.clinicalDocumentationEntries ?? []).length > 0
                ? `<p style="margin:8px 0 4px 0;font-size:12px;"><strong>${esc(pc("clinicalDocumentation"))}</strong></p>${(enc.clinicalDocumentationEntries ?? [])
                    .map((entry) => {
                      const title = lang === "en" ? entry.cardTitleEn : entry.cardTitleFr;
                      const summaryLines = selectClinicalDocumentationPayloadSummary(
                        entry,
                        lang === "en" ? "en" : "fr"
                      );
                      const summary =
                        summaryLines.length > 0
                          ? `<ul style="margin:4px 0 0 16px;">${summaryLines
                              .map(
                                (line) =>
                                  `<li><strong>${esc(line.key)}</strong>: ${esc(line.value)}</li>`
                              )
                              .join("")}</ul>`
                          : "";
                      const voidTag = entry.voidedAt
                        ? ` <span style="color:#b91c1c;">[${esc(printT(lang, "clinicalDocumentation.entryVoided"))}]</span>`
                        : "";
                      const witnessPending =
                        entry.requiresWitnessSignature && !entry.witnessedAt && !entry.voidedAt
                          ? ` <span style="color:#a16207;">[${esc(printT(lang, "clinicalDocumentation.badgePendingWitness"))}]</span>`
                          : "";
                      const witnessTag =
                        entry.witnessedAt && entry.witnessDisplayName
                          ? ` — ${esc(printT(lang, "clinicalDocumentation.witnessLine").replace("{name}", entry.witnessDisplayName).replace("{role}", entry.witnessRoleTitle ?? "—").replace("{when}", entry.witnessedAt))}`
                          : "";
                      return `<div style="margin-bottom:8px;font-size:11px;"><p style="margin:0;"><strong>${esc(
                        title
                      )}</strong> — ${esc(entry.authorDisplayName ?? "—")} (${esc(
                        entry.authorRoleTitle ?? "—"
                      )}) <strong>${esc(onDateWord)}</strong> ${esc(fmtDt(entry.createdAt, lang))}${voidTag}${witnessPending}${witnessTag}</p>${summary}</div>`;
                    })
                    .join("")}`
                : ""
            }
            <p style="margin:4px 0;"><strong>${esc(pc("clinicalImpression"))} :</strong> ${esc(enc.clinicianImpressionPreview ?? "—")}</p>
            <p style="margin:4px 0;"><strong>${esc(pc("treatmentPlan"))} :</strong> ${esc(enc.treatmentPlanPreview ?? "—")}</p>
            <p style="margin:4px 0;"><strong>${esc(pc("visitDiagnoses"))} :</strong> ${esc(dxVisit || "—")}</p>
            <p style="margin:8px 0 4px 0;"><strong>${esc(pc("orders"))}</strong></p>
            ${ordersHtml || `<p style="margin:4px 0;">${esc(pc("emptyDash"))}</p>`}
            <p style="margin:8px 0 4px 0;"><strong>${esc(pc("medAdministrations"))}</strong></p>
            ${adminHtml}
            <p style="margin:8px 0 4px 0;"><strong>${esc(pc("pharmacyDispense"))}</strong></p>
            <ul style="margin:4px 0 0 16px;">${disp || `<li>${esc(pc("emptyDash"))}</li>`}</ul>
          </div>
        </section>`;
    })
    .join("");

  const activeDx = (chartSummary.activeDiagnoses ?? [])
    .map(
      (d) =>
        `<li>${esc(diagnosisDisplayFr(d.description, d.code))}${
          d.onsetDate
            ? ` <span style="color:#333;">(${esc(pc("activeDxOnset"))} ${esc(fmtDt(d.onsetDate, lang))})</span>`
            : ""
        }</li>`
    )
    .join("");

  const resultsLines: string[] = [];
  for (const enc of encounters) {
    const when = fmtShort(enc.createdAt, lang);
    const typeLbl = encounterTypeLabel(lang, enc.type);
    for (const it of flattenOrderItems(enc)) {
      if (!isResultLike(it, lang)) continue;
      const label = esc(chartSummaryOrderItemLineLabel(it, lang, chartOrderLineT(lang)) || "—");
      const snip = esc(resultSnippet(lang, it));
      resultsLines.push(
        `<li><strong>${esc(typeLbl)}</strong> (${when}) — ${label}<br/><span style="font-size:11px;">${snip}</span></li>`
      );
    }
  }

  const dispAll = (chartSummary.recentMedicationDispenses ?? [])
    .map((d) => {
      const med = esc(
        catalogMedicationNameForLocale(d.catalogMedication, lang) ||
          d.catalogMedication.code ||
          "—"
      );
      const by = d.dispensedBy
        ? esc(`${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim())
        : esc(pc("emptyDash"));
      return `<li>${med} × ${d.quantityDispensed} — ${fmtShort(d.dispensedAt, lang)} — ${by}${
        d.dosageInstructions ? ` — ${esc(d.dosageInstructions)}` : ""
      }</li>`;
    })
    .join("");

  const sortieBlocks = encounters
    .map((enc) => {
      const d = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
      if (!d) return "";
      const inner = dischargeFieldsHtml(lang, d);
      if (!inner.trim()) return "";
      return `<div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #ccc;">
        <p style="margin:0 0 6px 0; font-weight:700;">${esc(encounterTypeLabel(lang, enc.type))} — ${fmtShort(enc.createdAt, lang)}</p>
        ${inner}
      </div>`;
    })
    .join("");

  const auditTimelinePrint = (chartSummary.auditTimeline ?? []).slice(0, 25);
  const auditBy = printT(lang, "printOutput.patientChart.auditBy");
  const auditTimelineHtml = auditTimelinePrint
    .map((it) => {
      const who = it.userDisplayFr ? esc(`${auditBy} ${it.userDisplayFr}`) : esc(pc("emptyDash"));
      const when = esc(fmtShort(it.createdAt, lang));
      const detail = it.detailFr ? `<br/><span style="font-size:10px;color:#333;">${esc(it.detailFr)}</span>` : "";
      return `<li style="margin:5px 0;font-size:11px;line-height:1.35;"><strong>${esc(it.shortLabel)}</strong><br/>${who} — ${when}${detail}</li>`;
    })
    .join("");

  const followUpsHtml = (followUps ?? [])
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((fu) => {
      const note = fu.notes?.trim() ? ` — ${esc(fu.notes)}` : "";
      const reason = fu.reason?.trim() ? esc(fu.reason) : esc(pc("emptyDash"));
      return `<li>${fmtDt(fu.dueDate, lang)} — <strong>${esc(followUpStatusLabel(lang, fu.status))}</strong> — ${reason}${note}</li>`;
    })
    .join("");

  const printedAt = new Date().toLocaleString(loc);
  const htmlLang = lang === "en" ? "en" : "fr";
  const pt = printT(lang, "printOutput.patientChart.htmlTitlePrefix");
  const patientTitle = esc([p.firstName, p.lastName].filter(Boolean).join(" "));
  const ageStr = age != null ? `${age} ${printT(lang, "printOutput.common.yearsSuffix")}` : esc(pc("emptyDash"));

  const footer = esc(printT(lang, "printOutput.common.documentFooter").replace("{date}", printedAt));

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <title>${esc(pt)} — ${patientTitle}</title>
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
  <h1>${esc(pc("title"))}</h1>
  ${facilityName ? `<div class="meta"><p><strong>${esc(pc("establishment"))}</strong> ${esc(facilityName)}</p></div>` : ""}

  <h2>${esc(pc("sectionIdentity"))}</h2>
  <div class="meta">
    <p><strong>${esc(pc("name"))}</strong> ${esc([p.firstName, p.lastName].filter(Boolean).join(" ") || "—")}</p>
    <p><strong>${esc(pc("nirMrn"))}</strong> ${esc(ids)}</p>
    <p><strong>${esc(pc("dob"))}</strong> ${p.dob ? fmtDt(p.dob, lang) : esc(pc("emptyDash"))} · <strong>${esc(pc("age"))}</strong> ${ageStr} · <strong>${esc(pc("sex"))}</strong> ${esc(sex)}</p>
    <p><strong>${esc(pc("phone"))}</strong> ${esc(p.phone ?? "—")}</p>
    ${p.address || p.city ? `<p><strong>${esc(pc("address"))}</strong> ${esc([p.address, p.city, p.country].filter(Boolean).join(", ") || "—")}</p>` : ""}
  </div>

  <h2>${esc(pc("sectionVitals"))}</h2>
  <div class="meta">
    <p><strong>${esc(pc("lastReading"))}</strong> ${esc(latestVitalsLine)}</p>
    ${latestVitalsWhen ? `<p><strong>${esc(pc("readingDate"))}</strong> ${esc(latestVitalsWhen)}</p>` : ""}
  </div>

  <h2>${esc(pc("sectionAudit"))}</h2>
  <p style="font-size:11px; margin:0 0 6px 0;">${esc(pc("auditSub"))}</p>
  <ul style="margin:0; padding-left:16px;">${auditTimelineHtml || `<li>${esc(pc("emptyDash"))}</li>`}</ul>

  <h2>${esc(pc("sectionEncounters"))}</h2>
  ${encBlocks || `<p>${esc(pc("emptyDash"))}</p>`}

  <h2>${esc(pc("sectionDiagnoses"))}</h2>
  <ul>${activeDx || `<li>${esc(pc("emptyDash"))}</li>`}</ul>

  <h2>${esc(pc("sectionResults"))}</h2>
  <ul>${resultsLines.length ? resultsLines.join("") : `<li>${esc(pc("emptyDash"))}</li>`}</ul>

  <h2>${esc(pc("sectionMedications"))}</h2>
  <p style="font-size:12px; margin:0 0 6px 0;">${esc(pc("medicationsSub"))}</p>
  <ul>${dispAll || `<li>${esc(pc("emptyDash"))}</li>`}</ul>

  <h2>${esc(pc("sectionDischarge"))}</h2>
  ${sortieBlocks.trim() ? sortieBlocks : `<p>${esc(pc("emptyDash"))}</p>`}

  <h2>${esc(pc("sectionFollowUps"))}</h2>
  <ul>${followUpsHtml || `<li>${esc(pc("emptyDash"))}</li>`}</ul>

  <p style="margin-top:24px; font-size:11px; color:#000;">${footer}</p>
</body>
</html>`;
}

/**
 * Opens print window immediately (user gesture), then builds HTML via factory (avoids pop-up blocking).
 */
export function printPatientChart(
  buildHtml: () => string,
  language: SupportedLanguage
): void {
  const w = typeof window !== "undefined" ? window.open("", "_blank") : null;
  if (!w) {
    alert(printT(language, "printOutput.common.popupBlocked"));
    return;
  }
  w.document.open();
  w.document.write(
    `<!DOCTYPE html><html lang="${language === "en" ? "en" : "fr"}"><head><meta charset="utf-8" /><title>${esc(
      printT(language, "printOutput.common.printPreparing")
    )}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;font-size:14px;color:#333;"><p>${esc(
      printT(language, "printOutput.common.printPreparing")
    )}</p></body></html>`
  );
  w.document.close();

  setTimeout(() => {
    try {
      const html = buildHtml();
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.close();
      }, 250);
    } catch {
      w.document.open();
      w.document.write(
        `<!DOCTYPE html><html lang="${language === "en" ? "en" : "fr"}"><head><meta charset="utf-8" /><title>${esc(
          printT(language, "printOutput.common.printErrorTitle")
        )}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;font-size:14px;color:#333;"><p>${esc(
          printT(language, "printOutput.common.printError")
        )}</p></body></html>`
      );
      w.document.close();
    }
  }, 0);
}
