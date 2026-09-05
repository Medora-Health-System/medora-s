/**
 * Phase 5E / MEDUI.D4C.8C — Server-side HTML rendering for the encounter chart export manifest.
 *
 * Pure string composition from `ChartExportManifest` only (same data path as JSON).
 * No client JavaScript, no external assets, no PDF. All dynamic text is HTML-escaped.
 * Structured clinical payloads render as human-readable key/value lists (not raw JSON dumps).
 * Attachment rows list filename / mime / size only (manifest never carries base64).
 */

import type { ChartExportManifest } from "./chart-export.service";
import {
  sanitizeMarAdministrationVisibleNote,
  selectClinicalDocumentationCardTitle,
  selectClinicalDocumentationPayloadSummary,
  resolveInternalProductUiLanguageOrDefault,
  pickLegacyBilingualStoredPair,
  lookupGovernedCatalogEsLabel,
  parseProductUiLanguage,
  type ClinicalDocumentationSummaryLocale,
  type ProductUiLanguage,
} from "@medora/shared";
import { chartExportDentalChrome, chartExportHtmlChrome } from "./chart-export-print-chrome";

/** HTML entity escape for text nodes and attribute-safe contexts. */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function esc(s: string | null | undefined): string {
  return escapeHtml(s ?? "");
}

function encounterNoteGovernanceHtml(n: {
  voidedAt?: string | null;
  voidReasonCode?: string | null;
  isAmendment?: boolean;
  amendmentReason?: string | null;
  requiresCosign?: boolean;
  cosignedAt?: string | null;
  cosignRoleSnapshot?: string | null;
}): string {
  const parts: string[] = [];
  if (n.voidedAt) {
    parts.push(`<strong>[VOIDED]</strong> Reason: ${esc(n.voidReasonCode ?? "—")}`);
  }
  if (n.isAmendment) {
    parts.push(
      `<strong>[AMENDMENT]</strong>${n.amendmentReason ? ` — ${esc(n.amendmentReason)}` : ""}`
    );
  }
  if (n.requiresCosign) {
    if (n.cosignedAt) {
      parts.push(`<strong>[COSIGNED]</strong> (${esc(n.cosignRoleSnapshot ?? "—")})`);
    } else if (!n.voidedAt) {
      parts.push(`<strong>[PENDING COSIGN]</strong>`);
    }
  }
  return parts.length ? `<div class="muted">${parts.join(" ")}</div>` : "";
}

const NO_DATA = "No data documented";

const PROCEDURE_EXPORT_LABELS = {
  en: {
    section: "Section",
    procedure: "Procedure",
    canonicalId: "Canonical identity",
    linkedEvent: "Linked event",
    performedAt: "Performed at",
    performedBy: "Performed by",
    documentedAt: "Documented at",
    documentedBy: "Documented by",
    status: "Status",
    completed: "Completed",
    summary: "Summary",
    roleNursing: "Nursing documentation",
    roleProvider: "Provider documentation",
  },
  fr: {
    section: "Volet",
    procedure: "Procédure",
    canonicalId: "Identité canonique",
    linkedEvent: "Liée à l'événement",
    performedAt: "Réalisée le",
    performedBy: "Réalisée par",
    documentedAt: "Documentée le",
    documentedBy: "Documentée par",
    status: "Statut",
    completed: "Terminée",
    summary: "Résumé",
    roleNursing: "Documentation infirmière",
    roleProvider: "Documentation médicale",
  },
  es: {
    section: "Sección",
    procedure: "Procedimiento",
    canonicalId: "Identidad canónica",
    linkedEvent: "Evento vinculado",
    performedAt: "Realizado el",
    performedBy: "Realizado por",
    documentedAt: "Documentado el",
    documentedBy: "Documentado por",
    status: "Estado",
    completed: "Completado",
    summary: "Resumen",
    roleNursing: "Documentación de enfermería",
    roleProvider: "Documentación médica",
  },
} as const;

export type ChartExportHtmlLocale = ProductUiLanguage;

function pickStoredCatalogOrAuthoredDisplay(
  locale: ProductUiLanguage,
  en?: string | null,
  fr?: string | null,
  canonicalCode?: string | null
): string {
  const parsed = parseProductUiLanguage(locale);
  const code = canonicalCode?.trim() ?? "";
  if (parsed === "es") {
    const overlay = code ? lookupGovernedCatalogEsLabel("CARE_PROCEDURE", code) : "";
    return overlay || code || "—";
  }
  const picked = pickLegacyBilingualStoredPair(locale, {
    en: (en ?? "").trim(),
    fr: (fr ?? "").trim(),
  });
  if (picked.kind === "localized" && picked.value.trim()) return picked.value.trim();
  return code || "—";
}

function pickAuthoredBilingualNarrative(
  locale: ProductUiLanguage,
  en?: string | null,
  fr?: string | null
): string | undefined {
  const parsed = parseProductUiLanguage(locale);
  if (parsed === "es") return undefined;
  const picked = pickLegacyBilingualStoredPair(locale, {
    en: (en ?? "").trim(),
    fr: (fr ?? "").trim(),
  });
  if (picked.kind !== "localized") return undefined;
  const text = picked.value.trim();
  return text || undefined;
}

function formatHumanScalar(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "—";
  }
  return "—";
}

/** Human-readable projection of structured export payloads (D4C.8C — no raw JSON UX). */
function humanReadableStructuredBlock(value: unknown, depth = 0): string {
  if (value == null) return `<p class="muted">${esc(NO_DATA)}</p>`;
  if (typeof value !== "object") {
    return `<p>${esc(formatHumanScalar(value))}</p>`;
  }
  if (depth >= 4) {
    return `<p class="muted">${esc("Additional nested details omitted")}</p>`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `<p class="muted">${esc(NO_DATA)}</p>`;
    return `<ul class="structured-list">${value
      .map((item) => {
        if (item != null && typeof item === "object") {
          return `<li>${humanReadableStructuredBlock(item, depth + 1)}</li>`;
        }
        return `<li>${esc(formatHumanScalar(item))}</li>`;
      })
      .join("")}</ul>`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return `<p class="muted">${esc(NO_DATA)}</p>`;
  return `<dl class="structured-dl">${entries
    .map(([key, v]) => {
      const label = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (v != null && typeof v === "object") {
        return `<dt>${esc(label)}</dt><dd>${humanReadableStructuredBlock(v, depth + 1)}</dd>`;
      }
      return `<dt>${esc(label)}</dt><dd>${esc(formatHumanScalar(v))}</dd>`;
    })
    .join("")}</dl>`;
}

/** @deprecated Prefer humanReadableStructuredBlock — kept for tests that assert absence of json-block. */
function jsonPreBlock(value: unknown): string {
  return humanReadableStructuredBlock(value);
}

function renderProcedureExportEntry(
  entry: ChartExportManifest["procedures"]["entries"][number],
  locale: ChartExportHtmlLocale = "en"
): string {
  const labels = PROCEDURE_EXPORT_LABELS[locale];
  if (entry.eventType === "PROCEDURE_DOCUMENTED" && (entry.procedureNameFr || entry.procedureNameEn)) {
    const performedWhen = entry.performedAtIso ?? entry.documentedAtIso ?? entry.createdAt;
    const payload = entry.payloadJson as { procedureType?: unknown } | null | undefined;
    const canonical =
      entry.canonicalProcedureType?.trim() ||
      (typeof payload?.procedureType === "string" ? payload.procedureType.trim() : "");
    const procedureName = pickStoredCatalogOrAuthoredDisplay(
      locale,
      entry.procedureNameEn,
      entry.procedureNameFr,
      canonical
    );
    const clinicalSummary = pickAuthoredBilingualNarrative(
      locale,
      entry.clinicalSummaryEn,
      entry.clinicalSummaryFr
    );
    const statusLabel = entry.status === "COMPLETED" ? labels.completed : entry.status ?? "—";
    const roleLabel =
      entry.documentationRole === "NURSING"
        ? labels.roleNursing
        : labels.roleProvider;
    return `<li class="procedure-doc">
      ${pAlways(labels.section, roleLabel)}
      ${pAlways(labels.procedure, procedureName)}
      ${pLine(labels.canonicalId, entry.canonicalProcedureType ?? undefined)}
      ${pLine(labels.linkedEvent, entry.linkedProcedureEventId ?? undefined)}
      ${pAlways(labels.performedAt, performedWhen)}
      ${pLine(labels.performedBy, entry.performedByDisplayFr)}
      ${pAlways(labels.documentedAt, entry.documentedAtIso ?? entry.createdAt)}
      ${pAlways(labels.documentedBy, entry.documentedByDisplayFr ?? entry.createdByDisplayFr)}
      ${pAlways(labels.status, statusLabel)}
      ${pLine(labels.summary, clinicalSummary ?? undefined)}
      ${jsonPreBlock(entry.payloadJson)}
    </li>`;
  }
  return `<li><strong>${esc(entry.createdAt)}</strong> — ${esc(entry.eventType)} — ${esc(
    entry.createdByDisplayFr ?? "—"
  )}${jsonPreBlock(entry.payloadJson)}</li>`;
}

function workspaceProviderNoteHtml(
  workspaceNote: ChartExportManifest["encounter"]["providerDocumentation"]["workspaceNote"]
): string {
  if (!workspaceNote) return `<p class="muted">${esc(NO_DATA)}</p>`;
  const meta = [workspaceNote.savedBy, workspaceNote.savedAt].filter(Boolean).join(" — ");
  return `<div class="note-block">
    <h3>${esc(workspaceNote.title)}</h3>
    ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
    ${workspaceNote.sections
      .map(
        (section) => `<div class="note-section"><strong>${esc(section.label)}</strong><div class="pre-text">${esc(
          section.text
        )}</div></div>`
      )
      .join("")}
  </div>`;
}

function nursingDocumentationHtml(
  nursingDocumentation: ChartExportManifest["encounter"]["nursingDocumentation"]
): string {
  if (!nursingDocumentation) return `<p class="muted">${esc(NO_DATA)}</p>`;
  const parts: string[] = [];
  const initial = nursingDocumentation.initialAssessment;
  if (initial && initial.sections.length > 0) {
    const meta = [initial.documentedBy, initial.documentedAt].filter(Boolean).join(" — ");
    parts.push(`<div class="note-block">
      <h3>${esc(initial.title)}</h3>
      ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
      ${initial.sections
        .map(
          (section) => `<div class="note-section"><strong>${esc(section.label)}</strong><div class="pre-text">${esc(
            section.text
          )}</div></div>`
        )
        .join("")}
    </div>`);
  }
  const inpatient = nursingDocumentation.inpatientNursingAssessment;
  if (inpatient && inpatient.sections.length > 0) {
    const meta = [
      inpatient.documentedBy,
      inpatient.documentedAt,
      inpatient.serverAuthoredAt && inpatient.serverAuthoredAt !== inpatient.documentedAt
        ? `saved ${inpatient.serverAuthoredAt}`
        : null,
    ]
      .filter(Boolean)
      .join(" — ");
    parts.push(`<div class="note-block">
      <h3>${esc(inpatient.title)}</h3>
      ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
      ${inpatient.sections
        .map(
          (section) => `<div class="note-section"><strong>${esc(section.label)}</strong><div class="pre-text">${esc(
            section.text
          )}</div></div>`
        )
        .join("")}
    </div>`);
  }
  const discharge = nursingDocumentation.dischargeExecution;
  if (discharge) {
    const meta = [discharge.documentedBy, discharge.documentedAt].filter(Boolean).join(" — ");
    parts.push(`<div class="note-block">
      <h3>Nursing discharge documentation</h3>
      ${meta ? `<p class="muted">${esc(meta)}</p>` : ""}
      ${
        discharge.executionNote
          ? `<div class="note-section"><strong>Execution note</strong><div class="pre-text">${esc(
              discharge.executionNote
            )}</div></div>`
          : ""
      }
    </div>`);
  }
  return parts.length > 0 ? parts.join("") : `<p class="muted">${esc(NO_DATA)}</p>`;
}

function h2(title: string): string {
  return `<h2>${esc(title)}</h2>`;
}

function edClinicalTimelineHtml(
  edClinicalTimeline: ChartExportManifest["edClinicalTimeline"]
): string {
  if (!edClinicalTimeline?.items.length) {
    return `<p class="muted">${esc(NO_DATA)}</p>`;
  }
  const parts: string[] = [];
  let lastUndated = false;
  for (const entry of edClinicalTimeline.items) {
    if (entry.isUndated && !lastUndated) {
      parts.push(`<p class="muted"><strong>Undated documentation</strong></p>`);
      lastUndated = true;
    }
    const actor = entry.actorName
      ? entry.actorRoleTitle
        ? `${entry.actorName}, ${entry.actorRoleTitle}`
        : entry.actorName
      : null;
    const meta = [entry.timestampIso, entry.categoryLabel, actor].filter(Boolean).join(" — ");
    parts.push(
      `<div class="note-section"><p class="muted">${esc(meta)}</p><div class="pre-text">${esc(entry.summary)}</div></div>`
    );
  }
  return parts.join("");
}

function section(title: string, inner: string): string {
  return `<section class="sec">${h2(title)}${inner}</section>`;
}

function pLine(label: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  return `<p><span class="lbl">${esc(label)}</span> ${esc(v)}</p>`;
}

function pAlways(label: string, value: string | null | undefined): string {
  return `<p><span class="lbl">${esc(label)}</span> ${esc(value ?? "—")}</p>`;
}

/**
 * Renders the manifest as a complete HTML document (print-friendly, inline CSS only).
 */
export function renderEncounterChartExportHtml(
  manifest: ChartExportManifest,
  options?: { locale?: ChartExportHtmlLocale | string }
): string {
  const locale = resolveInternalProductUiLanguageOrDefault(options?.locale);
  const htmlChrome = chartExportHtmlChrome(locale);
  const dentalChrome = chartExportDentalChrome(locale);
  const title = manifest.livePreview
    ? "Encounter chart export (live preview)"
    : "Encounter chart export (generated)";

  const bannerLive = manifest.livePreview
    ? `<div class="banner banner-live" role="alert">
        <strong>Live preview — not a finalized legal record export.</strong>
        Data may change until the encounter is closed. This document is not an immutable snapshot.
      </div>`
    : "";

  const bannerClosed = !manifest.livePreview
    ? `<div class="banner banner-closed" role="status">
        <strong>Generated encounter chart export.</strong>
        This is not an immutable legal snapshot; versioning and cryptographic integrity are planned for a later phase.
      </div>`
    : "";

  const facilityBlock = `
    ${pAlways("Facility ID", manifest.facility.id)}
    ${pLine("Facility name", manifest.facility.name)}
  `;

  const patientBlock = `
    ${pAlways("Patient ID", manifest.patient.id)}
    ${pLine("MRN", manifest.patient.mrn)}
    ${pAlways("Global MRN", manifest.patient.globalMrn)}
    ${pLine("National ID", manifest.patient.nationalId)}
    ${pAlways("Name", `${manifest.patient.firstName} ${manifest.patient.lastName}`.trim())}
    ${pLine("Date of birth", manifest.patient.dob)}
    ${pAlways("Sex", manifest.patient.sex)}
    ${pLine("Sex at birth", manifest.patient.sexAtBirth)}
  `;

  const enc = manifest.encounter;
  const phys = enc.physicianAssigned
    ? `${enc.physicianAssigned.firstName} ${enc.physicianAssigned.lastName}`.trim()
    : null;
  const obsStay = enc.observationStay;
  const observationStayHtml =
    obsStay?.applicable === true
      ? `
    <h3>Observation stay (operational)</h3>
    ${pAlways("Schema version", obsStay.schemaVersion)}
    ${pAlways("Care path label", obsStay.carePathLabel ?? "—")}
    ${pLine("LOS anchor kind", obsStay.anchorKind)}
    ${pLine("LOS anchor time (ISO)", obsStay.anchorIso)}
    ${pLine("Stay end time (ISO)", obsStay.stayEndIso)}
    ${
      obsStay.observationLosHours != null
        ? pAlways("Duration (hours, rounded)", String(obsStay.observationLosHours))
        : ""
    }
    ${
      obsStay.observationLosMinutes != null
        ? pAlways("Duration (whole minutes)", String(obsStay.observationLosMinutes))
        : ""
    }
    ${pAlways("Overnight UTC calendar span", obsStay.overnightObservationUtcSpan ? "Yes" : "No")}
    ${pAlways("Extended stay ≥ 24h (operational)", obsStay.extendedObservation24hPlus ? "Yes" : "No")}
    ${pAlways("Preview clock (open encounter)", obsStay.preview ? "Yes" : "No")}
    `
      : "";
  const encounterBlock = `
    ${pAlways("Encounter ID", enc.id)}
    ${pAlways("Type", enc.type)}
    ${pAlways("Status", enc.status)}
    ${pAlways("Workflow state", enc.workflowState)}
    ${pLine("Chief complaint", enc.chiefComplaint)}
    ${pLine("Room", enc.roomLabel)}
    ${pLine("Assigned physician", phys)}
    ${pAlways("Opened at", enc.createdAt)}
    ${pAlways("Updated at", enc.updatedAt)}
    ${pLine("Admitted at", enc.admittedAt)}
    ${pLine("Discharged at", enc.dischargedAt)}
    ${pLine("Discharge status", enc.dischargeStatus)}
    ${pLine("Closed at", enc.closedAt)}
    ${pLine("Closed by", enc.closedByDisplayFr)}
    ${pLine("Provider documentation status", enc.providerDocumentation.status)}
    ${pLine("Signed at", enc.providerDocumentation.signedAt)}
    ${pLine("Signed by", enc.providerDocumentation.signedByDisplayFr)}
    <h3>Structured provider documentation</h3>
    ${workspaceProviderNoteHtml(enc.providerDocumentation.workspaceNote)}
    ${pLine("Treatment plan", enc.treatmentPlan)}
    ${pLine("Clinician impression", enc.clinicianImpression)}
    ${pLine("Provider note", enc.providerNote)}
    ${observationStayHtml}
    <h3>Initial nursing documentation</h3>
    ${nursingDocumentationHtml(enc.nursingDocumentation)}
    <h3>Clinical timeline</h3>
    ${edClinicalTimelineHtml(manifest.edClinicalTimeline ?? null)}
    <h3>Nursing assessment</h3>
    ${enc.nursingAssessment != null ? humanReadableStructuredBlock(enc.nursingAssessment) : `<p class="muted">${esc(NO_DATA)}</p>`}
    <h3>Discharge summary</h3>
    ${enc.dischargeSummaryJson != null ? humanReadableStructuredBlock(enc.dischargeSummaryJson) : `<p class="muted">${esc(NO_DATA)}</p>`}
    <h3>Admission summary</h3>
    ${enc.admissionSummaryJson != null ? humanReadableStructuredBlock(enc.admissionSummaryJson) : `<p class="muted">${esc(NO_DATA)}</p>`}
    <h3>Provider addenda</h3>
    ${
      enc.providerAddenda.length === 0
        ? `<p class="muted">${esc(NO_DATA)}</p>`
        : `<ul>${enc.providerAddenda
            .map(
              (a) => `<li><span class="muted">${esc(a.createdAt)}</span> — ${esc(a.createdByDisplayFr ?? "—")}<div class="pre-text">${esc(
                a.text
              )}</div></li>`
            )
            .join("")}</ul>`
    }
    <h3>Encounter notes</h3>
    ${
      (enc.encounterNotes ?? []).length === 0
        ? `<p class="muted">${esc(NO_DATA)}</p>`
        : `<ul>${(enc.encounterNotes ?? [])
            .map(
              (n) =>
                `<li><span class="muted">${esc(n.createdAt)}</span> — ${esc(n.noteType)} — ${esc(
                  n.authorDisplayName
                )} (${esc(n.authorRoleTitle)})${encounterNoteGovernanceHtml(n)}<div class="pre-text">${esc(n.body)}</div></li>`
            )
            .join("")}</ul>`
    }
    <h3>Clinical documentation (structured)</h3>
    ${
      (enc.clinicalDocumentationEntries ?? []).length === 0
        ? `<p class="muted">${esc(NO_DATA)}</p>`
        : `<ul>${(enc.clinicalDocumentationEntries ?? [])
            .map((entry) => {
              const edocLocale: ClinicalDocumentationSummaryLocale = locale;
              const title = selectClinicalDocumentationCardTitle(entry, edocLocale);
              const summaryLines = selectClinicalDocumentationPayloadSummary(entry, edocLocale);
              const summary =
                summaryLines.length === 0
                  ? ""
                  : `<ul>${summaryLines
                      .map((line) => `<li><strong>${esc(line.key)}</strong>: ${esc(line.value)}</li>`)
                      .join("")}</ul>`;
              const voidTag = entry.voidedAt ? ` <span class="muted">(voided ${esc(entry.voidedAt)})</span>` : "";
              const witnessPending =
                entry.requiresWitnessSignature && !entry.witnessedAt && !entry.voidedAt
                  ? ` <strong>[PENDING WITNESS]</strong>`
                  : "";
              const witnessLine =
                entry.witnessedAt && entry.witnessDisplayName
                  ? ` — <strong>[WITNESSED]</strong> ${esc(entry.witnessDisplayName)} (${esc(entry.witnessRoleTitle ?? "—")}) ${esc(entry.witnessedAt)}`
                  : "";
              const primarySigner = `<strong>${esc(htmlChrome.primarySigner)}</strong>: ${esc(entry.authorDisplayName)} (${esc(entry.authorRoleTitle)})`;
              const witnessSigner =
                entry.witnessedAt && entry.witnessDisplayName
                  ? ` — <strong>${esc(htmlChrome.witnessSigner)}</strong>: ${esc(entry.witnessDisplayName)} (${esc(entry.witnessRoleTitle ?? "—")})`
                  : "";
              return `<li><span class="muted">${esc(entry.createdAt)}</span> — ${esc(
                entry.category
              )} — ${esc(title)} — ${primarySigner}${witnessSigner}${witnessPending}${witnessLine}${voidTag}${summary}</li>`;
            })
            .join("")}</ul>`
    }
  `;

  const triageInner =
    manifest.triage == null
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `
    ${pLine("Chief complaint", manifest.triage.chiefComplaint)}
    ${manifest.triage.esi != null ? pAlways("ESI", String(manifest.triage.esi)) : ""}
    ${pLine("Onset at", manifest.triage.onsetAt)}
    ${pLine("Triage complete at", manifest.triage.triageCompleteAt)}
    <h3>Vitals JSON</h3>
    ${manifest.triage.vitalsJson != null ? jsonPreBlock(manifest.triage.vitalsJson) : `<p class="muted">${esc(NO_DATA)}</p>`}
    <h3>Stroke screen</h3>
    ${manifest.triage.strokeScreen != null ? jsonPreBlock(manifest.triage.strokeScreen) : `<p class="muted">${esc(NO_DATA)}</p>`}
    <h3>Sepsis screen</h3>
    ${manifest.triage.sepsisScreen != null ? jsonPreBlock(manifest.triage.sepsisScreen) : `<p class="muted">${esc(NO_DATA)}</p>`}
  `;

  const vitalsInner =
    manifest.vitalsHistory.entries.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ol>${manifest.vitalsHistory.entries
          .map(
            (e) => `<li><strong>${esc(e.recordedAt)}</strong> (${esc(e.source)})
        ${e.recordedBy.displayName ? ` — ${esc(e.recordedBy.displayName)}` : ""}
        ${jsonPreBlock(e.vitals)}</li>`
          )
          .join("")}</ol>`;

  const dxInner =
    manifest.diagnoses.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<p class="muted">Showing up to ${manifest.caps.diagnoses} of ${manifest.diagnoses.total} diagnosis row(s).</p>
      <table><thead><tr><th>Code</th><th>Description</th><th>Status</th><th>Onset</th></tr></thead><tbody>
      ${manifest.diagnoses.items
        .map(
          (d) =>
            `<tr><td>${esc(d.code)}</td><td>${esc(d.description ?? "")}</td><td>${esc(d.status)}</td><td>${esc(
              d.onsetDate ?? ""
            )}</td></tr>`
        )
        .join("")}
      </tbody></table>`;

  const docInner =
    manifest.documentationHistory.entries.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ol>${manifest.documentationHistory.entries
          .map(
            (e) => `<li><strong>${esc(e.createdAt)}</strong> — ${esc(e.eventType)} — ${esc(
              e.createdBy.displayName ?? "—"
            )}${jsonPreBlock(e.payloadJson)}</li>`
          )
          .join("")}</ol>`;

  const ordersInner =
    manifest.orders.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : manifest.orders
          .map((o) => {
            const items =
              o.items.length === 0
                ? `<p class="muted">${esc(NO_DATA)}</p>`
                : `<ul>${o.items
                    .map(
                      (it) =>
                        `<li>${esc(it.catalogItemType)} — ${esc(it.manualLabel ?? it.id)} — ${esc(it.status)} / ${esc(
                          it.lifecycleState
                        )}${it.completedAt ? ` — completed ${esc(it.completedAt)}` : ""}${
                          it.completedBy?.displayName ? ` — ${esc(it.completedBy.displayName)}` : ""
                        }</li>`
                    )
                    .join("")}</ul>`;
            return `<div class="order"><h4>Order ${esc(o.id)}</h4>
          ${pAlways("Type", o.type)}${pAlways("Status", o.status)}${pLine("Created at", o.createdAt)}
          ${o.cancelledAt ? pLine("Cancelled at", o.cancelledAt) : ""}${o.cancellationReason ? pLine("Cancellation reason", o.cancellationReason) : ""}
          ${items}</div>`;
          })
          .join("");

  const resultsInner =
    manifest.results.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : manifest.results
          .map((r) => {
            const attRows =
              r.attachmentMetadata.length === 0
                ? `<p class="muted">${esc(NO_DATA)} (attachments)</p>`
                : `<table><thead><tr><th>File name</th><th>MIME</th><th>Size (bytes)</th></tr></thead><tbody>
              ${r.attachmentMetadata
                .map(
                  (a) =>
                    `<tr><td>${esc(a.fileName ?? "")}</td><td>${esc(a.mimeType ?? "")}</td><td>${esc(
                      a.sizeBytes != null ? String(a.sizeBytes) : ""
                    )}</td></tr>`
                )
                .join("")}
              </tbody></table>`;
            return `<div class="result"><h4>Result (order item ${esc(r.orderItemId)})</h4>
          ${pAlways("Catalog type", r.catalogItemType)}
          ${r.criticalValue ? `<p class="critical">Critical value</p>` : ""}
          <div class="pre-text">${esc(r.resultText ?? "")}</div>
          ${pLine("Verified at", r.verifiedAt)}
          ${pLine("Entered by (display)", r.enteredByDisplayFr)}
          ${pLine("Acknowledged at", r.acknowledgedByProviderAt)}
          ${pLine("Acknowledged by", r.acknowledgedByDisplayFr)}
          <p><span class="lbl">Attachment count</span> ${esc(String(r.attachmentCount))}</p>
          ${pLine("Result data keys (no values)", r.resultDataKeys.join(", "))}
          ${attRows}
        </div>`;
          })
          .join("");

  function governanceStatusSymbol(status: string): string {
    if (status === "completed") return "✓";
    if (status === "overridden") return "⚠";
    if (status === "rejected") return "✗";
    if (status === "pending") return "…";
    return "·";
  }

  const marInner =
    manifest.medicationAdministrations.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<table><thead><tr><th>Time</th><th>Medication</th><th>Dose</th><th>Route</th><th>Action</th><th>By</th></tr></thead><tbody>
      ${manifest.medicationAdministrations
        .map(
          (m) =>
            `<tr><td>${esc(m.administeredAt)}</td><td>${esc(m.medicationLabelSnapshot ?? "")}</td><td>${esc(
              [m.doseValue, m.doseUnit].filter(Boolean).join(" ")
            )}</td><td>${esc(m.route ?? "")}</td><td>${esc(m.marAction ?? "")}</td><td>${esc(
              m.administeredByDisplayFr ?? ""
            )}</td></tr>`
        )
        .join("")}
      </tbody></table>
      ${manifest.medicationAdministrations
        .map((m) => ({
          id: m.id,
          note: sanitizeMarAdministrationVisibleNote(m.notes, locale),
        }))
        .filter((m) => m.note.trim())
        .map((m) => `<h4>MAR notes (${esc(m.id)})</h4><div class="pre-text">${esc(m.note)}</div>`)
        .join("")}`;

  const medicationGovernanceInner =
    manifest.medicationGovernanceSummaries.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : manifest.medicationGovernanceSummaries
          .map((s) => {
            const header = [s.medicationLabel, s.doseDisplay, s.route].filter(Boolean).join(" · ");
            const lines = s.lines
              .map(
                (l) =>
                  `<li>${esc(governanceStatusSymbol(l.status))} ${esc(l.labelFr)}</li>`
              )
              .join("");
            return `<div class="order"><p><strong>${esc(header || s.medicationAdministrationId)}</strong> <span class="muted">${esc(s.administeredAt)}</span></p><ul>${lines}</ul></div>`;
          })
          .join("");

  const medicationGovernanceTimelineInner =
    manifest.medicationGovernanceTimeline.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ol>${manifest.medicationGovernanceTimeline.items
          .map(
            (e) =>
              `<li><strong>${esc(e.documentedAtIso)}</strong> — ${esc(e.titleFr)} <span class="muted">[${esc(e.eventKind)}]</span></li>`
          )
          .join("")}</ol>`;

  const procInner =
    manifest.procedures.entries.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ol>${manifest.procedures.entries.map((entry) => renderProcedureExportEntry(entry, locale)).join("")}</ol>`;

  const ivInner =
    manifest.ivAccess.entries.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ol>${manifest.ivAccess.entries
          .map(
            (p) =>
              `<li><strong>${esc(p.createdAt)}</strong> — ${esc(p.eventType)} — ${esc(
                p.createdByDisplayFr ?? "—"
              )}${jsonPreBlock(p.payloadJson)}</li>`
          )
          .join("")}</ol>`;

  const clinInner =
    manifest.clinicalTimeline.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `${manifest.clinicalTimeline.capped ? `<p class="warn">Clinical timeline capped at ${manifest.caps.clinicalTimeline} most recent events.</p>` : ""}
      <ol>${manifest.clinicalTimeline.items
        .map(
          (p) =>
            `<li><strong>${esc(p.createdAt)}</strong> — ${esc(
              (p as { displayLabelFr?: string }).displayLabelFr ?? p.eventType
            )} — ${esc(p.createdByDisplayFr ?? "—")}${jsonPreBlock(p.payloadJson)}</li>`
        )
        .join("")}</ol>`;

  const unifiedInner =
    !manifest.unifiedTimeline || manifest.unifiedTimeline.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `${manifest.unifiedTimeline.capped ? `<p class="warn">${esc(htmlChrome.unifiedTimelineCapped(manifest.unifiedTimeline.items.length))}</p>` : ""}
      <ol>${manifest.unifiedTimeline.items
        .map((u) => {
          const chips =
            u.chips.length > 0
              ? ` <span class="muted">[${esc(u.chips.join(", "))}]</span>`
              : "";
          const corrected =
            u.hasClinicalTimeCorrection && u.effectiveClinicalAtIso
              ? `<div class="muted">${esc(htmlChrome.documentedAt)} ${esc(u.documentedAtIso)} · ${esc(htmlChrome.correctedClinicalTime)} ${esc(u.effectiveClinicalAtIso)}</div>`
              : "";
          return `<li><strong>${esc(u.documentedAtIso)}</strong> — [${esc(u.displayGroup)}] ${esc(
            u.titleFr ?? u.displayEventType
          )}${chips} — ${esc(u.actorDisplayName ?? "—")}${corrected}</li>`;
        })
        .join("")}</ol>`;

  const auditInner =
    manifest.auditTimelineSummary.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `${manifest.auditTimelineSummary.capped ? `<p class="warn">Audit timeline capped at ${manifest.caps.auditTimeline} entries.</p>` : ""}
      <ol>${manifest.auditTimelineSummary.items
        .map(
          (a) =>
            `<li><strong>${esc(a.createdAt)}</strong> — ${esc(a.shortLabelFr)} — ${esc(String(a.action))} — ${esc(
              a.userDisplayFr ?? "—"
            )}${a.detailFr ? `<div class="muted">${esc(a.detailFr)}</div>` : ""}</li>`
        )
        .join("")}</ol>`;

  const fuInner =
    manifest.followUps.items.length === 0
      ? `<p class="muted">${esc(NO_DATA)}</p>`
      : `<ul>${manifest.followUps.items
          .map(
            (f) =>
              `<li>${esc(f.dueDate)} — ${esc(f.status)} — ${esc(f.reason ?? "")}${f.notes ? ` — ${esc(f.notes)}` : ""}</li>`
          )
          .join("")}</ul>`;

  const deferredInner = `
    <p>The following domains are explicitly deferred (not included as full structured sections in this manifest):</p>
    <ul>
      ${manifest.deferredDomains
        .map((d) => `<li><strong>${esc(d.domain)}</strong> — ${esc(d.reason)}</li>`)
        .join("")}
    </ul>
  `;

  const metaFooter = `
    <footer class="footer">
      <p><span class="lbl">Manifest version</span> ${esc(manifest.manifestVersion)}</p>
      <p><span class="lbl">Generated at</span> ${esc(manifest.generatedAt)}</p>
      <p><span class="lbl">Live preview flag</span> ${esc(String(manifest.livePreview))}</p>
    </footer>
  `;

  const css = `
    body{font-family:Georgia,"Times New Roman",serif;margin:0;padding:20px;color:#111;background:#fff;font-size:13px;line-height:1.45;max-width:900px;}
    h1{font-size:20px;margin:0 0 12px 0;}
    h2{font-size:15px;margin:18px 0 8px 0;border-bottom:1px solid #000;padding-bottom:4px;}
    h3{font-size:13px;margin:12px 0 6px 0;}
    h4{font-size:12px;margin:10px 0 4px 0;}
    .banner{padding:10px 14px;margin:0 0 16px 0;border-radius:4px;font-size:12px;line-height:1.5;}
    .banner-live{border:1px solid #b45309;background:#fffbeb;color:#78350f;}
    .banner-closed{border:1px solid #334155;background:#f1f5f9;color:#0f172a;}
    .lbl{font-weight:600;color:#334155;}
    .muted{color:#64748b;font-style:italic;}
    .warn{color:#b45309;font-size:12px;}
    .critical{color:#b91c1c;font-weight:700;}
    .sec{margin-bottom:22px;}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top;}
    th{background:#f8fafc;}
    .json-block,.pre-text{white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;padding:10px;font-size:11px;margin:6px 0;}
    .structured-dl{margin:6px 0;font-size:12px;}
    .structured-dl dt{font-weight:600;color:#334155;margin-top:6px;}
    .structured-dl dd{margin:2px 0 0 12px;color:#0f172a;}
    .structured-list{margin:4px 0 4px 18px;}
    .note-block{border-left:3px solid #0f766e;padding-left:10px;margin:10px 0 14px;}
    .note-section{margin:8px 0;}
    .order{border:1px solid #e2e8f0;padding:10px;margin:10px 0;border-radius:6px;}
    .result{border-left:3px solid #94a3b8;padding-left:10px;margin:12px 0;}
    .footer{margin-top:28px;padding-top:12px;border-top:1px solid #cbd5e1;font-size:11px;color:#475569;}
  `;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${css}</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  ${bannerLive}
  ${bannerClosed}
  ${metaFooter}
  ${section("Facility", facilityBlock)}
  ${section("Patient", patientBlock)}
  ${section("Encounter", encounterBlock)}
  ${section("Triage", triageInner)}
  ${section("Vitals history", vitalsInner)}
  ${section("Diagnoses", dxInner)}
  ${section("Documentation history", docInner)}
  ${section("Orders", ordersInner)}
  ${section("Results", resultsInner)}
  ${section("Medication administrations (MAR)", marInner)}
  ${section("Medication governance summary", medicationGovernanceInner)}
  ${section("Medication governance timeline", medicationGovernanceTimelineInner)}
  ${section("Procedures", procInner)}
  ${section("IV access", ivInner)}
  ${section("Clinical timeline", clinInner)}
  ${section(htmlChrome.unifiedTimelineTitle, unifiedInner)}
  ${section("Audit timeline summary", auditInner)}
  ${section("Follow-ups", fuInner)}
  ${
    manifest.dentalClinicalBoard
      ? section(
          dentalChrome.dentalBoardTitle,
          manifest.dentalClinicalBoard.sections
            .map(
              (s) =>
                `<div class="note-section"><strong>${esc(s.label)}</strong><div class="pre-text">${esc(
                  s.text
                )}</div></div>`
            )
            .join("")
        )
      : ""
  }
  ${section("Deferred domains", deferredInner)}
</body>
</html>`;
}
