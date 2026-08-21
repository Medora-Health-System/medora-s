"use client";

import React from "react";
import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import {
  attachmentsFromResultDataAll,
  normalizeExamTitleFromLocale,
  parseLabObservationLines,
  parseRadiologySections,
  splitLabFallbackParagraphs,
  splitRadiologyNarrativeParagraphs,
  type LabParsedRow,
  type ResultAttachmentRow,
} from "@/lib/clinicalResultNormalize";
import { useI18n } from "@/lib/i18n";
import { MedicationAdministrationAdjustedBadge } from "@/components/encounters/MedicationAdministrationClockButton";
import { resolveLabRadMilestoneDisplay } from "@/features/orders/labRadiologyEffectiveTimeDisplay";
import {
  initialsFromDisplayName,
  parseClinicalStructuredResultData,
  resolveStructuredLabObservationDisplayFlag,
  type ClinicalImagingReportSections,
  type ClinicalLabObservation,
} from "@medora/shared";

export type { ResultAttachmentRow };

function fillTemplate(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function chartOrderItemLabel(status: string, t: (k: string) => string): string {
  const u = (status || "").toUpperCase();
  if (u === "COMPLETED" || u === "RESULTED" || u === "VERIFIED") {
    return t("printOutput.orderItemChart.terminalDone");
  }
  const key = `printOutput.orderItemChart.${u}`;
  const r = t(key);
  return r !== key ? r : status || t("common.dash");
}

function dataUrlForAttachment(a: ResultAttachmentRow): string | null {
  const b64 = a.dataBase64?.trim();
  if (!b64) return null;
  const mime = a.mimeType?.trim() || "application/octet-stream";
  return `data:${mime};base64,${b64}`;
}

function typeLabelForLocale(mime: string | null | undefined, fileName: string | null | undefined, t: (k: string) => string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf")) return t("clinicalResultViewer.typePdf");
  if (m.startsWith("image/")) return t("clinicalResultViewer.typeImage");
  if (m.includes("jpeg") || /\.jpe?g$/i.test(fileName || "")) return t("clinicalResultViewer.typeImage");
  if (m.includes("png")) return t("clinicalResultViewer.typeImage");
  return t("clinicalResultViewer.typeFile");
}

/** Texte clinique : paragraphes (double saut) + retours ligne simples, donnée brute inchangée. */
export function ClinicalInterpretationBlock({ text }: { text: string | null | undefined }) {
  const { t } = useI18n();
  const raw = (text ?? "").trim();
  if (!raw) {
    return (
      <span style={{ color: "#757575", fontStyle: "italic" }}>{t("clinicalResultViewer.emptyInterpretation")}</span>
    );
  }
  const blocks = raw.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.55, color: "#212121" }}>
      {blocks.map((block, bi) => (
        <p key={bi} style={{ margin: "0 0 10px 0", whiteSpace: "pre-wrap" }}>
          {block}
        </p>
      ))}
    </div>
  );
}

export function ResultAttachmentsList({ attachments }: { attachments: ResultAttachmentRow[] }) {
  const { t } = useI18n();
  if (!attachments.length) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e0e0e0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#37474f", marginBottom: 8 }}>
        {fillTemplate(t("clinicalResultViewer.attachmentsTitle"), { count: attachments.length })}
      </div>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
        {attachments.map((a, idx) => {
          const url = dataUrlForAttachment(a);
          const name = a.fileName?.trim() || fillTemplate(t("clinicalResultViewer.fileNumber"), { n: idx + 1 });
          const typ = typeLabelForLocale(a.mimeType, a.fileName, t);
          if (!url) {
            return (
              <li key={idx} style={{ fontSize: 13, marginBottom: 8, padding: 8, background: "#fff3e0", borderRadius: 4 }}>
                <strong>{name}</strong> — {typ}
                <div style={{ fontSize: 12, color: "#e65100", marginTop: 4 }}>{t("clinicalResultViewer.attachmentUnavailable")}</div>
              </li>
            );
          }
          return (
            <li
              key={idx}
              style={{
                fontSize: 13,
                marginBottom: 8,
                padding: "8px 10px",
                background: "#fafafa",
                borderRadius: 6,
                border: "1px solid #eee",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span style={{ color: "#757575", fontSize: 12 }}>{typ}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#1565c0", fontWeight: 600 }}>
                  {t("clinicalResultViewer.openDocument")}
                </a>
                <a href={url} download={name} style={{ color: "#1565c0", fontWeight: 600 }}>
                  {t("clinicalResultViewer.downloadFile")}
                </a>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type ClinicalResultViewerProps = {
  title: string;
  /** Statut ligne d’ordre (ORDER_ITEM) */
  itemStatus?: string | null;
  verifiedAt?: string | null;
  resultDocumentedAt?: string | null;
  resultClinicalAt?: string | null;
  resultEffectiveVersion?: number;
  criticalValue?: boolean | null;
  resultText?: string | null;
  /** Full Result.resultData — structured LAB/IMAGING preferred over text parse. */
  resultData?: unknown;
  attachments?: ResultAttachmentRow[] | null;
  /** Nom du professionnel ayant saisi / validé (API enrichie) */
  enteredByDisplayFr?: string | null;
  /** Clinicien ayant accusé réception du résultat (séparé de l'auteur). */
  acknowledgedByDisplayFr?: string | null;
  acknowledgedByProviderAt?: string | null;
  compact?: boolean;
  /** Mise en page labo (tableau) vs imagerie (sections rapport) */
  catalogItemType?: "LAB_TEST" | "IMAGING_STUDY";
  /** MEDUI.RES.2A — enterprise acknowledgement footer (viewing ≠ acknowledgement). */
  canAcknowledge?: boolean;
  acknowledgeBusy?: boolean;
  onAcknowledge?: () => void;
};

function StatusChips({
  criticalValue,
  itemStatus,
}: {
  criticalValue?: boolean | null;
  itemStatus?: string | null;
}) {
  const { t } = useI18n();
  const chips: { label: string; bg: string; color: string }[] = [];
  if (criticalValue) {
    chips.push({ label: t("clinicalResultViewer.chipCritical"), bg: "#ffebee", color: "#b71c1c" });
  } else if (itemStatus && isOrderItemDoneForChart(itemStatus)) {
    chips.push({ label: t("clinicalResultViewer.chipCompleted"), bg: "#e8f5e9", color: "#2e7d32" });
  } else if (itemStatus === "PENDING" || itemStatus === "PLACED") {
    chips.push({ label: t("clinicalResultViewer.chipPending"), bg: "#fff8e1", color: "#f57f17" });
  }
  if (!chips.length && itemStatus) {
    chips.push({ label: chartOrderItemLabel(itemStatus, t), bg: "#eceff1", color: "#37474f" });
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {chips.map((c, i) => (
        <span
          key={`${c.label}-${i}`}
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "4px 10px",
            borderRadius: 999,
            background: c.bg,
            color: c.color,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function labRowBackground(flag: LabParsedRow["flag"]): string {
  if (flag === "C") return "#ffebee";
  if (flag === "H" || flag === "HH") return "#fff8e1";
  if (flag === "L" || flag === "LL") return "#e3f2fd";
  return "transparent";
}

function labFlagBadge(flag: LabParsedRow["flag"], t: (k: string) => string): string | null {
  if (!flag) return null;
  if (flag === "C") return t("clinicalResultViewer.labFlagCritical");
  if (flag === "H" || flag === "HH") return "H";
  if (flag === "L" || flag === "LL") return "L";
  return null;
}

/** Retire le bloc conclusion du texte brut pour le repli paragraphes (évite doublon). */
function labRawWithoutConclusionBlock(full: string, conclusion: string): string {
  const c = conclusion.trim();
  if (!c) return full;
  const idx = full.lastIndexOf(c);
  if (idx < 0) return full;
  return full.slice(0, idx).replace(/\s+$/, "").trim();
}

function labRowsFromStructuredObservations(observations: ClinicalLabObservation[]): LabParsedRow[] {
  return observations
    .filter((o) => o.name.trim() && String(o.value ?? "").trim())
    .map((o) => ({
      label: o.name.trim(),
      value: String(o.value).trim(),
      ref: o.referenceText?.trim() || undefined,
      unit: o.unit?.trim() || undefined,
      flag: resolveStructuredLabObservationDisplayFlag(o),
    }));
}

function StructuredLabTable({
  rows,
  examTitle,
  verifiedAt,
  criticalValue,
}: {
  rows: LabParsedRow[];
  examTitle: string;
  verifiedAt?: string | null;
  criticalValue?: boolean | null;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  return (
    <div style={{ fontSize: 14, color: "#212121" }}>
      <div
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e3e8ef",
          fontSize: 13,
          color: "#37474f",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div>
            <span style={{ fontWeight: 700, color: "#546e7a" }}>{t("clinicalResultViewer.labDocTestName")}</span>
            <span style={{ marginLeft: 8 }}>{examTitle}</span>
          </div>
          {verifiedAt ? (
            <div>
              <span style={{ fontWeight: 700, color: "#546e7a" }}>{t("clinicalResultViewer.labDocDateTime")}</span>
              <span style={{ marginLeft: 8 }}>{new Date(verifiedAt).toLocaleString(dateLocale)}</span>
            </div>
          ) : null}
          {criticalValue ? (
            <div style={{ fontWeight: 700, color: "#b71c1c" }}>{t("clinicalResultViewer.labCriticalBanner")}</div>
          ) : null}
        </div>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #cfd8dc" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#eceff1" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#37474f", fontWeight: 700 }}>
                {t("clinicalResultViewer.labTableParam")}
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#37474f", fontWeight: 700 }}>
                {t("clinicalResultViewer.labTableResult")}
              </th>
              <th style={{ textAlign: "center", padding: "10px 8px", color: "#546e7a", fontWeight: 600, width: 72 }}>
                {t("clinicalResultViewer.labTableFlag")}
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#546e7a", fontWeight: 600 }}>
                {t("clinicalResultViewer.labTableRefRange")}
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "#546e7a", fontWeight: 600 }}>
                {t("clinicalResultViewer.labTableUnits")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const bg = labRowBackground(r.flag);
              const badge = labFlagBadge(r.flag, t);
              return (
                <tr key={i} style={{ borderTop: "1px solid #eceff1", background: bg }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#263238", verticalAlign: "top" }}>{r.label}</td>
                  <td style={{ padding: "9px 12px", whiteSpace: "pre-wrap", verticalAlign: "top" }}>{r.value}</td>
                  <td style={{ padding: "9px 8px", textAlign: "center", verticalAlign: "top", fontSize: 11, fontWeight: 700 }}>
                    {badge ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: r.flag === "C" ? "#ffcdd2" : "#ffe0b2",
                          color: r.flag === "C" ? "#b71c1c" : "#e65100",
                        }}
                      >
                        {badge}
                      </span>
                    ) : (
                      t("common.dash")
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: "#607d8b", verticalAlign: "top" }}>
                    {r.ref?.trim() ? r.ref : t("common.dash")}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: "#607d8b", verticalAlign: "top" }}>
                    {r.unit?.trim() ? r.unit : t("common.dash")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StructuredImagingReportBody({
  report,
  examTitle,
  verifiedAt,
}: {
  report: ClinicalImagingReportSections;
  examTitle: string;
  verifiedAt?: string | null;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const sections: { key: keyof ClinicalImagingReportSections; labelKey: string; emphasize?: boolean }[] = [
    { key: "indication", labelKey: "structuredDiagnosticResult.indication" },
    { key: "technique", labelKey: "structuredDiagnosticResult.technique" },
    { key: "comparison", labelKey: "structuredDiagnosticResult.comparison" },
    { key: "findings", labelKey: "structuredDiagnosticResult.findings" },
    { key: "impression", labelKey: "structuredDiagnosticResult.impression", emphasize: true },
    { key: "recommendation", labelKey: "structuredDiagnosticResult.recommendation" },
  ];

  return (
    <div style={{ fontSize: 14, color: "#212121" }}>
      <div
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e0f2f1",
          fontSize: 13,
          color: "#37474f",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div>
            <span style={{ fontWeight: 700, color: "#006064" }}>{t("clinicalResultViewer.imagingExam")}</span>
            <span style={{ marginLeft: 8 }}>{examTitle}</span>
          </div>
          {verifiedAt ? (
            <div>
              <span style={{ fontWeight: 700, color: "#006064" }}>{t("clinicalResultViewer.labDocDateTime")}</span>
              <span style={{ marginLeft: 8 }}>{new Date(verifiedAt).toLocaleString(dateLocale)}</span>
            </div>
          ) : null}
        </div>
      </div>
      {sections.map((s) => {
        const text = report[s.key]?.trim();
        if (!text) return null;
        return (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: s.emphasize ? "#00695c" : "#546e7a",
                marginBottom: 6,
                borderBottom: s.emphasize ? "2px solid #80cbc4" : undefined,
                paddingBottom: s.emphasize ? 4 : undefined,
              }}
            >
              {t(s.labelKey)}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontWeight: s.emphasize ? 600 : 400 }}>{text}</div>
          </div>
        );
      })}
    </div>
  );
}

function StructuredResultBody({
  catalogItemType,
  resultText,
  resultData,
  examTitle,
  verifiedAt,
  criticalValue,
}: {
  catalogItemType?: "LAB_TEST" | "IMAGING_STUDY";
  resultText: string | null | undefined;
  resultData?: unknown;
  examTitle: string;
  verifiedAt?: string | null;
  criticalValue?: boolean | null;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const structured = parseClinicalStructuredResultData(resultData);

  /** Priority 1 — durable structured Result.resultData */
  if (structured?.resultType === "LAB" && (catalogItemType === "LAB_TEST" || !catalogItemType)) {
    const rows = labRowsFromStructuredObservations(structured.observations);
    if (rows.length > 0) {
      return (
        <div>
          <StructuredLabTable
            rows={rows}
            examTitle={examTitle}
            verifiedAt={verifiedAt}
            criticalValue={criticalValue}
          />
          {structured.comments?.trim() ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6a1b9a", marginBottom: 6 }}>
                {t("clinicalResultViewer.conclusionHeading")}
              </div>
              <div style={{ whiteSpace: "pre-wrap", padding: 12, background: "#f3e5f5", borderRadius: 8, fontSize: 13 }}>
                {structured.comments}
              </div>
            </div>
          ) : null}
        </div>
      );
    }
  }
  if (structured?.resultType === "IMAGING" && (catalogItemType === "IMAGING_STUDY" || !catalogItemType)) {
    return <StructuredImagingReportBody report={structured.report} examTitle={examTitle} verifiedAt={verifiedAt} />;
  }

  const raw = (resultText ?? "").trim();
  if (!raw) {
    return (
      <span style={{ color: "#757575", fontStyle: "italic" }}>{t("clinicalResultViewer.emptyInterpretation")}</span>
    );
  }

  if (catalogItemType === "LAB_TEST") {
    const { rows, preamble, conclusion, sectionNotes } = parseLabObservationLines(raw);
    const introBlock = [sectionNotes.length ? sectionNotes.map((n) => `• ${n}`).join("\n") : "", preamble].filter(Boolean).join("\n\n");

    const fallbackSource =
      introBlock.trim() || labRawWithoutConclusionBlock(raw, conclusion);

    const fallbackParas = splitLabFallbackParagraphs(fallbackSource);

    const tableBlock =
      rows.length > 0 ? (
        <StructuredLabTable rows={rows} examTitle={examTitle} verifiedAt={verifiedAt} criticalValue={criticalValue} />
      ) : null;

    const fallbackBlock =
      rows.length === 0 && fallbackParas.length > 0 ? (
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "#263238" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1565c0", marginBottom: 8 }}>{t("clinicalResultViewer.resultsStructured")}</div>
          {fallbackParas.map((para, i) => (
            <p key={i} style={{ margin: "0 0 10px 0", whiteSpace: "pre-wrap" }}>
              {para}
            </p>
          ))}
        </div>
      ) : rows.length > 0 && introBlock ? (
        <div style={{ marginBottom: 12, whiteSpace: "pre-wrap", color: "#455a64", fontSize: 13, lineHeight: 1.55 }}>{introBlock}</div>
      ) : null;

    const conclusionBlock = conclusion ? (
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6a1b9a", marginBottom: 6 }}>{t("clinicalResultViewer.conclusionHeading")}</div>
        <div style={{ whiteSpace: "pre-wrap", padding: 12, background: "#f3e5f5", borderRadius: 8, fontSize: 13, lineHeight: 1.55 }}>
          {conclusion}
        </div>
      </div>
    ) : null;

    if (rows.length === 0 && fallbackParas.length === 0 && !conclusion) {
      return <ClinicalInterpretationBlock text={raw} />;
    }

    return (
      <div style={{ fontSize: 14, color: "#212121" }}>
        {fallbackBlock}
        {tableBlock}
        {conclusionBlock}
      </div>
    );
  }

  if (catalogItemType === "IMAGING_STUDY") {
    const { sections, remainder } = parseRadiologySections(raw, language);
    const rem = remainder.trim();
    const hasSections = sections.length > 0;

    const imagingDocHeader = (
      <div
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e0f2f1",
          fontSize: 13,
          color: "#37474f",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div>
            <span style={{ fontWeight: 700, color: "#006064" }}>{t("clinicalResultViewer.imagingExam")}</span>
            <span style={{ marginLeft: 8 }}>{examTitle}</span>
          </div>
          {verifiedAt ? (
            <div>
              <span style={{ fontWeight: 700, color: "#006064" }}>{t("clinicalResultViewer.labDocDateTime")}</span>
              <span style={{ marginLeft: 8 }}>{new Date(verifiedAt).toLocaleString(dateLocale)}</span>
            </div>
          ) : null}
        </div>
      </div>
    );

    const sectionBlock = (heading: string, body: string, key: number) => (
      <div key={key} style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#006064",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 8,
            borderBottom: "1px solid #b2ebf2",
            paddingBottom: 4,
          }}
        >
          {heading}
        </div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            padding: "12px 14px",
            background: "#fafcfd",
            borderRadius: 8,
            border: "1px solid #e0f2f1",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {body}
        </div>
      </div>
    );

    if (hasSections) {
      return (
        <div style={{ fontSize: 14, color: "#212121", lineHeight: 1.55 }}>
          {imagingDocHeader}
          {sections.map((s, i) => sectionBlock(s.heading, s.body, i))}
          {rem ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#37474f", marginBottom: 8 }}>{t("clinicalResultViewer.complement")}</div>
              {splitRadiologyNarrativeParagraphs(rem).map((p, i) => (
                <p key={i} style={{ margin: "0 0 10px 0", whiteSpace: "pre-wrap", padding: "0 4px" }}>
                  {p}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    const narrative = rem || raw;
    const paras = splitRadiologyNarrativeParagraphs(narrative);
    return (
      <div style={{ fontSize: 14, color: "#212121", lineHeight: 1.6 }}>
        {imagingDocHeader}
        {paras.map((p, i) => (
          <p key={i} style={{ margin: "0 0 12px 0", whiteSpace: "pre-wrap" }}>
            {p}
          </p>
        ))}
      </div>
    );
  }

  return <ClinicalInterpretationBlock text={raw} />;
}

/**
 * Bloc résultat labo / imagerie lisible (consultation + dossier patient).
 */
function ResultTimestampBlock({
  documentedAt,
  clinicalAt,
  effectiveVersion,
  compact,
}: {
  documentedAt?: string | null;
  clinicalAt?: string | null;
  effectiveVersion?: number;
  compact?: boolean;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const display = resolveLabRadMilestoneDisplay({
    documentedAt: documentedAt ?? clinicalAt,
    effectiveAt: clinicalAt,
    version: effectiveVersion ?? 0,
  });
  if (!display.documentedIso) return null;
  const formatWhen = (iso: string) => new Date(iso).toLocaleString(dateLocale);
  return (
    <div style={{ fontSize: 12, color: "#455a64", marginTop: compact ? 4 : 8, lineHeight: 1.5 }}>
      {display.showDualLabels ? (
        <>
          <div>
            <span style={{ fontWeight: 600 }}>{t("labRadTime.historyClinicalLabel")}:</span>{" "}
            {formatWhen(display.clinicalIso!)}
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>{t("labRadTime.historyDocumentedLabel")}:</span>{" "}
            {formatWhen(display.documentedIso)}
          </div>
        </>
      ) : (
        <div>
          <span style={{ fontWeight: 600 }}>{t("labRadTime.historyDocumentedLabel")}:</span>{" "}
          {formatWhen(display.clinicalIso!)}
        </div>
      )}
      {display.showAdjustedBadge ? (
        <span style={{ marginLeft: 6 }}>
          <MedicationAdministrationAdjustedBadge
            label={t("labRadTime.adjustedBadge")}
            title={t("labRadTime.adjustedBadgeTooltip")}
          />
        </span>
      ) : null}
    </div>
  );
}

export function ClinicalResultViewer({
  title,
  itemStatus,
  verifiedAt,
  resultDocumentedAt,
  resultClinicalAt,
  resultEffectiveVersion,
  criticalValue,
  resultText,
  resultData,
  attachments,
  enteredByDisplayFr,
  acknowledgedByDisplayFr,
  acknowledgedByProviderAt,
  compact,
  catalogItemType,
  canAcknowledge,
  acknowledgeBusy,
  onAcknowledge,
}: ClinicalResultViewerProps) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const pad = compact ? 12 : 16;
  const displayTitle = normalizeExamTitleFromLocale(title, language);
  const statusLabel = itemStatus ? chartOrderItemLabel(itemStatus, t) : null;
  const borderAccent =
    catalogItemType === "IMAGING_STUDY" ? "#00838f" : catalogItemType === "LAB_TEST" ? "#1565c0" : "#1565c0";

  const whenTs = (iso: string) => fillTemplate(t("clinicalResultViewer.onDateTime"), { datetime: new Date(iso).toLocaleString(dateLocale) });
  const ackInitials = initialsFromDisplayName(acknowledgedByDisplayFr);
  const ackAtLabel = acknowledgedByProviderAt
    ? new Date(acknowledgedByProviderAt).toLocaleString(dateLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      style={{
        marginBottom: compact ? 12 : 16,
        padding: pad,
        background: "#fff",
        border: "1px solid #e3e8ef",
        borderRadius: 12,
        borderLeft: `5px solid ${borderAccent}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: compact ? 15 : 16, fontWeight: 700, color: "#0d47a1", letterSpacing: "-0.01em" }}>
        {displayTitle}
      </div>
      <StatusChips criticalValue={criticalValue} itemStatus={itemStatus ?? null} />
      {statusLabel ? (
        <div style={{ fontSize: 12, color: "#455a64", marginTop: 8 }}>
          <strong>{t("clinicalResultViewer.orderStatusLinePrefix")}</strong> {statusLabel}
        </div>
      ) : null}
      {enteredByDisplayFr?.trim() ? (
        <div style={{ fontSize: 12, color: "#37474f", marginTop: 6 }}>
          <strong>
            {catalogItemType === "LAB_TEST" || catalogItemType === "IMAGING_STUDY"
              ? t("clinicalResultViewer.resultedBy")
              : t("clinicalResultViewer.validatedBy")}
          </strong>{" "}
          {enteredByDisplayFr.trim()}
          {verifiedAt ? <> {whenTs(verifiedAt)}</> : null}
        </div>
      ) : verifiedAt ? (
        <div style={{ fontSize: 12, color: "#616161", marginTop: 6 }}>
          {fillTemplate(t("clinicalResultViewer.enteredVerifiedOn"), { datetime: new Date(verifiedAt).toLocaleString(dateLocale) })}
        </div>
      ) : null}
      {(resultDocumentedAt || resultClinicalAt) &&
      (catalogItemType === "LAB_TEST" || catalogItemType === "IMAGING_STUDY") ? (
        <ResultTimestampBlock
          documentedAt={resultDocumentedAt ?? verifiedAt}
          clinicalAt={resultClinicalAt ?? verifiedAt}
          effectiveVersion={resultEffectiveVersion}
          compact={compact}
        />
      ) : null}
      {criticalValue && catalogItemType !== "LAB_TEST" ? (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#c62828" }}>{t("clinicalResultViewer.imagingCriticalBanner")}</div>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#546e7a",
            marginBottom: 8,
          }}
        >
          {catalogItemType === "IMAGING_STUDY"
            ? t("clinicalResultViewer.mainSectionReport")
            : catalogItemType === "LAB_TEST"
              ? t("clinicalResultViewer.mainSectionResults")
              : t("clinicalResultViewer.mainSectionInterpretation")}
        </div>
        <div style={{ padding: compact ? 10 : 14, background: "#f7fafc", borderRadius: 10, border: "1px solid #e8eef3" }}>
          <StructuredResultBody
            catalogItemType={catalogItemType}
            resultText={resultText}
            resultData={resultData}
            examTitle={displayTitle}
            verifiedAt={verifiedAt}
            criticalValue={criticalValue}
          />
        </div>
      </div>
      <ResultAttachmentsList attachments={attachments ?? []} />
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        {acknowledgedByProviderAt ? (
          <div style={{ fontSize: 13, color: "#15803d", fontWeight: 600, lineHeight: 1.4 }}>
            {fillTemplate(t("clinicalResultViewer.ackFooterAcknowledged"), {
              initials: ackInitials,
              datetime: ackAtLabel ?? "",
            })}
            {acknowledgedByDisplayFr?.trim() ? (
              <div style={{ fontSize: 11, fontWeight: 500, color: "#475569", marginTop: 2 }}>
                {acknowledgedByDisplayFr.trim()}
              </div>
            ) : null}
          </div>
        ) : canAcknowledge && onAcknowledge ? (
          <button
            type="button"
            onClick={() => onAcknowledge()}
            disabled={acknowledgeBusy}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: acknowledgeBusy ? "#f1f5f9" : "#fff",
              color: "#0f172a",
              cursor: acknowledgeBusy ? "default" : "pointer",
              marginLeft: "auto",
            }}
          >
            {acknowledgeBusy
              ? t("clinicalResultViewer.ackFooterBusy")
              : t("clinicalResultViewer.ackFooterButton")}
          </button>
        ) : (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{t("clinicalResultViewer.ackFooterViewingOnly")}</div>
        )}
      </div>
    </div>
  );
}

/** Compat : uniquement les PJ avec données (comptage présence résultat). */
export function attachmentsFromResultData(resultData: unknown): ResultAttachmentRow[] {
  return attachmentsFromResultDataAll(resultData).filter((x) => x.dataBase64 && String(x.dataBase64).length > 0);
}
