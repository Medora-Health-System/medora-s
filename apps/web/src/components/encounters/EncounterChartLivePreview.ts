/**
 * Encounter-level live chart preview (Phase 5C).
 *
 * Composes a printable HTML view of every clinical domain MEDORA already exposes
 * via existing read endpoints for a single encounter. This is intentionally:
 *  - browser-rendered, not server-generated;
 *  - regenerated from current chart data on every print (no snapshot, no version);
 *  - clearly stamped as a live preview, not a finalized legal export;
 *  - additive — does not replace ER packet, discharge summary, or patient chart preview.
 *
 * Data is fetched in parallel from the existing endpoints below; per-section failures
 * fall back to "Section unavailable" and never block the rest of the document. No backend
 * changes, no new endpoints, no schema changes.
 */

import { apiFetch } from "@/lib/apiClient";
import type { SupportedLanguage } from "@/i18n/config";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import { fetchEncounterAuditTimeline, type ChartAuditTimelineItem } from "@/lib/chartApi";
import { fetchPatientFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import { chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";
import { formatOrderAuthorityLines } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import {
  clinicalDocumentationEventBelongsInAdmissionHistory,
  clinicalDocumentationEventBelongsInDischargeHistory,
  clinicalTimelineDisplayLabelForLocale,
  clinicalTimelineDisplayLabelFr,
  resolveClinicalTimelineDisplayEventType,
  sanitizeMarAdministrationVisibleNote,
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
  buildMedicationResponseSummaryFieldsFromParsed,
  listMedicationResponseSideEffectKeys,
} from "@medora/shared";
import {
  diagnosisDisplayFr,
  nirMrnDisplay,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  parsePhysicianEvalV1ForChart,
} from "@/components/patient-chart/patientChartHelpers";
import { buildProviderDocumentationDisplayModel } from "@/lib/providerDocumentationModel";
import { parseNursingProceduresForChart } from "@/lib/nursingProcedures";
import {
  printDateLocale,
  printOrderItemChartLabel,
  printPatientSexLabel,
  printT,
} from "@/lib/printI18n";

type AnyRecord = Record<string, unknown>;

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDt(iso: string | Date | null | undefined, lang: SupportedLanguage): string {
  if (!iso) return "—";
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(printDateLocale(lang));
  } catch {
    return "—";
  }
}

function tprev(lang: SupportedLanguage, key: string): string {
  return printT(lang, `printOutput.encounterChartLivePreview.${key}`);
}

function tcommon(lang: SupportedLanguage, key: string): string {
  return printT(lang, `printOutput.patientChart.${key}`);
}

function h2(lang: SupportedLanguage, sectionKey: string): string {
  return `<h2 style="font-size:14px;margin:22px 0 10px 0;font-weight:700;border-bottom:1px solid #000;padding-bottom:4px;">${esc(
    tprev(lang, sectionKey)
  )}</h2>`;
}

function noData(lang: SupportedLanguage): string {
  return `<p style="margin:6px 0;color:#475569;font-style:italic;">${esc(tprev(lang, "noData"))}</p>`;
}

function sectionUnavailable(lang: SupportedLanguage): string {
  return `<p style="margin:6px 0;color:#9a3412;font-style:italic;">${esc(tprev(lang, "unavailable"))}</p>`;
}

function asArray(input: unknown): AnyRecord[] {
  return Array.isArray(input) ? (input as AnyRecord[]) : [];
}

function asObject(input: unknown): AnyRecord | null {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as AnyRecord) : null;
}

function pickString(o: AnyRecord | null, key: string): string | null {
  if (!o) return null;
  const v = o[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function performerLineFromCreatedBy(
  o: AnyRecord | null,
  lang: SupportedLanguage
): string | null {
  if (!o) return null;
  const cb = o.createdBy as AnyRecord | undefined;
  if (cb && typeof cb === "object") {
    const fn = typeof cb.firstName === "string" ? cb.firstName.trim() : "";
    const ln = typeof cb.lastName === "string" ? cb.lastName.trim() : "";
    const name = `${fn} ${ln}`.trim();
    if (name) return name;
  }
  const display = pickString(o, "performerDisplayName") || pickString(o, "createdByDisplayFr");
  if (display) return display;
  // No personal data fallback — keep as dash from common helpers.
  return tcommon(lang, "emptyDash");
}

function asProvDocStatusLabel(lang: SupportedLanguage, status: string | null): string {
  if (status === "SIGNED") return tprev(lang, "signedSignedLabel");
  return tprev(lang, "signedDraftLabel");
}

/* ---------- Input shape ---------- */

export type EncounterChartLivePreviewParams = {
  /**
   * Encounter detail object (already loaded by the encounter page via
   * `GET /encounters/:id`). Includes patient, providerAddenda, etc.
   */
  encounter: AnyRecord;
  /** Triage row (already loaded by the encounter page via `GET /encounters/:id/triage`). */
  triage: AnyRecord | null;
  /** Enriched orders (already loaded via `GET /encounters/:id/orders`). */
  orders: AnyRecord[];
  facilityId: string;
  facilityName?: string | null;
  language: SupportedLanguage;
};

/* ---------- Fetched data ---------- */

type FetchedSections = {
  vitalsHistory: { entries: AnyRecord[] } | null;
  clinicalTimeline: AnyRecord[] | null;
  clinicalDocumentationEvents: { entries: AnyRecord[] } | null;
  ivAccess: { active: AnyRecord[]; removed: AnyRecord[] } | null;
  procedures: { entries: AnyRecord[] } | null;
  nursingReassessmentEvents: AnyRecord[] | null;
  auditTimeline: ChartAuditTimelineItem[] | null;
  encounterDiagnoses: AnyRecord[] | null;
  medicationAdministrations: AnyRecord[] | null;
  followUps: FollowUpRow[] | null;
};

const CLINICAL_TIMELINE_LIMIT = 100;

async function fetchEncounterChartPreviewData(
  encounterId: string,
  patientId: string,
  facilityId: string
): Promise<FetchedSections> {
  /**
   * Per-endpoint failure must not block the document. We use Promise.allSettled
   * so a 403 on a section-restricted endpoint (e.g. diagnoses for a non-clinical
   * caller) renders "Section unavailable" rather than crashing the print.
   */
  const settled = await Promise.allSettled([
    apiFetch(`/encounters/${encounterId}/vitals-history`, { facilityId }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/clinical-timeline?limit=${CLINICAL_TIMELINE_LIMIT}`, {
      facilityId,
    }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/clinical-documentation-events`, {
      facilityId,
    }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/iv-access`, { facilityId }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/procedures`, { facilityId }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`, {
      facilityId,
    }) as Promise<unknown>,
    fetchEncounterAuditTimeline(facilityId, encounterId) as Promise<ChartAuditTimelineItem[]>,
    apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId }) as Promise<unknown>,
    apiFetch(`/encounters/${encounterId}/medication-administrations`, {
      facilityId,
    }) as Promise<unknown>,
    fetchPatientFollowUps(facilityId, patientId, { limit: 100 }) as Promise<{
      items: FollowUpRow[];
      total: number;
    }>,
  ]);

  const pick = <T>(idx: number, normalize: (v: unknown) => T | null): T | null => {
    const r = settled[idx];
    if (r.status !== "fulfilled") return null;
    return normalize(r.value);
  };

  return {
    vitalsHistory: pick<{ entries: AnyRecord[] }>(0, (v) => {
      const o = asObject(v);
      const entries = asArray(o?.entries);
      return { entries };
    }),
    clinicalTimeline: pick<AnyRecord[]>(1, (v) => asArray(v)),
    clinicalDocumentationEvents: pick<{ entries: AnyRecord[] }>(2, (v) => {
      const o = asObject(v);
      return { entries: asArray(o?.entries) };
    }),
    ivAccess: pick<{ active: AnyRecord[]; removed: AnyRecord[] }>(3, (v) => {
      const o = asObject(v);
      return { active: asArray(o?.active), removed: asArray(o?.removed) };
    }),
    procedures: pick<{ entries: AnyRecord[] }>(4, (v) => {
      const o = asObject(v);
      return { entries: asArray(o?.entries) };
    }),
    nursingReassessmentEvents: pick<AnyRecord[]>(5, (v) => asArray(v)),
    auditTimeline: pick<ChartAuditTimelineItem[]>(6, (v) =>
      Array.isArray(v) ? (v as ChartAuditTimelineItem[]) : []
    ),
    encounterDiagnoses: pick<AnyRecord[]>(7, (v) => {
      const o = asObject(v);
      return asArray(o?.items);
    }),
    medicationAdministrations: pick<AnyRecord[]>(8, (v) => asArray(v)),
    followUps: pick<FollowUpRow[]>(9, (v) => {
      const o = asObject(v);
      const items = asArray(o?.items);
      return items as unknown as FollowUpRow[];
    }),
  };
}

/* ---------- Section renderers ---------- */

function renderHeader(
  lang: SupportedLanguage,
  encounter: AnyRecord,
  facilityName: string | null,
  triage: AnyRecord | null
): string {
  const patient = (encounter.patient as AnyRecord | null) ?? null;
  const fn = pickString(patient, "firstName") ?? "";
  const ln = pickString(patient, "lastName") ?? "";
  const fullName = `${fn} ${ln}`.trim() || tcommon(lang, "emptyDash");
  const dobStr = pickString(patient, "dob");
  const age = dobStr ? calculateAge(dobStr) : null;
  const ageStr =
    age != null ? `${age} ${printT(lang, "printOutput.common.yearsSuffix")}` : tcommon(lang, "emptyDash");
  const sex = printPatientSexLabel(
    lang,
    pickString(patient, "sex"),
    pickString(patient, "sexAtBirth")
  );
  const ids = nirMrnDisplay({
    nationalId: pickString(patient, "nationalId"),
    mrn: pickString(patient, "mrn"),
    globalMrn: pickString(patient, "globalMrn"),
  });

  const pa = encounter.physicianAssigned as AnyRecord | null;
  const physName = pa
    ? `${pickString(pa, "firstName") ?? ""} ${pickString(pa, "lastName") ?? ""}`.trim()
    : "";

  const provDocStatus = typeof encounter.providerDocumentationStatus === "string"
    ? encounter.providerDocumentationStatus
    : "DRAFT";
  const signedAt = pickString(encounter, "providerDocumentationSignedAt");
  const signedBy = pickString(encounter, "providerDocumentationSignedByDisplayFr");

  const lines: string[] = [];
  lines.push(`<div class="meta">`);
  lines.push(
    `<p><strong>${esc(tcommon(lang, "name"))}</strong> ${esc(fullName)}</p>`
  );
  lines.push(
    `<p><strong>${esc(tcommon(lang, "dob"))}</strong> ${esc(
      dobStr ? fmtDt(dobStr, lang) : tcommon(lang, "emptyDash")
    )} · <strong>${esc(tcommon(lang, "age"))}</strong> ${esc(ageStr)} · <strong>${esc(
      tcommon(lang, "sex")
    )}</strong> ${esc(sex)}</p>`
  );
  lines.push(
    `<p><strong>${esc(tcommon(lang, "nirMrn"))}</strong> ${esc(ids)}</p>`
  );
  if (facilityName?.trim()) {
    lines.push(
      `<p><strong>${esc(tcommon(lang, "establishment"))}</strong> ${esc(facilityName.trim())}</p>`
    );
  }
  const encId = pickString(encounter, "id");
  if (encId) {
    lines.push(
      `<p><strong>${esc(tprev(lang, "encounterIdLabel"))}:</strong> <code style="font-family:monospace;font-size:11px;">${esc(
        encId
      )}</code></p>`
    );
  }
  const encType = pickString(encounter, "type");
  if (encType) {
    const typeKey = `encounterChrome.encounterTypes.${encType}`;
    const typeLabel = printT(lang, typeKey);
    lines.push(
      `<p><strong>${esc(printT(lang, "encounterChrome.labelEncounterType"))}:</strong> ${esc(
        typeLabel !== typeKey ? typeLabel : encType
      )}</p>`
    );
  }
  const encStatus = pickString(encounter, "status");
  if (encStatus) {
    const statusKey = `encounterChrome.encounterStatuses.${encStatus}`;
    const statusLabel = printT(lang, statusKey);
    lines.push(
      `<p><strong>${esc(tprev(lang, "encounterStatus"))}:</strong> ${esc(
        statusLabel !== statusKey ? statusLabel : encStatus
      )}</p>`
    );
  }
  const workflowState = pickString(encounter, "workflowState");
  if (workflowState) {
    lines.push(
      `<p><strong>${esc(tprev(lang, "workflowState"))}:</strong> ${esc(workflowState)}</p>`
    );
  }
  const createdAt = pickString(encounter, "createdAt");
  if (createdAt) {
    lines.push(
      `<p><strong>${esc(printT(lang, "encounterChrome.labelOpenedAt"))}:</strong> ${esc(
        fmtDt(createdAt, lang)
      )}</p>`
    );
  }
  const admittedAt = pickString(encounter, "admittedAt");
  if (admittedAt) {
    lines.push(
      `<p><strong>${esc(tprev(lang, "admittedAt"))}:</strong> ${esc(fmtDt(admittedAt, lang))}</p>`
    );
  }
  const dischargedAt = pickString(encounter, "dischargedAt");
  if (dischargedAt) {
    lines.push(
      `<p><strong>${esc(tprev(lang, "dischargedAt"))}:</strong> ${esc(fmtDt(dischargedAt, lang))}</p>`
    );
  }
  const closedByDisplay = pickString(encounter, "closedByDisplayFr");
  if (closedByDisplay) {
    lines.push(
      `<p><strong>${esc(tprev(lang, "closedBy"))}:</strong> ${esc(closedByDisplay)}</p>`
    );
  }
  if (physName) {
    lines.push(
      `<p><strong>${esc(tcommon(lang, "assignedPhysician"))}</strong> ${esc(physName)}</p>`
    );
  }
  const room = pickString(encounter, "roomLabel");
  if (room) {
    lines.push(`<p><strong>${esc(tcommon(lang, "room"))}</strong> ${esc(room)}</p>`);
  }
  const sigStatusLabel = asProvDocStatusLabel(lang, provDocStatus);
  lines.push(
    `<p><strong>${esc(tprev(lang, "signatureStatus"))}:</strong> ${esc(sigStatusLabel)}${
      signedAt
        ? ` · ${esc(tprev(lang, "signedAt"))} ${esc(fmtDt(signedAt, lang))}`
        : ""
    }${signedBy ? ` · ${esc(tprev(lang, "signedBy"))} ${esc(signedBy)}` : ""}</p>`
  );

  if (triage) {
    const vitalsRaw = asObject(triage.vitalsJson);
    const vitalsLine = vitalsRaw
      ? formatVitalsHeaderLineForLocale(vitalsRaw as Record<string, number | string | null | undefined>, lang)
      : null;
    if (vitalsLine && vitalsLine.trim()) {
      lines.push(
        `<p><strong>${esc(tcommon(lang, "vitalsIntake"))}</strong> ${esc(vitalsLine)}</p>`
      );
    }
  }
  lines.push(`</div>`);
  return lines.join("");
}

function renderTriage(lang: SupportedLanguage, triage: AnyRecord | null): string {
  if (!triage) return noData(lang);
  const out: string[] = [];
  const cc = pickString(triage, "chiefComplaint");
  if (cc) {
    out.push(
      `<p style="margin:6px 0;"><strong>${esc(tcommon(lang, "chiefComplaint"))}</strong> ${esc(cc)}</p>`
    );
  }
  const esi = triage.esi;
  if (typeof esi === "number" && Number.isFinite(esi)) {
    out.push(
      `<p style="margin:6px 0;"><strong>${esc(tprev(lang, "triageEsi"))}:</strong> ${esc(String(esi))}</p>`
    );
  }
  const triageCompleteAt = pickString(triage, "triageCompleteAt");
  if (triageCompleteAt) {
    out.push(
      `<p style="margin:6px 0;"><strong>${esc(tprev(lang, "triageCompletedAt"))}:</strong> ${esc(
        fmtDt(triageCompleteAt, lang)
      )}</p>`
    );
  }
  const arrivalMode = pickString(triage, "arrivalMode");
  if (arrivalMode) {
    out.push(
      `<p style="margin:6px 0;"><strong>${esc(tprev(lang, "triageArrivalMode"))}:</strong> ${esc(
        arrivalMode
      )}</p>`
    );
  }
  const arrivalAt = pickString(triage, "arrivalAt");
  if (arrivalAt) {
    out.push(
      `<p style="margin:6px 0;"><strong>${esc(tprev(lang, "triageArrivalAt"))}:</strong> ${esc(
        fmtDt(arrivalAt, lang)
      )}</p>`
    );
  }
  const allergyNote = pickString(triage, "allergyNote");
  if (allergyNote) {
    out.push(
      `<p style="margin:6px 0;color:#b91c1c;"><strong>${esc(tprev(lang, "triageAllergy"))}:</strong> ${esc(
        allergyNote
      )}</p>`
    );
  }
  const triageNotes = pickString(triage, "notes") || pickString(triage, "triageNotes");
  if (triageNotes) {
    out.push(
      `<p style="margin:6px 0;white-space:pre-wrap;"><strong>${esc(tprev(lang, "triageNotes"))}:</strong> ${esc(
        triageNotes
      )}</p>`
    );
  }
  return out.length ? out.join("") : noData(lang);
}

function renderVitalsHistory(lang: SupportedLanguage, history: { entries: AnyRecord[] } | null): string {
  if (!history) return sectionUnavailable(lang);
  const entries = history.entries;
  if (entries.length === 0) return noData(lang);
  const items = entries
    .map((entry) => {
      const recordedAt = pickString(entry, "recordedAt");
      const vitalsRaw = asObject(entry.vitals) ?? {};
      const line = formatVitalsHeaderLineForLocale(
        vitalsRaw as Record<string, number | string | null | undefined>,
        lang
      );
      const recordedBy = asObject(entry.recordedBy);
      const performer = recordedBy ? pickString(recordedBy, "displayName") : null;
      const source = pickString(entry, "source");
      return `<li><strong>${esc(fmtDt(recordedAt, lang))}</strong> — ${esc(
        line || tcommon(lang, "emptyDash")
      )}${
        performer ? ` <span style="color:#475569;">(${esc(performer)}${source ? ` · ${esc(source)}` : ""})</span>` : ""
      }</li>`;
    })
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderEncounterDiagnoses(
  lang: SupportedLanguage,
  rows: AnyRecord[] | null,
  encounterId: string
): string {
  if (rows == null) return sectionUnavailable(lang);
  const forEnc = rows.filter((d) => pickString(d, "encounterId") === encounterId);
  if (forEnc.length === 0) return noData(lang);
  const items = forEnc
    .sort(
      (a, b) =>
        (typeof a.sortOrder === "number" ? a.sortOrder : 0) -
        (typeof b.sortOrder === "number" ? b.sortOrder : 0)
    )
    .map((d) => {
      const code = pickString(d, "code") ?? "";
      const desc = pickString(d, "description");
      const status = pickString(d, "status");
      const onset = pickString(d, "onsetDate");
      const codeSource = pickString(d, "codeSource");
      const statusBadge =
        status === "RESOLVED"
          ? ` <span style="color:#475569;">(${esc(tprev(lang, "diagnosisResolved"))})</span>`
          : status === "ACTIVE"
            ? ` <span style="color:#16a34a;">(${esc(tprev(lang, "diagnosisActive"))})</span>`
            : "";
      const onsetStr = onset ? ` · ${esc(tcommon(lang, "activeDxOnset"))} ${esc(fmtDt(onset, lang))}` : "";
      const sourceStr = codeSource ? ` · ${esc(codeSource)}` : "";
      return `<li>${esc(diagnosisDisplayFr(desc, code))}${statusBadge}${onsetStr}${sourceStr}</li>`;
    })
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderNursingAssessment(lang: SupportedLanguage, encounter: AnyRecord): string {
  const lines = [
    ...parseNursingAssessmentSectionsForChart(encounter.nursingAssessment, lang),
    ...parseNursingProceduresForChart(encounter.nursingAssessment, lang),
  ];
  if (lines.length === 0) return noData(lang);
  const items = lines
    .map((s) => `<li><strong>${esc(s.label)}</strong> — ${esc(s.text)}</li>`)
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderNursingReassessments(
  lang: SupportedLanguage,
  events: AnyRecord[] | null
): string {
  if (events == null) return sectionUnavailable(lang);
  if (events.length === 0) return noData(lang);
  const blocks = events
    .map((e) => {
      const documentedAt = pickString(e, "documentedAt") || pickString(e, "savedAt");
      const performer = performerLineFromCreatedBy(e, lang);
      const payload = asObject(e.payloadJson);
      const reassessment = asObject(payload?.reassessment) ?? asObject(e.reassessment) ?? null;
      const narrative =
        pickString(reassessment, "narrative") ||
        pickString(reassessment, "comment") ||
        pickString(reassessment, "comments") ||
        "";
      const structuredLines: string[] = [];
      if (reassessment) {
        for (const [k, v] of Object.entries(reassessment)) {
          if (typeof v === "string" && v.trim() && k !== "narrative" && k !== "comment" && k !== "comments") {
            structuredLines.push(`${k}: ${v.trim()}`);
          }
        }
      }
      const lines = structuredLines
        .map((l) => `<li>${esc(l)}</li>`)
        .join("");
      return `<div style="margin:8px 0 12px 0;border-left:2px solid #e2e8f0;padding:4px 10px;">
        <p style="margin:0;font-weight:600;">${esc(fmtDt(documentedAt, lang))} — ${esc(performer ?? tcommon(lang, "emptyDash"))}</p>
        ${lines ? `<ul style="margin:6px 0;padding-left:18px;">${lines}</ul>` : ""}
        ${narrative ? `<p style="margin:6px 0;white-space:pre-wrap;">${esc(narrative)}</p>` : ""}
      </div>`;
    })
    .join("");
  return blocks;
}

function renderProviderDocumentation(lang: SupportedLanguage, encounter: AnyRecord): string {
  const workspace = buildProviderDocumentationDisplayModel({
    nursingAssessment: encounter.nursingAssessment,
    locale: lang === "en" ? "en" : "fr",
  });
  if (workspace) {
    const savedLine =
      workspace.savedBy || workspace.savedAt
        ? `<p style="margin:0 0 8px 0;font-size:11px;color:#475569;">${esc(
            [workspace.savedBy, workspace.savedAt ? fmtDt(workspace.savedAt, lang) : ""].filter(Boolean).join(" — ")
          )}</p>`
        : "";
    const blocks = workspace.sections
      .map(
        (s) =>
          `<div style="margin:6px 0;"><strong>${esc(s.label)}</strong><div style="white-space:pre-wrap;margin-top:2px;">${esc(
            s.text
          )}</div></div>`
      )
      .join("");
    return `<div style="margin:6px 0 8px 0;"><strong>${esc(workspace.title)}</strong></div>${savedLine}${blocks}`;
  }
  const sections = parsePhysicianEvalV1ForChart(encounter.nursingAssessment, lang);
  const impression = pickString(encounter, "clinicianImpression") || pickString(encounter, "providerNote");
  const plan = pickString(encounter, "treatmentPlan");
  if (sections.length === 0 && !impression && !plan) return noData(lang);
  const out: string[] = [];
  if (sections.length > 0) {
    const items = sections
      .map(
        (s) =>
          `<div style="margin:6px 0;"><strong>${esc(s.label)}</strong><div style="white-space:pre-wrap;margin-top:2px;">${esc(
            s.text
          )}</div></div>`
      )
      .join("");
    out.push(items);
  }
  if (impression) {
    out.push(
      `<p style="margin:8px 0 4px 0;"><strong>${esc(tcommon(lang, "clinicalImpression"))} :</strong></p><div style="white-space:pre-wrap;">${esc(
        impression
      )}</div>`
    );
  }
  if (plan) {
    out.push(
      `<p style="margin:8px 0 4px 0;"><strong>${esc(tcommon(lang, "treatmentPlan"))} :</strong></p><div style="white-space:pre-wrap;">${esc(
        plan
      )}</div>`
    );
  }
  return out.join("");
}

function renderProviderAddenda(lang: SupportedLanguage, encounter: AnyRecord): string {
  const addenda = asArray(encounter.providerAddenda);
  if (addenda.length === 0) return noData(lang);
  const items = addenda
    .map((ad) => {
      const text = pickString(ad, "text") || "";
      const by = pickString(ad, "createdByDisplayFr") || tcommon(lang, "emptyDash");
      const at = pickString(ad, "createdAt");
      return `<div style="margin:6px 0 10px 0;border-left:2px solid #cbd5e1;padding:4px 10px;">
        <p style="margin:0;font-size:11px;color:#475569;"><strong>${esc(tcommon(lang, "addendumBy"))}</strong> ${esc(by)} <strong>${esc(
        tcommon(lang, "onDate")
      )}</strong> ${esc(fmtDt(at, lang))}</p>
        <p style="margin:6px 0 0 0;white-space:pre-wrap;">${esc(text)}</p>
      </div>`;
    })
    .join("");
  return items;
}

function renderClinicalDocumentationHistorySection(
  lang: SupportedLanguage,
  events: AnyRecord[],
  filterTypes: string[],
  options?: { excludeMislabeledObservationAdmissionDischarge?: boolean }
): string {
  const filtered = events.filter((e) => {
    const et = pickString(e, "eventType") ?? "";
    if (!filterTypes.includes(et)) return false;
    if (
      options?.excludeMislabeledObservationAdmissionDischarge &&
      !clinicalDocumentationEventBelongsInDischargeHistory({
        eventType: et,
        payloadJson: e.payloadJson,
      })
    ) {
      return false;
    }
    return true;
  });
  if (filtered.length === 0) return noData(lang);
  const items = filtered
    .map((e) => {
      const at = pickString(e, "createdAt") || pickString(e, "documentedAt") || pickString(e, "savedAt");
      const performer = performerLineFromCreatedBy(e, lang);
      const payload = asObject(e.payloadJson);
      const snapshot = asObject(payload?.snapshot) ?? null;
      const displayEventType = resolveClinicalTimelineDisplayEventType({
        eventType: pickString(e, "eventType"),
        payloadJson: e.payloadJson,
      });
      const workspace = snapshot
        ? buildProviderDocumentationDisplayModel({
            nursingAssessment: { erProviderMseV1: snapshot },
            locale: lang === "en" ? "en" : "fr",
          })
        : null;
      if (workspace) {
        const title = clinicalTimelineDisplayLabelForLocale(lang === "en" ? "en" : "fr", displayEventType);
        const sectionBlocks = workspace.sections
          .map(
            (s) =>
              `<div style="margin:6px 0;"><strong>${esc(s.label)}</strong><div style="white-space:pre-wrap;margin-top:2px;">${esc(
                s.text
              )}</div></div>`
          )
          .join("");
        const sigLine =
          workspace.savedBy || workspace.savedAt
            ? `<p style="margin:4px 0 0 0;font-size:11px;color:#475569;font-style:italic;">${esc(
                [workspace.savedBy, workspace.savedAt ? fmtDt(workspace.savedAt, lang) : ""].filter(Boolean).join(" — ")
              )}</p>`
            : "";
        return `<div style="margin:6px 0 10px 0;border-left:2px solid #e2e8f0;padding:4px 10px;">
          <p style="margin:0;font-weight:600;">${esc(title)} — ${esc(fmtDt(at, lang))}${
            performer ? ` — ${esc(performer)}` : ""
          }</p>
          ${sectionBlocks}
          ${sigLine}
        </div>`;
      }
      const snapshotLines: string[] = [];
      if (snapshot) {
        for (const [k, v] of Object.entries(snapshot)) {
          if (typeof v === "string" && v.trim()) {
            snapshotLines.push(`${k}: ${v.trim()}`);
          }
        }
      }
      const sigBlock = asObject(payload?.signature);
      const sigName = sigBlock ? pickString(sigBlock, "savedByDisplayName") : null;
      const sigAt = sigBlock ? pickString(sigBlock, "savedAt") : null;
      return `<div style="margin:6px 0 10px 0;border-left:2px solid #e2e8f0;padding:4px 10px;">
        <p style="margin:0;font-weight:600;">${esc(fmtDt(at, lang))} — ${esc(performer ?? tcommon(lang, "emptyDash"))}</p>
        ${
          snapshotLines.length > 0
            ? `<ul style="margin:6px 0;padding-left:18px;">${snapshotLines
                .map((l) => `<li>${esc(l)}</li>`)
                .join("")}</ul>`
            : ""
        }
        ${
          sigName
            ? `<p style="margin:4px 0 0 0;font-size:11px;color:#475569;font-style:italic;">${esc(
                sigName
              )} — ${esc(fmtDt(sigAt, lang))}</p>`
            : ""
        }
      </div>`;
    })
    .join("");
  return items;
}

function renderHandoff(
  lang: SupportedLanguage,
  encounter: AnyRecord,
  docEvents: { entries: AnyRecord[] } | null
): string {
  const handoffSection = encounter.nursingAssessment as AnyRecord | undefined;
  const out: string[] = [];
  if (handoffSection && typeof handoffSection === "object") {
    const erHandoff = asObject((handoffSection as AnyRecord).erHandoffV1);
    if (erHandoff) {
      for (const [k, v] of Object.entries(erHandoff)) {
        if (typeof v === "string" && v.trim()) {
          out.push(
            `<p style="margin:4px 0;"><strong>${esc(k)}</strong>: <span style="white-space:pre-wrap;">${esc(v.trim())}</span></p>`
          );
        }
      }
    }
  }
  if (docEvents) {
    const history = renderClinicalDocumentationHistorySection(
      lang,
      docEvents.entries,
      ["HANDOFF_NURSING"]
    );
    if (history && !history.includes(tprev(lang, "noData"))) {
      out.push(`<p style="margin:8px 0 4px 0;"><strong>${esc(tprev(lang, "handoffHistoryHeader"))}</strong></p>`);
      out.push(history);
    }
  }
  return out.length > 0 ? out.join("") : noData(lang);
}

function renderDischargeSummary(
  lang: SupportedLanguage,
  encounter: AnyRecord,
  docEvents: { entries: AnyRecord[] } | null
): string {
  const d = parseDischargeSummaryForChart(encounter.dischargeSummaryJson);
  const out: string[] = [];
  if (d) {
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === "string" && v.trim()) {
        out.push(
          `<p style="margin:4px 0;"><strong>${esc(k)}</strong>: <span style="white-space:pre-wrap;">${esc(v.trim())}</span></p>`
        );
      }
    }
  }
  if (docEvents) {
    const history = renderClinicalDocumentationHistorySection(
      lang,
      docEvents.entries,
      ["DISCHARGE_SUMMARY_SAVED"],
      { excludeMislabeledObservationAdmissionDischarge: true }
    );
    if (history && !history.includes(tprev(lang, "noData"))) {
      out.push(`<p style="margin:8px 0 4px 0;"><strong>${esc(tprev(lang, "dischargeHistoryHeader"))}</strong></p>`);
      out.push(history);
    }
  }
  return out.length > 0 ? out.join("") : noData(lang);
}

function renderAdmissionSummary(
  lang: SupportedLanguage,
  encounter: AnyRecord,
  docEvents: { entries: AnyRecord[] } | null
): string {
  const a = parseAdmissionSummaryForChart(encounter.admissionSummaryJson);
  const out: string[] = [];
  if (a) {
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === "string" && v.trim()) {
        out.push(
          `<p style="margin:4px 0;"><strong>${esc(k)}</strong>: <span style="white-space:pre-wrap;">${esc(v.trim())}</span></p>`
        );
      }
    }
  }
  if (docEvents) {
    const admissionEvents = docEvents.entries.filter((e) =>
      clinicalDocumentationEventBelongsInAdmissionHistory({
        eventType: pickString(e, "eventType") ?? "",
        payloadJson: e.payloadJson,
      })
    );
    const history = renderClinicalDocumentationHistorySection(lang, admissionEvents, [
      "ADMISSION_SUMMARY_SAVED",
      "DISCHARGE_SUMMARY_SAVED",
    ]);
    if (history && !history.includes(tprev(lang, "noData"))) {
      out.push(`<p style="margin:8px 0 4px 0;"><strong>${esc(tprev(lang, "admissionHistoryHeader"))}</strong></p>`);
      out.push(history);
    }
  }
  return out.length > 0 ? out.join("") : noData(lang);
}

function renderDispositionSupplementHistory(
  lang: SupportedLanguage,
  docEvents: { entries: AnyRecord[] } | null
): string {
  if (!docEvents) return sectionUnavailable(lang);
  return renderClinicalDocumentationHistorySection(lang, docEvents.entries, [
    "DISPOSITION_SUPPLEMENT_SAVED",
  ]);
}

function renderTriageAssessmentHistory(
  lang: SupportedLanguage,
  docEvents: { entries: AnyRecord[] } | null
): string {
  if (!docEvents) return sectionUnavailable(lang);
  return renderClinicalDocumentationHistorySection(lang, docEvents.entries, [
    "TRIAGE_ASSESSMENT_SAVED",
  ]);
}

function renderProviderMseHistory(
  lang: SupportedLanguage,
  docEvents: { entries: AnyRecord[] } | null
): string {
  if (!docEvents) return sectionUnavailable(lang);
  return renderClinicalDocumentationHistorySection(lang, docEvents.entries, ["PROVIDER_MSE_SAVED"]);
}

function tFn(lang: SupportedLanguage): (key: string) => string {
  return (key: string) => printT(lang, key);
}

function lineLabelForItem(lang: SupportedLanguage, it: AnyRecord, tt: (key: string) => string): string {
  /**
   * `chartSummaryOrderItemLineLabel` only reads `catalogItemType`, `displayLabel*`
   * fields — but its parameter is the strict `ChartSummaryOrderItem` shape. The
   * runtime values from `/encounters/:id/orders` carry the same fields plus a
   * different status enum, so we go through `unknown` to keep the call site
   * strictly typed without re-declaring the imported type.
   */
  return chartSummaryOrderItemLineLabel(
    it as unknown as Parameters<typeof chartSummaryOrderItemLineLabel>[0],
    lang,
    tt
  );
}

function renderOrders(lang: SupportedLanguage, orders: AnyRecord[]): string {
  if (orders.length === 0) return noData(lang);
  const tt = tFn(lang);
  const blocks = orders
    .map((o) => {
      const items = asArray(o.items);
      const orderType = pickString(o, "type") ?? "";
      const orderTypeKey = `encounterChrome.chartTabs.orderType${orderType}`;
      const orderTypeLabel = printT(lang, orderTypeKey);
      const heading = orderTypeLabel !== orderTypeKey ? orderTypeLabel : orderType || "—";
      const status = pickString(o, "status") ?? "";
      const cancelled = status === "CANCELLED";
      const cancelInfo: string[] = [];
      if (cancelled) {
        const by = pickString(o, "cancelledByDisplayFr");
        const at = pickString(o, "cancelledAt");
        const reason = pickString(o, "cancellationReason");
        if (by) cancelInfo.push(`<strong>${esc(tcommon(lang, "orderCancelledPrefix"))}</strong> ${esc(by)}`);
        if (at) cancelInfo.push(`<strong>${esc(tcommon(lang, "orderCancelledOn"))}</strong> ${esc(fmtDt(at, lang))}`);
        if (reason) cancelInfo.push(`<strong>${esc(tcommon(lang, "cancellationReason"))}</strong>: ${esc(reason)}`);
      }
      const authorityLines = formatOrderAuthorityLines(
        o as { source?: string | null; authority?: { source?: string | null; readbackConfirmed?: boolean | null; protocolName?: string | null } | null },
        tt
      ).map((l) => esc(l)).join(" · ");
      const attributionLines = formatOrderAttributionLines(
        o as { createdAt?: string | null; createdByDisplay?: { name?: string | null; role?: string | null; at?: string | null } | null; lastActionDisplay?: { action?: string | null; name?: string | null; role?: string | null; at?: string | null } | null },
        tt,
        lang
      ).map((l) => esc(l)).join("<br/>");

      const itemsHtml = items
        .map((it) => {
          const lineLabel = lineLabelForItem(lang, it, tt);
          const itemStatus = pickString(it, "status") ?? "";
          const statusLbl = printOrderItemChartLabel(lang, itemStatus);
          const completedAt = pickString(it, "completedAt");
          const completedByObj = asObject(it.completedBy);
          const completedBy = completedByObj
            ? `${pickString(completedByObj, "firstName") ?? ""} ${pickString(completedByObj, "lastName") ?? ""}`.trim()
            : "";
          const completionLine =
            completedAt
              ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${esc(
                  tprev(lang, "orderItemCompletedAt")
                )} ${esc(fmtDt(completedAt, lang))}${completedBy ? ` — ${esc(completedBy)}` : ""}</div>`
              : "";
          return `<li>${esc(lineLabel || "—")} <span style="color:#334155;">(${esc(statusLbl)})</span>${completionLine}</li>`;
        })
        .join("");

      return `<div style="margin:8px 0 12px 0;">
        <strong>${esc(heading)}</strong>
        ${authorityLines ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${authorityLines}</div>` : ""}
        ${attributionLines ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${attributionLines}</div>` : ""}
        ${cancelInfo.length > 0 ? `<div style="font-size:11px;color:#b91c1c;margin-top:4px;line-height:1.4;">${cancelInfo.join("<br/>")}</div>` : ""}
        <ul style="margin:4px 0 0 0;padding-left:18px;">${itemsHtml || `<li>${esc(tcommon(lang, "emptyDash"))}</li>`}</ul>
      </div>`;
    })
    .join("");
  return blocks;
}

function renderResults(lang: SupportedLanguage, orders: AnyRecord[]): string {
  if (orders.length === 0) return noData(lang);
  const lines: string[] = [];
  for (const o of orders) {
    const items = asArray(o.items);
    for (const it of items) {
      const cat = pickString(it, "catalogItemType") ?? "";
      if (cat !== "LAB_TEST" && cat !== "IMAGING_STUDY") continue;
      const result = asObject(it.result);
      if (!result) continue;
      const text = pickString(result, "resultText");
      const verifiedAt = pickString(result, "verifiedAt");
      const enteredBy = pickString(result, "enteredByDisplayFr");
      const critical = result.criticalValue === true;
      const attachments = asArray(result.attachments);
      const lineLabel = lineLabelForItem(lang, it, tFn(lang));
      // Skip rows with no result content at all.
      if (!text && attachments.length === 0 && !verifiedAt) continue;
      const attachmentList = attachments
        .map((a) => {
          const fn = pickString(a, "fileName");
          const mt = pickString(a, "mimeType");
          if (!fn) return null;
          return `<li>${esc(fn)}${mt ? ` <span style="color:#64748b;">(${esc(mt)})</span>` : ""}</li>`;
        })
        .filter((x): x is string => x !== null)
        .join("");
      lines.push(
        `<div style="margin:8px 0 12px 0;border-left:2px solid #e2e8f0;padding:4px 10px;">
          <p style="margin:0;font-weight:600;">${esc(lineLabel || "—")}${
            critical ? ` <span style="color:#b91c1c;font-weight:700;">⚠ ${esc(tprev(lang, "resultCritical"))}</span>` : ""
          }</p>
          ${
            text
              ? `<div style="margin:6px 0;white-space:pre-wrap;font-family:Georgia,serif;">${esc(text)}</div>`
              : ""
          }
          ${
            verifiedAt
              ? `<p style="margin:4px 0;font-size:11px;color:#475569;"><strong>${esc(
                  tcommon(lang, "resultVerified")
                )}</strong> ${esc(fmtDt(verifiedAt, lang))}${
                  enteredBy ? ` — ${esc(tprev(lang, "resultEnteredBy"))} ${esc(enteredBy)}` : ""
                }</p>`
              : enteredBy
                ? `<p style="margin:4px 0;font-size:11px;color:#475569;"><strong>${esc(
                    tprev(lang, "resultEnteredBy")
                  )}</strong> ${esc(enteredBy)}</p>`
                : ""
          }
          ${
            attachmentList
              ? `<p style="margin:4px 0 2px 0;font-size:11px;font-weight:600;">${esc(
                  tprev(lang, "resultAttachments")
                )}</p><ul style="margin:0;padding-left:18px;font-size:11px;">${attachmentList}</ul>`
              : ""
          }
        </div>`
      );
    }
  }
  return lines.length > 0 ? lines.join("") : noData(lang);
}

function renderMar(lang: SupportedLanguage, rows: AnyRecord[] | null): string {
  if (rows == null) return sectionUnavailable(lang);
  if (rows.length === 0) return noData(lang);
  const items = rows
    .map((r) => {
      const at = pickString(r, "administeredAt");
      const action = pickString(r, "marAction") || "";
      const route = pickString(r, "route");
      const doseValue = r.doseValue;
      const doseUnit = pickString(r, "doseUnit");
      const dose =
        doseValue != null && (typeof doseValue === "number" || typeof doseValue === "string")
          ? `${String(doseValue)}${doseUnit ? ` ${doseUnit}` : ""}`
          : null;
      const label = pickString(r, "medicationLabelSnapshot") || tcommon(lang, "emptyDash");
      const performer = asObject(r.administeredBy);
      const performerName = performer
        ? `${pickString(performer, "firstName") ?? ""} ${pickString(performer, "lastName") ?? ""}`.trim()
        : "";
      const notes = sanitizeMarAdministrationVisibleNote(pickString(r, "notes"), lang === "fr" ? "fr" : "en");
      const parts: string[] = [];
      parts.push(
        `<strong>${esc(label)}</strong>${dose ? ` — ${esc(dose)}` : ""}${route ? ` — ${esc(route)}` : ""}`
      );
      const meta: string[] = [];
      meta.push(esc(fmtDt(at, lang)));
      if (action) meta.push(esc(action));
      if (performerName) meta.push(esc(performerName));
      return `<li>${parts.join(" ")}<div style="font-size:11px;color:#475569;margin-top:2px;">${meta.join(
        " · "
      )}</div>${notes ? `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:pre-wrap;">${esc(notes)}</div>` : ""}</li>`;
    })
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function marMedicationResponsePrintLabel(lang: SupportedLanguage, key: string): string {
  const mapEn: Record<string, string> = {
    outcome: "Response",
    responseTime: "Response time",
    documentedAt: "Documented",
    by: "By",
    pain: "Pain",
    trend: "Pain trend",
    sideEffects: "Side effects",
    comment: "Comment",
    administered: "Administered",
    PAIN_REDUCED: "Pain reduced",
    EFFECTIVE: "Effective",
    NO_CHANGE: "No change",
    ADVERSE_REACTION: "Adverse reaction",
    noAdverseReaction: "No adverse reaction",
    nausea: "Nausea",
    vomiting: "Vomiting",
    itching: "Itching",
    sedation: "Sedation",
    dizziness: "Dizziness",
    constipation: "Constipation",
    respiratoryDepression: "Respiratory depression",
    IMPROVED: "Improved",
    SAME: "Same",
    WORSE: "Worse",
    unknownAuthor: "Unknown",
  };
  const mapFr: Record<string, string> = {
    outcome: "Réponse",
    responseTime: "Heure de la réponse",
    documentedAt: "Documenté",
    by: "Par",
    pain: "Douleur",
    trend: "Évolution de la douleur",
    sideEffects: "Effets indésirables",
    comment: "Commentaire",
    administered: "Administré",
    PAIN_REDUCED: "Douleur réduite",
    EFFECTIVE: "Efficace",
    NO_CHANGE: "Sans changement",
    ADVERSE_REACTION: "Réaction indésirable",
    noAdverseReaction: "Aucune réaction indésirable",
    nausea: "Nausées",
    vomiting: "Vomissements",
    itching: "Prurit",
    sedation: "Sédation",
    dizziness: "Vertiges",
    constipation: "Constipation",
    respiratoryDepression: "Dépression respiratoire",
    IMPROVED: "Amélioration",
    SAME: "Stable",
    WORSE: "Aggravation",
    unknownAuthor: "Inconnu",
  };
  const map = lang === "fr" ? mapFr : mapEn;
  return map[key] ?? key;
}

function renderMedicationResponses(lang: SupportedLanguage, rows: AnyRecord[] | null): string {
  if (rows == null || rows.length === 0) return "";
  const responseRows: string[] = [];

  for (const admin of rows) {
    const embedded = asArray(admin.medicationResponses);
    const responses =
      embedded.length > 0
        ? (embedded as ReturnType<typeof parseMarMedicationResponseNotes>)
        : sortMarMedicationResponsesNewestFirst(parseMarMedicationResponseNotes(pickString(admin, "notes")));
    if (responses.length === 0) continue;

    const label = pickString(admin, "medicationLabelSnapshot") || tcommon(lang, "emptyDash");
    const doseValue = admin.doseValue;
    const doseUnit = pickString(admin, "doseUnit");
    const dose =
      doseValue != null && (typeof doseValue === "number" || typeof doseValue === "string")
        ? `${String(doseValue)}${doseUnit ? ` ${doseUnit}` : ""}`
        : "";
    const route = pickString(admin, "route");
    const administeredAt = fmtDt(pickString(admin, "administeredAt"), lang);
    const header = [label, dose, route].filter(Boolean).join(" ");

    for (const response of responses) {
      const outcomeLabel =
        marMedicationResponsePrintLabel(lang, response.responseCode) !== response.responseCode
          ? marMedicationResponsePrintLabel(lang, response.responseCode)
          : response.responseCode;
      const sideEffects = listMedicationResponseSideEffectKeys(response);
      const fields = buildMedicationResponseSummaryFieldsFromParsed({
        response,
        outcomeLabel: `${marMedicationResponsePrintLabel(lang, "outcome")}: ${outcomeLabel}`,
        responseTimePrefix: marMedicationResponsePrintLabel(lang, "responseTime"),
        documentedAtPrefix: marMedicationResponsePrintLabel(lang, "documentedAt"),
        documentedByPrefix: marMedicationResponsePrintLabel(lang, "by"),
        documentedByUnknownLabel: `${marMedicationResponsePrintLabel(lang, "by")}: ${marMedicationResponsePrintLabel(lang, "unknownAuthor")}`,
        painPrefix: marMedicationResponsePrintLabel(lang, "pain"),
        painTrendPrefix: marMedicationResponsePrintLabel(lang, "trend"),
        sideEffectsPrefix: marMedicationResponsePrintLabel(lang, "sideEffects"),
        commentPrefix: marMedicationResponsePrintLabel(lang, "comment"),
        painTrendLabel: response.painResponseTrend
          ? marMedicationResponsePrintLabel(lang, response.painResponseTrend)
          : null,
        sideEffectLabels: sideEffects.map((key) => marMedicationResponsePrintLabel(lang, key)),
        formatInstant: (iso) => (iso ? fmtDt(iso, lang) : null),
      });

      const lines = [
        `<strong>${esc(header)}</strong>`,
        `<div style="font-size:11px;color:#475569;margin-top:2px;">${esc(marMedicationResponsePrintLabel(lang, "administered"))}: ${esc(administeredAt)}</div>`,
        ...fields.map(
          (field) =>
            `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:pre-wrap;">${esc(field.text)}</div>`
        ),
      ];
      responseRows.push(`<li style="margin-bottom:8px;">${lines.join("")}</li>`);
    }
  }

  if (responseRows.length === 0) return "";
  const title = lang === "fr" ? "Réponses médicamenteuses" : "Medication responses";
  return `<h3 style="font-size:12px;margin:14px 0 6px 0;font-weight:700;">${esc(title)}</h3><ul style="margin:6px 0;padding-left:18px;">${responseRows.join("")}</ul>`;
}

function renderPharmacyDispense(lang: SupportedLanguage, orders: AnyRecord[]): string {
  /**
   * Pharmacy dispenses for the encounter aren't returned by /encounters/:id/orders.
   * Phase 5C does not introduce new endpoints. We surface the per-medication
   * completion attribution and lot/dose snapshot already present in the order item
   * shape used by the encounter page; full pharmacy dispense rows belong to a
   * future Phase 5D backend manifest endpoint and are explicitly deferred here.
   */
  const lines: string[] = [];
  for (const o of orders) {
    const items = asArray(o.items);
    for (const it of items) {
      const cat = pickString(it, "catalogItemType") ?? "";
      if (cat !== "MEDICATION") continue;
      const completedAt = pickString(it, "completedAt");
      if (!completedAt) continue;
      const status = pickString(it, "status");
      // Only surface when truly completed (RESULTED/COMPLETED/VERIFIED) — exclude cancelled lines.
      if (status === "CANCELLED") continue;
      const completedByObj = asObject(it.completedBy);
      const completedBy = completedByObj
        ? `${pickString(completedByObj, "firstName") ?? ""} ${pickString(completedByObj, "lastName") ?? ""}`.trim()
        : "";
      const label = lineLabelForItem(lang, it, tFn(lang));
      lines.push(
        `<li>${esc(label || "—")} — ${esc(fmtDt(completedAt, lang))}${
          completedBy ? ` — ${esc(completedBy)}` : ""
        }</li>`
      );
    }
  }
  if (lines.length === 0) return noData(lang);
  return `<ul style="margin:6px 0;padding-left:18px;">${lines.join("")}</ul>`;
}

function renderProcedures(lang: SupportedLanguage, procedures: { entries: AnyRecord[] } | null): string {
  if (procedures == null) return sectionUnavailable(lang);
  if (procedures.entries.length === 0) return noData(lang);
  const items = procedures.entries
    .map((p) => {
      const at = pickString(p, "performedAt") || pickString(p, "createdAt");
      const performer = pickString(p, "performerDisplayName");
      const title = pickString(p, "performerTitle");
      const ptype = pickString(p, "procedureType") || "—";
      const site = pickString(p, "site");
      const performerLabel = performer ? `${performer}${title ? ` (${title})` : ""}` : "";
      return `<li><strong>${esc(ptype)}</strong>${site ? ` — ${esc(site)}` : ""}<div style="font-size:11px;color:#475569;margin-top:2px;">${esc(
        fmtDt(at, lang)
      )}${performerLabel ? ` — ${esc(performerLabel)}` : ""}</div></li>`;
    })
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderIvAccess(
  lang: SupportedLanguage,
  iv: { active: AnyRecord[]; removed: AnyRecord[] } | null
): string {
  if (iv == null) return sectionUnavailable(lang);
  if (iv.active.length === 0 && iv.removed.length === 0) return noData(lang);
  const out: string[] = [];
  if (iv.active.length > 0) {
    out.push(
      `<p style="margin:6px 0 4px 0;font-weight:600;">${esc(tprev(lang, "ivActive"))} (${iv.active.length})</p>`
    );
    out.push(
      `<ul style="margin:0;padding-left:18px;">${iv.active
        .map((a) => {
          const site = pickString(a, "site") || "—";
          const gauge = pickString(a, "gauge") || "—";
          const at = pickString(a, "insertedAt");
          const by = pickString(a, "recordedByDisplayName");
          const notes = pickString(a, "notes");
          return `<li><strong>${esc(site)}</strong> — ${esc(tprev(lang, "ivGauge"))}: ${esc(
            gauge
          )} — ${esc(tprev(lang, "ivInsertedAt"))} ${esc(fmtDt(at, lang))}${
            by ? ` — ${esc(tprev(lang, "ivBy"))} ${esc(by)}` : ""
          }${notes ? `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:pre-wrap;">${esc(notes)}</div>` : ""}</li>`;
        })
        .join("")}</ul>`
    );
  }
  if (iv.removed.length > 0) {
    out.push(
      `<p style="margin:8px 0 4px 0;font-weight:600;">${esc(tprev(lang, "ivRemoved"))} (${iv.removed.length})</p>`
    );
    out.push(
      `<ul style="margin:0;padding-left:18px;">${iv.removed
        .map((r) => {
          const site = pickString(r, "site") || "—";
          const gauge = pickString(r, "gauge") || "—";
          const insertedAt = pickString(r, "insertedAt");
          const removedAt = pickString(r, "removedAt");
          const insertedBy = pickString(r, "insertedByDisplayName");
          const removedBy = pickString(r, "removedByDisplayName") || pickString(r, "recordedByDisplayName");
          const reason = pickString(r, "removalReason") || pickString(r, "reason");
          const notes = pickString(r, "removalNotes") || pickString(r, "notes");
          return `<li><strong>${esc(site)}</strong> — ${esc(tprev(lang, "ivGauge"))}: ${esc(
            gauge
          )} — ${esc(tprev(lang, "ivInsertedAt"))} ${esc(fmtDt(insertedAt, lang))}${
            insertedBy ? ` (${esc(insertedBy)})` : ""
          } — ${esc(tprev(lang, "ivRemovedAt"))} ${esc(fmtDt(removedAt, lang))}${
            removedBy ? ` (${esc(removedBy)})` : ""
          }${reason ? `<div style="font-size:11px;color:#475569;margin-top:2px;"><strong>${esc(tprev(lang, "ivReason"))}:</strong> ${esc(reason)}</div>` : ""}${
            notes ? `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:pre-wrap;">${esc(notes)}</div>` : ""
          }</li>`;
        })
        .join("")}</ul>`
    );
  }
  return out.join("");
}

function renderClinicalTimeline(
  lang: SupportedLanguage,
  rows: AnyRecord[] | null
): string {
  if (rows == null) return sectionUnavailable(lang);
  if (rows.length === 0) return noData(lang);
  const cap =
    rows.length >= CLINICAL_TIMELINE_LIMIT
      ? `<p style="margin:6px 0;font-size:11px;color:#b45309;">${esc(
          tprev(lang, "cappedNote").replace("{limit}", String(CLINICAL_TIMELINE_LIMIT))
        )}</p>`
      : "";
  const items = rows
    .map((r) => {
      const at = pickString(r, "createdAt");
      const storedType = pickString(r, "eventType") || "";
      const displayType = resolveClinicalTimelineDisplayEventType({
        eventType: storedType,
        payloadJson: r.payloadJson,
      });
      const label = clinicalTimelineDisplayLabelFr(displayType);
      const performer = performerLineFromCreatedBy(r, lang);
      return `<li><strong>${esc(label)}</strong> — ${esc(fmtDt(at, lang))}${
        performer ? ` — ${esc(performer)}` : ""
      }</li>`;
    })
    .join("");
  return `${cap}<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderAuditTimeline(
  lang: SupportedLanguage,
  rows: ChartAuditTimelineItem[] | null
): string {
  if (rows == null) return sectionUnavailable(lang);
  if (rows.length === 0) return noData(lang);
  const cap =
    rows.length >= 200
      ? `<p style="margin:6px 0;font-size:11px;color:#b45309;">${esc(
          tprev(lang, "cappedNote").replace("{limit}", "200")
        )}</p>`
      : "";
  const items = rows
    .map((row) => {
      const who = row.userDisplayFr ? `${tcommon(lang, "auditBy")} ${row.userDisplayFr}` : tcommon(lang, "emptyDash");
      const detail = row.detailFr ? `<br/><span style="font-size:11px;color:#475569;">${esc(row.detailFr)}</span>` : "";
      return `<li><strong>${esc(row.shortLabel || row.action)}</strong><br/>${esc(who)} — ${esc(
        fmtDt(row.createdAt, lang)
      )}${detail}</li>`;
    })
    .join("");
  return `${cap}<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

function renderFollowUps(
  lang: SupportedLanguage,
  rows: FollowUpRow[] | null,
  encounterId: string
): string {
  if (rows == null) return sectionUnavailable(lang);
  const forEnc = rows.filter((r) => (r as { encounterId?: string | null }).encounterId === encounterId);
  if (forEnc.length === 0) return noData(lang);
  const items = forEnc
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((fu) => {
      const reason = fu.reason?.trim() ? esc(fu.reason) : esc(tcommon(lang, "emptyDash"));
      const notes = fu.notes?.trim() ? ` — ${esc(fu.notes)}` : "";
      const status = fu.status;
      return `<li>${esc(fmtDt(fu.dueDate, lang))} — <strong>${esc(status)}</strong> — ${reason}${notes}</li>`;
    })
    .join("");
  return `<ul style="margin:6px 0;padding-left:18px;">${items}</ul>`;
}

/* ---------- Top-level HTML composer ---------- */

function getEncounterChartLivePreviewHtml(
  params: EncounterChartLivePreviewParams,
  fetched: FetchedSections
): string {
  const { encounter, triage, orders, facilityName, language } = params;
  const lang = language;
  const loc = printDateLocale(lang);
  const printedAt = new Date().toLocaleString(loc);
  const htmlLang = lang === "en" ? "en" : "fr";
  const titleStr = tprev(lang, "h1");
  const banner = tprev(lang, "banner");
  const printedAtLine = tprev(lang, "printedAt").replace("{date}", printedAt);
  const encounterIdSafe = pickString(encounter, "id") ?? "";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <title>${esc(titleStr)} — ${esc(encounterIdSafe)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; padding: 20px; font-size: 13px; color: #000; background: #fff; max-width: 880px; margin: 0 auto; }
    h1 { font-size: 18px; margin: 0 0 6px 0; font-weight: 700; }
    h2 { font-size: 14px; margin: 22px 0 10px 0; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .meta p { margin: 4px 0; line-height: 1.45; }
    .preview-banner {
      margin: 0 0 16px 0;
      padding: 10px 14px;
      border: 1px solid #b45309;
      background: #fffbeb;
      color: #78350f;
      font-weight: 600;
      font-size: 12px;
      border-radius: 4px;
    }
    .printed-at {
      font-size: 11px;
      color: #475569;
      margin: 0 0 12px 0;
    }
    ul { margin: 6px 0 0 0; padding-left: 18px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${esc(titleStr)}</h1>
  <p class="printed-at">${esc(printedAtLine)}</p>
  <div class="preview-banner" role="alert">${esc(banner)}</div>

  ${h2(lang, "sectionHeader")}
  ${renderHeader(lang, encounter, facilityName ?? null, triage)}

  ${h2(lang, "sectionTriage")}
  ${renderTriage(lang, triage)}

  ${h2(lang, "sectionVitalsHistory")}
  ${renderVitalsHistory(lang, fetched.vitalsHistory)}

  ${h2(lang, "sectionDiagnoses")}
  ${renderEncounterDiagnoses(lang, fetched.encounterDiagnoses, encounterIdSafe)}

  ${h2(lang, "sectionNursingAssessment")}
  ${renderNursingAssessment(lang, encounter)}

  ${h2(lang, "sectionNursingReassessments")}
  ${renderNursingReassessments(lang, fetched.nursingReassessmentEvents)}

  ${h2(lang, "sectionProviderDocumentation")}
  ${renderProviderDocumentation(lang, encounter)}

  ${h2(lang, "sectionProviderAddenda")}
  ${renderProviderAddenda(lang, encounter)}

  ${h2(lang, "sectionProviderMseHistory")}
  ${renderProviderMseHistory(lang, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionHandoff")}
  ${renderHandoff(lang, encounter, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionAdmissionSummary")}
  ${renderAdmissionSummary(lang, encounter, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionDischargeSummary")}
  ${renderDischargeSummary(lang, encounter, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionDispositionSupplement")}
  ${renderDispositionSupplementHistory(lang, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionTriageAssessmentHistory")}
  ${renderTriageAssessmentHistory(lang, fetched.clinicalDocumentationEvents)}

  ${h2(lang, "sectionOrders")}
  ${renderOrders(lang, orders)}

  ${h2(lang, "sectionResults")}
  ${renderResults(lang, orders)}

  ${h2(lang, "sectionMar")}
  ${renderMar(lang, fetched.medicationAdministrations)}
  ${renderMedicationResponses(lang, fetched.medicationAdministrations)}

  ${h2(lang, "sectionPharmacyDispense")}
  ${renderPharmacyDispense(lang, orders)}

  ${h2(lang, "sectionProcedures")}
  ${renderProcedures(lang, fetched.procedures)}

  ${h2(lang, "sectionIvAccess")}
  ${renderIvAccess(lang, fetched.ivAccess)}

  ${h2(lang, "sectionClinicalTimeline")}
  ${renderClinicalTimeline(lang, fetched.clinicalTimeline)}

  ${h2(lang, "sectionAuditTimeline")}
  ${renderAuditTimeline(lang, fetched.auditTimeline)}

  ${h2(lang, "sectionFollowUps")}
  ${renderFollowUps(lang, fetched.followUps, encounterIdSafe)}

  <p style="margin-top:24px;font-size:11px;color:#000;">${esc(banner)}</p>
</body>
</html>`;
}

/* ---------- Public print entry ---------- */

/**
 * Opens a print window immediately on the user gesture, then fetches all
 * encounter-scoped read endpoints in parallel and writes the composed HTML.
 *
 * Mirrors `printPatientChart` and `printErPacket` lifecycle (no popup blocker
 * surprises). Per-section endpoint failures fall back to "Section unavailable"
 * via Promise.allSettled in `fetchEncounterChartPreviewData`.
 */
export async function printEncounterChartLivePreview(
  params: EncounterChartLivePreviewParams
): Promise<void> {
  const { encounter, language } = params;
  const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
  if (!win) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-alert
      alert(printT(language, "printOutput.common.popupBlocked"));
    }
    return;
  }
  win.document.open();
  win.document.write(
    `<!DOCTYPE html><html lang="${language === "en" ? "en" : "fr"}"><head><meta charset="utf-8" /><title>${esc(
      printT(language, "printOutput.common.printPreparing")
    )}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;font-size:14px;color:#333;"><p>${esc(
      printT(language, "printOutput.common.printPreparing")
    )}</p></body></html>`
  );
  win.document.close();

  const encounterId = pickString(encounter, "id") ?? "";
  const patientObj = asObject(encounter.patient);
  const patientId = patientObj ? pickString(patientObj, "id") ?? "" : "";

  let html: string;
  try {
    const fetched = await fetchEncounterChartPreviewData(encounterId, patientId, params.facilityId);
    html = getEncounterChartLivePreviewHtml(params, fetched);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to compose encounter chart live preview:", e);
    html = `<!DOCTYPE html><html lang="${language === "en" ? "en" : "fr"}"><head><meta charset="utf-8" /><title>${esc(
      printT(language, "printOutput.common.printErrorTitle")
    )}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;font-size:14px;color:#333;"><p>${esc(
      printT(language, "printOutput.common.printError")
    )}</p></body></html>`;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
      win.close();
    } catch {
      /** intentionally ignore — user can re-print from the open tab. */
    }
  }, 300);
}
