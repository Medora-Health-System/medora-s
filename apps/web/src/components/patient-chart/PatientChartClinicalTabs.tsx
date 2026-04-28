"use client";

import React from "react";
import Link from "next/link";
import type { ChartSummary, ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { SupportedLanguage } from "@/i18n/config";
import {
  formatEncounterChromeDateTime,
  tEncounterType,
  tMedicationFulfillmentIntent,
  tOrderItemStatusForWorklist,
} from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { nursingAssessmentDisplayLines, nursingAssessmentSignatureForLocale } from "./patientChartHelpers";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import { clinicalResultFromChartOrderItem } from "@/lib/clinicalResultNormalize";
import { chartSummaryAttachmentSummary, chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";

const emptyBox: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

function chartOrderTypeLabel(t: (k: string) => string, type: string): string {
  const map: Record<string, string> = {
    LAB: "orderTypeLAB",
    IMAGING: "orderTypeIMAGING",
    MEDICATION: "orderTypeMEDICATION",
    CARE: "orderTypeCARE",
  };
  const sub = map[type] ?? "orderTypeOTHER";
  return t(`encounterChrome.chartTabs.${sub}`);
}

function flattenItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const items: ChartSummaryOrderItem[] = [];
  for (const o of enc.orders ?? []) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function EncounterBlock({
  enc,
  children,
  t,
  language,
}: {
  enc: ChartSummaryEncounter;
  children: React.ReactNode;
  t: (k: string) => string;
  language: SupportedLanguage;
}) {
  const formatDt = (iso: string) => formatEncounterChromeDateTime(iso, language);
  const nursing = nursingAssessmentDisplayLines(enc.nursingAssessment, language);
  const nursingSig = nursingAssessmentSignatureForLocale(enc.nursingAssessment, language, t);
  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        <Link href={`/app/encounters/${enc.id}`} style={{ color: "#0d47a1", textDecoration: "none" }}>
          {tEncounterType(t, enc.type)} — {formatDt(enc.createdAt)}
        </Link>
      </div>
      {nursing.length > 0 ? (
        <div style={{ marginBottom: 12, fontSize: 13, color: "#37474f" }}>
          <strong>{t("encounterChrome.chartTabs.nursingHeading")}</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
            {nursing.slice(0, 8).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {nursingSig ? (
            <div style={{ fontSize: 12, color: "#546e7a", marginTop: 8, fontStyle: "italic" }}>{nursingSig}</div>
          ) : null}
        </div>
      ) : null}
      {enc.providerDocumentationStatus === "SIGNED" &&
      enc.providerDocumentationSignedByDisplayFr &&
      enc.providerDocumentationSignedAt ? (
        <div
          style={{
            fontSize: 12,
            color: "#1565c0",
            marginBottom: 12,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {t("encounterChrome.chartTabs.signedBy")
            .replace("{name}", enc.providerDocumentationSignedByDisplayFr)
            .replace("{datetime}", formatDt(enc.providerDocumentationSignedAt))}
        </div>
      ) : null}
      {(enc.providerAddenda ?? []).length > 0 ? (
        <div style={{ marginBottom: 12, fontSize: 13, color: "#37474f" }}>
          {(enc.providerAddenda ?? []).map((ad) => (
            <div key={ad.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {t("encounterChrome.chartTabs.addendumBy")
                  .replace("{name}", ad.createdByDisplayFr ?? "—")
                  .replace("{datetime}", formatDt(ad.createdAt))}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{ad.text}</div>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PatientOrdersTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  const { t, language } = useI18n();
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoRecentEncounters")}</div>;
  }
  let hasRows = false;
  const blocks = chartSummary.recentEncounters.map((enc) => {
    const orders = enc.orders ?? [];
    if (orders.length === 0) return null;
    hasRows = true;
    return (
      <EncounterBlock enc={enc} key={enc.id} t={t} language={language}>
        {orders.map((o) => (
          <div key={o.id} style={{ marginBottom: 12, fontSize: 14 }}>
            <div style={{ fontWeight: 600, color: "#455a64" }}>{chartOrderTypeLabel(t, o.type)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, overflowWrap: "anywhere" }}>
              {formatOrderAuthority(o, t)}
            </div>
            {formatOrderAttributionLines(o, t, language).map((line) => (
              <div key={line} style={{ fontSize: 12, color: "#64748b", marginTop: 3, overflowWrap: "anywhere" }}>
                {line}
              </div>
            ))}
            {o.status === "CANCELLED" &&
            (o.cancelledByDisplayFr || o.cancelledAt || o.cancellationReason) ? (
              <div style={{ fontSize: 12, color: "#b71c1c", marginTop: 4, marginBottom: 6, lineHeight: 1.45 }}>
                {o.cancelledByDisplayFr ? (
                  <>
                    {t("encounterChrome.chartTabs.orderCancelledBy")}{" "}
                    <strong>{o.cancelledByDisplayFr}</strong>
                    {o.cancelledAt ? (
                      <>
                        {" "}
                        {t("encounterChrome.chartTabs.onDate")}{" "}
                        {formatEncounterChromeDateTime(o.cancelledAt, language)}
                      </>
                    ) : null}
                  </>
                ) : null}
                {o.cancellationReason ? (
                  <>
                    {o.cancelledByDisplayFr || o.cancelledAt ? <br /> : null}
                    {t("encounterChrome.chartTabs.reasonPrefix")}: {o.cancellationReason}
                  </>
                ) : null}
              </div>
            ) : null}
            <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
              {(o.items || []).map((it) => (
                <li key={it.id}>
                  <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong> —{" "}
                  {tOrderItemStatusForWorklist(t, it.status)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </EncounterBlock>
    );
  });
  if (!hasRows) return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoOrders")}</div>;
  return <div>{blocks}</div>;
}

export function PatientResultsTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  const { t, language } = useI18n();
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoRecentEncounters")}</div>;
  }
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const items = flattenItems(enc).filter((it) => it.catalogItemType === "LAB_TEST" || it.catalogItemType === "IMAGING_STUDY");
    const withResults = items.filter(
      (it) =>
        !!(
          it.result?.resultText?.trim() ||
          chartSummaryAttachmentSummary(it.result, language) ||
          (it.result?.attachments && it.result.attachments.length > 0) ||
          it.status === "RESULTED" ||
          it.status === "VERIFIED"
        )
    );
    if (withResults.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`res-${enc.id}`} t={t} language={language}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#455a64" }}>
          {t("encounterChrome.chartTabs.sectionResults")}
        </div>
        {withResults.map((it) => {
          const v = clinicalResultFromChartOrderItem(
            {
              displayLabel: it.displayLabel,
              displayLabelFr: it.displayLabelFr,
              displayLabelEn: it.displayLabelEn,
              status: it.status,
              catalogItemType: it.catalogItemType,
              result: it.result,
            },
            language,
            t
          );
          return (
            <ClinicalResultViewer
              key={it.id}
              compact
              title={v.title}
              itemStatus={v.itemStatus}
              verifiedAt={v.verifiedAt}
              criticalValue={v.criticalValue}
              resultText={v.resultText}
              attachments={v.attachments}
              enteredByDisplayFr={v.enteredByDisplayFr}
              catalogItemType={v.catalogItemType}
            />
          );
        })}
      </EncounterBlock>
    );
  }
  if (blocks.length === 0) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoLabImagingResults")}</div>;
  }
  return <div>{blocks}</div>;
}

export function PatientImagingTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  const { t, language } = useI18n();
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoRecentEncounters")}</div>;
  }
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const all = flattenItems(enc).filter((it) => it.catalogItemType === "IMAGING_STUDY");
    if (all.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`img-${enc.id}`} t={t} language={language}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
          {t("encounterChrome.chartTabs.imagingTabTitle")}
        </div>
        <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
          {all.map((it) => (
            <li key={it.id}>
              <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong> —{" "}
              {tOrderItemStatusForWorklist(t, it.status)}
            </li>
          ))}
        </ul>
        {(() => {
          const withResults = all.filter(
            (it) =>
              !!(
                it.result?.resultText?.trim() ||
                chartSummaryAttachmentSummary(it.result, language) ||
                (it.result?.attachments && it.result.attachments.length > 0) ||
                it.status === "RESULTED" ||
                it.status === "VERIFIED"
              )
          );
          if (withResults.length === 0) return null;
          return (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#455a64" }}>
                {t("encounterChrome.chartTabs.sectionReports")}
              </div>
              {withResults.map((it) => {
                const v = clinicalResultFromChartOrderItem(
                  {
                    displayLabel: it.displayLabel,
                    displayLabelFr: it.displayLabelFr,
                    displayLabelEn: it.displayLabelEn,
                    status: it.status,
                    catalogItemType: it.catalogItemType,
                    result: it.result,
                  },
                  language,
                  t
                );
                return (
                  <ClinicalResultViewer
                    key={`cr-${it.id}`}
                    compact
                    title={v.title}
                    itemStatus={v.itemStatus}
                    verifiedAt={v.verifiedAt}
                    criticalValue={v.criticalValue}
                    resultText={v.resultText}
                    attachments={v.attachments}
                    enteredByDisplayFr={v.enteredByDisplayFr}
                    catalogItemType={v.catalogItemType}
                  />
                );
              })}
            </>
          );
        })()}
      </EncounterBlock>
    );
  }
  if (blocks.length === 0) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoImagingRequests")}</div>;
  }
  return <div>{blocks}</div>;
}

export function PatientMedicationsTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  const { t, language } = useI18n();
  if (!chartSummary?.recentEncounters?.length) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoRecentEncounters")}</div>;
  }
  const globalDisp = chartSummary.recentMedicationDispenses ?? [];
  const blocks: React.ReactNode[] = [];
  for (const enc of chartSummary.recentEncounters) {
    const medLines = flattenItems(enc).filter((it) => it.catalogItemType === "MEDICATION");
    const orderByItemId = new Map<string, NonNullable<ChartSummaryEncounter["orders"]>[number]>();
    for (const order of enc.orders ?? []) {
      for (const item of order.items ?? []) orderByItemId.set(item.id, order);
    }
    const encDisp = enc.encounterMedicationDispenses ?? [];
    const administered = medLines.filter((it) => it.completedAt);
    if (medLines.length === 0 && encDisp.length === 0) continue;
    blocks.push(
      <EncounterBlock enc={enc} key={`med-${enc.id}`} t={t} language={language}>
        {medLines.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
              {t("encounterChrome.chartTabs.sectionPrescriptions")}
            </div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
              {medLines.map((it) => {
                const label = chartSummaryOrderItemLineLabel(it, language, t);
                const highRiskWarning = highRiskMedicationWarning({ ...it, label }, t);
                return (
                <li key={it.id}>
                  <strong>{label}</strong> — {tOrderItemStatusForWorklist(t, it.status)}
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                    {formatOrderAuthority(orderByItemId.get(it.id), t)}
                  </div>
                  {highRiskWarning ? (
                    <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 600 }}>
                      {highRiskWarning}
                    </div>
                  ) : null}
                  {formatOrderAttributionLines(orderByItemId.get(it.id), t, language).map((line) => (
                    <div key={line} style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                      {line}
                    </div>
                  ))}
                  {it.status === "CANCELLED" &&
                  (it.cancelledByDisplayFr || it.cancelledAt || it.cancellationReason) ? (
                    <div style={{ fontSize: 11, color: "#b71c1c", marginTop: 4, lineHeight: 1.45 }}>
                      {it.cancelledByDisplayFr ? (
                        <>
                          {t("encounterChrome.chartTabs.orderCancelledBy")}{" "}
                          <strong>{it.cancelledByDisplayFr}</strong>
                          {it.cancelledAt ? (
                            <>
                              {" "}
                              {t("encounterChrome.chartTabs.onDate")}{" "}
                              {formatEncounterChromeDateTime(it.cancelledAt, language)}
                            </>
                          ) : null}
                        </>
                      ) : null}
                      {it.cancellationReason ? (
                        <>
                          {it.cancelledByDisplayFr || it.cancelledAt ? <br /> : null}
                          {t("encounterChrome.chartTabs.reasonPrefix")}: {it.cancellationReason}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {it.catalogItemType === "MEDICATION" &&
                  it.status !== "CANCELLED" &&
                  !it.completedAt &&
                  !isOrderItemDoneForChart(it.status) ? (
                    <div style={{ fontSize: 12, color: "#616161", marginTop: 4 }}>
                      {tMedicationFulfillmentIntent(t, it.medicationFulfillmentIntent)}
                    </div>
                  ) : null}
                </li>
                );
              })}
            </ul>
          </>
        ) : null}
        {administered.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
              {t("encounterChrome.chartTabs.administeredInChart")}
            </div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 14 }}>
              {administered.map((it) => (
                <li key={`adm-${it.id}`}>
                  <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong>
                  {it.completedAt && it.completedBy
                    ? t("encounterChrome.chartTabs.medicationAdministeredFull")
                        .replace("{firstName}", it.completedBy.firstName ?? "")
                        .replace("{lastName}", it.completedBy.lastName ?? "")
                        .replace("{datetime}", formatEncounterChromeDateTime(it.completedAt, language))
                    : it.completedAt
                      ? t("encounterChrome.chartTabs.medicationAdministeredShort").replace(
                          "{datetime}",
                          formatEncounterChromeDateTime(it.completedAt, language)
                        )
                      : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {encDisp.length > 0 ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#455a64" }}>
              {t("encounterChrome.chartTabs.pharmacyDispensed")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {encDisp.map((d) => {
                const label =
                  catalogMedicationNameForLocale(d.catalogMedication, language) ||
                  d.catalogMedication.code ||
                  "—";
                const by = d.dispensedBy
                  ? `${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim()
                  : null;
                return (
                  <li key={d.id}>
                    <strong>{label}</strong>{" "}
                    {t("encounterChrome.chartTabs.pharmacyQuantityTimes").replace(
                      "{quantity}",
                      String(d.quantityDispensed)
                    )}
                    {by
                      ? t("encounterChrome.chartTabs.pharmacyDispensedBy").replace("{name}", by)
                      : ""}
                    {t("encounterChrome.chartTabs.pharmacyDispensedAt").replace(
                      "{datetime}",
                      formatEncounterChromeDateTime(d.dispensedAt, language)
                    )}
                    {d.dosageInstructions ? ` — ${d.dosageInstructions}` : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </EncounterBlock>
    );
  }

  return wrapWithGlobalDispenseChart(blocks, globalDisp, t, language);
}

function wrapWithGlobalDispenseChart(
  blocks: React.ReactNode[],
  globalDisp: ChartSummary["recentMedicationDispenses"],
  t: (k: string) => string,
  language: SupportedLanguage
) {
  const extra =
    globalDisp.length > 0 ? (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>{t("encounterChrome.chartTabs.lastDispensesAll")}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {globalDisp.slice(0, 25).map((d) => {
            const label =
              catalogMedicationNameForLocale(d.catalogMedication, language) ||
              d.catalogMedication.code ||
              "—";
            const by = d.dispensedBy
              ? `${d.dispensedBy.firstName} ${d.dispensedBy.lastName}`.trim()
              : null;
            return (
              <li key={d.id}>
                <strong>{label}</strong>{" "}
                {t("encounterChrome.chartTabs.pharmacyQuantityTimes").replace(
                  "{quantity}",
                  String(d.quantityDispensed)
                )}
                {by ? t("encounterChrome.chartTabs.pharmacyDispensedBy").replace("{name}", by) : ""}
                {t("encounterChrome.chartTabs.pharmacyDispensedAt").replace(
                  "{datetime}",
                  formatEncounterChromeDateTime(d.dispensedAt, language)
                )}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  if (blocks.length === 0 && !extra) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.emptyNoRx")}</div>;
  }

  return (
    <div>
      {extra}
      <div>{blocks}</div>
    </div>
  );
}

export function PatientAuditTimelineTabContent({ chartSummary }: { chartSummary: ChartSummary | null }) {
  const { t, language } = useI18n();
  const items = chartSummary?.auditTimeline ?? [];
  if (items.length === 0) {
    return <div style={emptyBox}>{t("encounterChrome.chartTabs.auditEmpty")}</div>;
  }
  return (
    <div>
      <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
        {t("encounterChrome.chartTabs.auditTitle")}
      </h3>
      <p style={{ fontSize: 13, color: "#616161", marginBottom: 16, lineHeight: 1.45 }}>
        {t("encounterChrome.chartTabs.auditSubtitle")}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((it) => (
          <li
            key={it.id}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #eee",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontWeight: 600, color: "#37474f" }}>{it.shortLabel}</div>
            <div style={{ fontSize: 13, color: "#616161", marginTop: 4 }}>
              {it.userDisplayFr ? (
                <>
                  {t("encounterChrome.byPrefix")} {it.userDisplayFr}
                </>
              ) : (
                <span>{t("common.dash")}</span>
              )}
              {" — "}
              {formatEncounterChromeDateTime(it.createdAt, language)}
            </div>
            {it.detailFr ? (
              <div style={{ fontSize: 12, color: "#546e7a", marginTop: 6 }}>{it.detailFr}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
