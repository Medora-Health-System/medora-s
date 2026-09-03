/**
 * Print-safe HTML for laboratory and imaging encounter results (ED Results).
 */

import { resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
import type { EncounterLabRadRow } from "@/components/encounters/EncounterResultsTab";
import { nirMrnDisplay } from "@/components/patient-chart/patientChartHelpers";
import { calculateAge } from "@/lib/patientDisplay";
import {
  clinicalResultFromOrderItemLike,
  parseLabObservationLines,
  parseRadiologySections,
  splitLabFallbackParagraphs,
  splitRadiologyNarrativeParagraphs,
  type LabParsedRow,
} from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { printDateLocale, printPatientSexLabel, printT } from "@/lib/printI18n";
import {
  buildPrintDocumentFooterHtml,
  buildPrintFacilityHeaderHtml,
  resolvePrintFacilityInfo,
  type PrintFacilityInfo,
} from "@/lib/printFacilityHeader";
import { resolveOrderOrderedByFields } from "@/features/emergency/encounterClinicalRecordAdapter";

export type ResultPrintPatient = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

export type ResultPrintEncounter = {
  id: string;
  createdAt: string;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

export type ResultPrintContext = {
  patient?: ResultPrintPatient | null;
  encounter: ResultPrintEncounter;
  facility?: PrintFacilityInfo | null;
  facilityName?: string | null;
  language: SupportedLanguage;
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtIso(iso: string | null | undefined, loc: string): string {
  if (!iso?.trim()) return "";
  try {
    return new Date(iso).toLocaleString(loc);
  } catch {
    return "";
  }
}

function line(label: string, value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  return `<p style="margin:4px 0;line-height:1.45;font-size:13px;"><strong>${esc(label)}</strong> ${esc(v)}</p>`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveOrderingProvider(order: unknown, encounter: ResultPrintEncounter): string | null {
  if (order && typeof order === "object") {
    const { orderedByDisplayName } = resolveOrderOrderedByFields(order as Record<string, unknown>);
    if (orderedByDisplayName) return orderedByDisplayName;
  }
  const p = encounter.physicianAssigned;
  if (p?.firstName || p?.lastName) {
    return [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || null;
  }
  return null;
}

function readSpecimenFromResultData(resultData: unknown): string | null {
  const data = asRecord(resultData);
  if (!data) return null;
  return (
    readStr(data.specimen) ??
    readStr(data.specimenType) ??
    readStr(data.specimenDescription) ??
    null
  );
}

function readCollectedAt(result: Record<string, unknown> | null): string | null {
  if (!result) return null;
  const data = asRecord(result.resultData);
  return (
    readStr(result.effectiveResultedAt) ??
    readStr(data?.collectedAt) ??
    readStr(data?.collectionTime) ??
    null
  );
}

export function filterLabResultRows(rows: EncounterLabRadRow[]): EncounterLabRadRow[] {
  return rows.filter((row) => row.item?.catalogItemType === "LAB_TEST");
}

export function filterImagingResultRows(rows: EncounterLabRadRow[]): EncounterLabRadRow[] {
  return rows.filter((row) => row.item?.catalogItemType === "IMAGING_STUDY");
}

function normalizeRowForPrint(
  row: EncounterLabRadRow,
  language: SupportedLanguage,
  t: (key: string) => string
) {
  const displayLabel = getOrderItemDisplayLabelForLanguage(row.item, language, t);
  const clinical = clinicalResultFromOrderItemLike({
    displayLabel,
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
    emptyTitleFallback: t("printOutput.results.fallbackStudyLabel"),
  });
  const result = asRecord(row.item.result);
  return {
    row,
    clinical,
    displayLabel,
    orderingProvider: resolveOrderingProvider(row.order, { id: "", createdAt: "", physicianAssigned: null }),
    specimen: readSpecimenFromResultData(result?.resultData),
    collectedAt: readCollectedAt(result),
    notes: readStr(result?.notes),
  };
}

function labFlagLabel(flag: LabParsedRow["flag"], language: SupportedLanguage): string {
  if (!flag) return "";
  if (flag === "C") return printT(language, "printOutput.results.critical");
  if (flag === "H" || flag === "HH" || flag === "L" || flag === "LL") {
    return printT(language, "printOutput.results.abnormal");
  }
  return flag;
}

function buildPatientHeaderHtml(ctx: ResultPrintContext, loc: string): string {
  const patient = ctx.patient;
  const name =
    [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim() ||
    printT(ctx.language, "common.dash");
  const ids = patient
    ? nirMrnDisplay({
        nationalId: patient.nationalId,
        mrn: patient.mrn,
        globalMrn: patient.globalMrn ?? null,
      })
    : "";
  const ageYears =
    patient?.dob && !Number.isNaN(new Date(patient.dob).getTime()) ? calculateAge(patient.dob) : null;
  const age =
    ageYears != null
      ? `${ageYears} ${printT(ctx.language, "printOutput.common.yearsSuffix")}`
      : printT(ctx.language, "common.dash");
  const dobDisplay = patient?.dob
    ? (() => {
        try {
          return new Date(patient.dob).toLocaleDateString(loc);
        } catch {
          return patient.dob;
        }
      })()
    : printT(ctx.language, "common.dash");
  const sex = printPatientSexLabel(ctx.language, patient?.sex ?? null, patient?.sexAtBirth ?? null);
  const encounterDate = fmtIso(ctx.encounter.createdAt, loc) || printT(ctx.language, "common.dash");
  const orderingProvider =
    resolveOrderingProvider(null, ctx.encounter) ?? printT(ctx.language, "common.dash");

  return [
    line(printT(ctx.language, "printOutput.results.patientName"), name),
    line(printT(ctx.language, "printOutput.results.mrn"), ids || printT(ctx.language, "common.dash")),
    line(
      printT(ctx.language, "printOutput.results.dobAgeSex"),
      `${dobDisplay} · ${age} · ${sex}`
    ),
    line(printT(ctx.language, "printOutput.results.encounterDate"), encounterDate),
    line(printT(ctx.language, "printOutput.results.encounterId"), ctx.encounter.id),
    line(printT(ctx.language, "printOutput.results.orderingProvider"), orderingProvider),
  ]
    .filter(Boolean)
    .join("");
}

function buildLabResultBodyHtml(
  row: EncounterLabRadRow,
  encounter: ResultPrintEncounter,
  language: SupportedLanguage,
  loc: string,
  t: (key: string) => string
): string {
  const normalized = normalizeRowForPrint(row, language, t);
  const { clinical, displayLabel } = normalized;
  const orderingProvider = resolveOrderingProvider(row.order, encounter);
  const result = asRecord(row.item.result);
  const collectedAt = readCollectedAt(result);
  const resultedAt = clinical.resultClinicalAt ?? clinical.verifiedAt;
  const raw = (clinical.resultText ?? "").trim();

  const parts: string[] = [];
  parts.push(
    `<h2 style="font-size:15px;margin:20px 0 10px 0;font-weight:700;border-bottom:1px solid #000;padding-bottom:4px;">${esc(
      displayLabel || t("printOutput.results.laboratoryResult")
    )}</h2>`
  );

  if (clinical.criticalValue) {
    parts.push(
      `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#b91c1c;">${esc(
        printT(language, "printOutput.results.critical")
      )}</p>`
    );
  }

  parts.push(line(printT(language, "printOutput.results.orderedBy"), orderingProvider));
  if (collectedAt) {
    parts.push(
      line(
        printT(language, "printOutput.results.collected"),
        fmtIso(collectedAt, loc)
      )
    );
  }
  if (resultedAt) {
    parts.push(line(printT(language, "printOutput.results.resulted"), fmtIso(resultedAt, loc)));
  }
  if (clinical.enteredByDisplayFr) {
    parts.push(line(printT(language, "printOutput.results.resultedBy"), clinical.enteredByDisplayFr));
  }
  if (clinical.acknowledgedByDisplayFr) {
    parts.push(line(printT(language, "printOutput.results.reviewedBy"), clinical.acknowledgedByDisplayFr));
  }
  if (normalized.specimen) {
    parts.push(line(printT(language, "printOutput.results.specimen"), normalized.specimen));
  }
  if (normalized.notes) {
    parts.push(line(printT(language, "printOutput.results.comments"), normalized.notes));
  }

  const { rows: labRows, preamble, conclusion, sectionNotes } = parseLabObservationLines(raw);
  const intro = [sectionNotes.join("\n"), preamble].filter(Boolean).join("\n\n");
  if (intro.trim()) {
    parts.push(`<p style="margin:8px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(intro)}</p>`);
  }

  if (labRows.length > 0) {
    const header = [
      `<th style="text-align:left;padding:8px 10px;border:1px solid #cbd5e1;">${esc(
        printT(language, "printOutput.results.testName")
      )}</th>`,
      `<th style="text-align:left;padding:8px 10px;border:1px solid #cbd5e1;">${esc(
        printT(language, "printOutput.results.resultValue")
      )}</th>`,
      `<th style="text-align:left;padding:8px 10px;border:1px solid #cbd5e1;">${esc(
        printT(language, "printOutput.results.referenceRange")
      )}</th>`,
      `<th style="text-align:left;padding:8px 10px;border:1px solid #cbd5e1;">${esc(
        printT(language, "printOutput.results.flag")
      )}</th>`,
    ].join("");
    const body = labRows
      .map((r) => {
        const flag = labFlagLabel(r.flag, language);
        return `<tr>
<td style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">${esc(r.label)}</td>
<td style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">${esc(r.value)}</td>
<td style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">${esc(r.ref ?? "")}</td>
<td style="padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;">${esc(flag)}</td>
</tr>`;
      })
      .join("");
    parts.push(
      `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:10px 0 16px 0;">` +
        `<thead><tr style="background:#f8fafc;">${header}</tr></thead><tbody>${body}</tbody></table>`
    );
  } else if (raw) {
    const paras = splitLabFallbackParagraphs(raw);
    parts.push(
      paras
        .map(
          (p) =>
            `<p style="margin:8px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(p)}</p>`
        )
        .join("")
    );
  }

  if (conclusion.trim()) {
    parts.push(
      `<p style="margin:12px 0 4px 0;font-size:12px;font-weight:700;color:#334155;">${esc(
        printT(language, "printOutput.results.comments")
      )}</p>`,
      `<p style="margin:0 0 12px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(conclusion)}</p>`
    );
  }

  return parts.join("");
}

function buildImagingResultBodyHtml(
  row: EncounterLabRadRow,
  encounter: ResultPrintEncounter,
  language: SupportedLanguage,
  loc: string,
  t: (key: string) => string
): string {
  const normalized = normalizeRowForPrint(row, language, t);
  const { clinical, displayLabel } = normalized;
  const orderingProvider = resolveOrderingProvider(row.order, encounter);
  const resultedAt = clinical.resultClinicalAt ?? clinical.verifiedAt;
  const raw = (clinical.resultText ?? "").trim();

  const parts: string[] = [];
  parts.push(
    `<h2 style="font-size:15px;margin:20px 0 10px 0;font-weight:700;border-bottom:1px solid #000;padding-bottom:4px;">${esc(
      displayLabel || t("printOutput.results.imagingResult")
    )}</h2>`
  );

  if (clinical.criticalValue) {
    parts.push(
      `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#b91c1c;">${esc(
        printT(language, "printOutput.results.critical")
      )}</p>`
    );
  }

  parts.push(line(printT(language, "printOutput.results.orderedBy"), orderingProvider));
  if (resultedAt) {
    parts.push(line(printT(language, "printOutput.results.resulted"), fmtIso(resultedAt, loc)));
  }
  if (clinical.enteredByDisplayFr) {
    parts.push(line(printT(language, "printOutput.results.resultedBy"), clinical.enteredByDisplayFr));
  }
  if (clinical.acknowledgedByDisplayFr) {
    parts.push(line(printT(language, "printOutput.results.reviewedBy"), clinical.acknowledgedByDisplayFr));
  }

  const { sections, remainder } = parseRadiologySections(raw, language);
  if (sections.length > 0) {
    for (const sec of sections) {
      const heading = sec.heading.toLowerCase();
      const isImpression = /impression|conclusion/i.test(heading);
      const isFindings = /finding|constat|résultat|result/i.test(heading);
      const label = isImpression
        ? printT(language, "printOutput.results.impression")
        : isFindings
          ? printT(language, "printOutput.results.findings")
          : sec.heading;
      parts.push(
        `<p style="margin:12px 0 4px 0;font-size:12px;font-weight:700;color:#334155;">${esc(label)}</p>`,
        `<p style="margin:0 0 12px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(sec.body)}</p>`
      );
    }
    if (remainder.trim()) {
      parts.push(
        `<p style="margin:0 0 12px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(remainder)}</p>`
      );
    }
  } else if (raw) {
    splitRadiologyNarrativeParagraphs(raw)
      .map(
        (p) =>
          `<p style="margin:8px 0;font-size:13px;line-height:1.45;white-space:pre-wrap;">${esc(p)}</p>`
      )
      .forEach((html) => parts.push(html));
  }

  return parts.join("");
}

function wrapResultPrintHtml(params: {
  ctx: ResultPrintContext;
  documentTitle: string;
  body: string;
}): string {
  const { ctx, documentTitle, body } = params;
  const loc = printDateLocale(ctx.language);
  const facilityInfo = resolvePrintFacilityInfo(ctx.facility, ctx.facilityName);
  const printDate = new Date().toLocaleString(loc);
  const facilityHeader = buildPrintFacilityHeaderHtml(facilityInfo, esc);
  const patientHeader = buildPatientHeaderHtml(ctx, loc);
  const footer = buildPrintDocumentFooterHtml(ctx.language, printDate, esc, printT);
  const htmlLang = resolveProductUiLanguageOrDefault(ctx.language);

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8">
  <title>${esc(documentTitle)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #000; background: #fff; margin: 0; padding: 24px; font-size: 14px; }
    @media print { body { padding: 16px; } @page { margin: 16mm 12mm; } }
  </style>
</head>
<body>
${facilityHeader}
<h1 style="font-size:18px;margin:0 0 16px 0;font-weight:700;text-align:center;">${esc(documentTitle)}</h1>
<div style="margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
${patientHeader}
</div>
${body}
${footer}
</body>
</html>`;
}

export function getLabResultsPrintHtml(ctx: ResultPrintContext, rows: EncounterLabRadRow[]): string {
  const labRows = filterLabResultRows(rows);
  const t = (key: string) => {
    const v = printT(ctx.language, key);
    return v === key ? key : v;
  };
  const loc = printDateLocale(ctx.language);
  const body = labRows.map((row) => buildLabResultBodyHtml(row, ctx.encounter, ctx.language, loc, t)).join("");
  const title = printT(ctx.language, "printOutput.results.laboratoryResultsReport");
  return wrapResultPrintHtml({ ctx, documentTitle: title, body });
}

export function getImagingResultsPrintHtml(ctx: ResultPrintContext, rows: EncounterLabRadRow[]): string {
  const imagingRows = filterImagingResultRows(rows);
  const t = (key: string) => {
    const v = printT(ctx.language, key);
    return v === key ? key : v;
  };
  const loc = printDateLocale(ctx.language);
  const body = imagingRows
    .map((row) => buildImagingResultBodyHtml(row, ctx.encounter, ctx.language, loc, t))
    .join("");
  const title = printT(ctx.language, "printOutput.results.imagingResultsReport");
  return wrapResultPrintHtml({ ctx, documentTitle: title, body });
}

export function getSingleLabResultPrintHtml(ctx: ResultPrintContext, row: EncounterLabRadRow): string {
  const t = (key: string) => {
    const v = printT(ctx.language, key);
    return v === key ? key : v;
  };
  const loc = printDateLocale(ctx.language);
  const body = buildLabResultBodyHtml(row, ctx.encounter, ctx.language, loc, t);
  const title = printT(ctx.language, "printOutput.results.laboratoryResult");
  return wrapResultPrintHtml({ ctx, documentTitle: title, body });
}

export function getSingleImagingResultPrintHtml(ctx: ResultPrintContext, row: EncounterLabRadRow): string {
  const t = (key: string) => {
    const v = printT(ctx.language, key);
    return v === key ? key : v;
  };
  const loc = printDateLocale(ctx.language);
  const body = buildImagingResultBodyHtml(row, ctx.encounter, ctx.language, loc, t);
  const title = printT(ctx.language, "printOutput.results.imagingResult");
  return wrapResultPrintHtml({ ctx, documentTitle: title, body });
}

export function getSingleResultPrintHtml(ctx: ResultPrintContext, row: EncounterLabRadRow): string {
  if (row.item?.catalogItemType === "IMAGING_STUDY") {
    return getSingleImagingResultPrintHtml(ctx, row);
  }
  return getSingleLabResultPrintHtml(ctx, row);
}

function openPrintWindow(html: string, language: SupportedLanguage): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert(printT(language, "printOutput.common.popupBlocked"));
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}

export function printLabResults(ctx: ResultPrintContext, rows: EncounterLabRadRow[]): void {
  if (filterLabResultRows(rows).length === 0) {
    alert(printT(ctx.language, "printOutput.results.noLabResultsToPrint"));
    return;
  }
  openPrintWindow(getLabResultsPrintHtml(ctx, rows), ctx.language);
}

export function printImagingResults(ctx: ResultPrintContext, rows: EncounterLabRadRow[]): void {
  if (filterImagingResultRows(rows).length === 0) {
    alert(printT(ctx.language, "printOutput.results.noImagingResultsToPrint"));
    return;
  }
  openPrintWindow(getImagingResultsPrintHtml(ctx, rows), ctx.language);
}

export function printSingleResult(ctx: ResultPrintContext, row: EncounterLabRadRow): void {
  openPrintWindow(getSingleResultPrintHtml(ctx, row), ctx.language);
}
