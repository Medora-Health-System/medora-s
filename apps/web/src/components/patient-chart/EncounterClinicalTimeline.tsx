"use client";

import React from "react";
import Link from "next/link";
import type { ChartSummaryEncounter, ChartSummaryOrderItem } from "@/lib/chartApi";
import type { FollowUpRow } from "@/lib/followUpsApi";
import { formatVitalsHeaderLineForLocale } from "@/lib/patientVitals";
import { useI18n } from "@/lib/i18n";
import { tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import {
  diagnosisDisplayFr,
  parseAdmissionSummaryForChart,
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  parsePhysicianEvalV1ForChart,
} from "./patientChartHelpers";
import { parseNursingProceduresForChart } from "@/lib/nursingProcedures";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import type { SupportedLanguage } from "@/i18n/config";
import { chartSummaryAttachmentSummary, chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";

const subTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#455a64",
  marginTop: 12,
  marginBottom: 6,
  letterSpacing: "0.02em",
};

const blockStyle: React.CSSProperties = {
  padding: "14px 16px",
  marginBottom: 14,
  backgroundColor: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  borderLeft: "4px solid #1565c0",
};

const listStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  paddingLeft: 18,
  fontSize: 13,
  color: "#263238",
  lineHeight: 1.45,
};

function fillTemplate(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function physicianName(u: { firstName: string; lastName: string } | null | undefined): string | null {
  if (!u) return null;
  const s = `${u.firstName} ${u.lastName}`.trim();
  return s || null;
}

function chartOrderItemLabel(status: string, t: (k: string) => string): string {
  const u = (status || "").toUpperCase();
  if (u === "COMPLETED" || u === "RESULTED" || u === "VERIFIED") {
    return t("printOutput.orderItemChart.terminalDone");
  }
  const key = `printOutput.orderItemChart.${u}`;
  const r = t(key);
  return r !== key ? r : status || "—";
}

function diagnosisStatusLabel(status: string, t: (k: string) => string): string {
  const u = (status || "").toUpperCase();
  if (u === "ACTIVE") return t("encounterClinicalTimeline.diagActive");
  if (u === "RESOLVED") return t("encounterClinicalTimeline.diagResolved");
  return status;
}

function medicationIntentLabel(intent: string | null, t: (k: string) => string): string | null {
  if (intent === "ADMINISTER_CHART") return t("encounterChrome.medicationIntent.ADMINISTER_CHART");
  if (intent === "PHARMACY_DISPENSE") return t("encounterChrome.medicationIntent.DISPENSE_PHARMACY");
  return null;
}

function orderTypeHeading(orderType: string, t: (k: string) => string): string {
  switch (orderType) {
    case "LAB":
      return t("encounterClinicalTimeline.ordLabs");
    case "IMAGING":
      return t("encounterClinicalTimeline.ordImaging");
    case "MEDICATION":
      return t("encounterClinicalTimeline.ordMeds");
    case "CARE":
      return t("encounterClinicalTimeline.ordCare");
    default:
      return t("encounterChrome.ordersTab.title");
  }
}

function flattenOrderItems(enc: ChartSummaryEncounter): ChartSummaryOrderItem[] {
  const orders = enc.orders ?? [];
  const items: ChartSummaryOrderItem[] = [];
  for (const o of orders) {
    for (const it of o.items || []) items.push(it);
  }
  return items;
}

function OrderItemLine({
  it,
  showMode,
  language,
  t,
  formatShortDateTime,
}: {
  it: ChartSummaryOrderItem;
  showMode: "request" | "result";
  language: SupportedLanguage;
  t: (k: string) => string;
  formatShortDateTime: (iso: string | null | undefined) => string;
}) {
  if (showMode === "result") {
    const attSummary = chartSummaryAttachmentSummary(it.result, language);
    const hasResult = !!(
      it.result?.resultText?.trim() ||
      attSummary ||
      it.result?.verifiedAt ||
      it.status === "RESULTED" ||
      it.status === "VERIFIED"
    );
    if (!hasResult) return null;
    const crit = it.result?.criticalValue ? t("encounterClinicalTimeline.criticalPrefix") : "";
    const txt = it.result?.resultText?.trim();
    const att = attSummary;
    const statusLbl = chartOrderItemLabel(it.status, t);
    const body = txt ? `${crit}${txt}` : att ? `${crit}${att}` : `${crit}${statusLbl}`;
    return (
      <li>
        <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong>
        {` — ${body}`}
        {it.result?.verifiedAt ? ` (${formatShortDateTime(it.result.verifiedAt)})` : null}
      </li>
    );
  }

  const statusLbl = chartOrderItemLabel(it.status, t);
  const intentLbl =
    it.catalogItemType === "MEDICATION" && it.status !== "CANCELLED"
      ? medicationIntentLabel(it.medicationFulfillmentIntent, t)
      : null;
  const extras: string[] = [];
  if (intentLbl) extras.push(intentLbl);
  extras.push(statusLbl);

  const cancelMeta =
    it.status === "CANCELLED" && (it.cancelledByDisplayFr || it.cancelledAt || it.cancellationReason) ? (
      <div style={{ fontSize: 11, color: "#b71c1c", marginTop: 4, lineHeight: 1.45 }}>
        {it.cancelledByDisplayFr ? (
          <>
            {t("encounterChrome.chartTabs.orderCancelledBy")} <strong>{it.cancelledByDisplayFr}</strong>
            {it.cancelledAt ? (
              <>
                {" "}
                {t("encounterChrome.chartTabs.onDate")} {formatShortDateTime(it.cancelledAt)}
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
    ) : null;

  return (
    <li>
      <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong>
      {extras.length ? ` — ${extras.join(" · ")}` : null}
      {cancelMeta}
    </li>
  );
}

function NurseAdminLine({
  it,
  language,
  t,
  formatShortDateTime,
}: {
  it: ChartSummaryOrderItem;
  language: SupportedLanguage;
  t: (k: string) => string;
  formatShortDateTime: (iso: string | null | undefined) => string;
}) {
  if (it.catalogItemType !== "MEDICATION" || !it.completedAt) return null;
  const who = physicianName(it.completedBy);
  return (
    <li>
      <strong>{chartSummaryOrderItemLineLabel(it, language, t)}</strong>
      {who ? (
        <>
          {" "}
          —{" "}
          {fillTemplate(t("encounterClinicalTimeline.nurseAdminBy"), {
            who,
            datetime: formatShortDateTime(it.completedAt),
          })}
        </>
      ) : (
        <>
          {" "}
          —{" "}
          {fillTemplate(t("encounterClinicalTimeline.nurseAdminCompleted"), {
            datetime: formatShortDateTime(it.completedAt),
            status: chartOrderItemLabel(it.status, t),
          })}
        </>
      )}
    </li>
  );
}

function followUpStatusLabel(status: string, t: (k: string) => string): string {
  const k = `printOutput.chartSummary.followUpStatus.${(status || "").toUpperCase()}`;
  const r = t(k);
  return r !== k ? r : status;
}

export function EncounterClinicalTimeline({
  encounters,
  followUps,
}: {
  encounters: ChartSummaryEncounter[];
  followUps: FollowUpRow[];
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const formatShortDateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  };

  if (!encounters.length) {
    return (
      <div style={{ padding: 16, color: "#666", fontSize: 14, background: "#fafafa", borderRadius: 6 }}>
        {t("encounterClinicalTimeline.empty")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {encounters.map((enc) => {
        const consultWhen = formatShortDateTime(enc.createdAt);
        const nursingSections = parseNursingAssessmentSectionsForChart(enc.nursingAssessment, language);
        const nursingProcedureSections = parseNursingProceduresForChart(enc.nursingAssessment, language);
        const physicianDocSections = parsePhysicianEvalV1ForChart(enc.nursingAssessment, language);
        const discharge = parseDischargeSummaryForChart(enc.dischargeSummaryJson);
        const admission = parseAdmissionSummaryForChart(enc.admissionSummaryJson);
        const items = flattenOrderItems(enc);
        const labItems = items.filter((i) => i.catalogItemType === "LAB_TEST");
        const imgItems = items.filter((i) => i.catalogItemType === "IMAGING_STUDY");
        const medItems = items.filter((i) => i.catalogItemType === "MEDICATION");
        const careItems = items.filter((i) => i.catalogItemType === "CARE");
        const resultItemsPreview = items.filter((it) => {
          if (it.catalogItemType !== "LAB_TEST" && it.catalogItemType !== "IMAGING_STUDY") return false;
          return !!(
            it.result?.resultText?.trim() ||
            chartSummaryAttachmentSummary(it.result, language) ||
            it.result?.verifiedAt ||
            it.status === "RESULTED" ||
            it.status === "VERIFIED"
          );
        });
        const adminLines = medItems.filter((it) => it.completedAt);
        const encDisp = enc.encounterMedicationDispenses ?? [];
        const encDiags = enc.encounterDiagnoses ?? [];
        const encFollowUps = followUps.filter((fu) => fu.encounterId === enc.id);

        const vitals = (enc.triage?.vitalsJson || {}) as Record<string, number | string | null>;
        const vitalsLine = formatVitalsHeaderLineForLocale(vitals, language);
        const esi = enc.triage?.esi != null ? `ESI ${enc.triage.esi}` : null;
        const hasTriageBlock = !!(vitalsLine.trim() || enc.triage?.chiefComplaint || enc.triage?.esi != null);

        const typeKey = (enc.type ?? "").trim() || "OUTPATIENT";
        let meta = fillTemplate(t("encounterClinicalTimeline.metaWhen"), { datetime: consultWhen });
        if (enc.roomLabel?.trim()) {
          meta += fillTemplate(t("encounterClinicalTimeline.metaRoom"), { room: enc.roomLabel.trim() });
        }
        const phys = physicianName(enc.physicianAssigned ?? null);
        if (phys) {
          meta += fillTemplate(t("encounterClinicalTimeline.metaPhysician"), { name: phys });
        }

        return (
          <div key={enc.id} style={blockStyle}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0d47a1" }}>
                <Link href={`/app/encounters/${enc.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {t("encounterClinicalTimeline.encounterHeading")} — {tEncounterType(t, typeKey)}
                </Link>
              </div>
              <div style={{ fontSize: 13, color: "#455a64", marginTop: 4 }}>{meta}</div>
              <div style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                {tEncounterStatus(t, (enc.status ?? "OPEN").trim() || "OPEN")}
                {esi ? ` · ${esi}` : null}
              </div>
              {enc.admittedAt ? (
                <div style={{ fontSize: 12, color: "#6a1b9a", fontWeight: 600, marginTop: 6 }}>
                  {fillTemplate(t("encounterClinicalTimeline.hospitalizationLine"), {
                    datetime: formatShortDateTime(
                      typeof enc.admittedAt === "string" ? enc.admittedAt : String(enc.admittedAt ?? "")
                    ),
                  })}
                </div>
              ) : null}
            </div>

            {hasTriageBlock && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionVitalsIntake")}</div>
                <div style={{ fontSize: 13, color: "#263238", fontFamily: "ui-monospace, monospace" }}>
                  {vitalsLine.trim() ? vitalsLine : "—"}
                </div>
                {enc.triage?.esi != null ? (
                  <div style={{ fontSize: 13, marginTop: 6, color: "#546e7a" }}>{esi}</div>
                ) : null}
                {enc.triage?.chiefComplaint ? (
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ color: "#666" }}>{t("encounterClinicalTimeline.chiefComplaintPrefix")} </span>
                    {enc.triage.chiefComplaint}
                  </div>
                ) : null}
              </>
            )}

            {(nursingSections.length > 0 || nursingProcedureSections.length > 0) && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionNursing")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {nursingSections.map((s, i) => (
                    <div key={`nsec-${i}`}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.label}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{s.text}</div>
                    </div>
                  ))}
                  {nursingProcedureSections.map((s, i) => (
                    <div key={`proc-${i}`}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.label}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {physicianDocSections.length > 0 && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionPhysicianDoc")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {physicianDocSections.map((s, i) => (
                    <div key={`pev-${i}`}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#546e7a" }}>{s.label}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(enc.clinicianImpressionPreview || enc.treatmentPlanPreview || encDiags.length > 0) && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionMedEvalDx")}</div>
                {enc.clinicianImpressionPreview ? (
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#666" }}>{t("encounterClinicalTimeline.clinicalImpression")} </span>
                    {enc.clinicianImpressionPreview}
                  </div>
                ) : null}
                {enc.treatmentPlanPreview ? (
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: "#666" }}>{t("encounterClinicalTimeline.treatmentPlan")} </span>
                    {enc.treatmentPlanPreview}
                  </div>
                ) : null}
                {encDiags.length > 0 ? (
                  <ul style={listStyle}>
                    {encDiags.map((d) => (
                      <li key={d.id}>
                        {diagnosisDisplayFr(d.description, d.code)} ({diagnosisStatusLabel(d.status, t)})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}

            {admission && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionAdmission")}</div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  {admission.admissionReason ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblAdmissionReason")}{" "}
                      </span>
                      {admission.admissionReason}
                    </div>
                  ) : null}
                  {admission.serviceUnit ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblServiceUnit")} </span>
                      {admission.serviceUnit}
                    </div>
                  ) : null}
                  {admission.admissionDiagnosis ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblAdmissionDx")} </span>
                      {admission.admissionDiagnosis}
                    </div>
                  ) : null}
                  {admission.careLevel ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblCareLevel")} </span>
                      {admission.careLevel}
                    </div>
                  ) : null}
                  {admission.conditionAtAdmission ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblConditionAdmission")}{" "}
                      </span>
                      <span style={{ whiteSpace: "pre-wrap" }}>{admission.conditionAtAdmission}</span>
                    </div>
                  ) : null}
                  {admission.initialPlan ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblInitialPlan")} </span>
                      <span style={{ whiteSpace: "pre-wrap" }}>{admission.initialPlan}</span>
                    </div>
                  ) : null}
                  {admission.responsiblePhysicianName ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblResponsiblePhysician")}{" "}
                      </span>
                      {admission.responsiblePhysicianName}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {(labItems.length > 0 || imgItems.length > 0 || medItems.length > 0 || careItems.length > 0) && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionOrders")}</div>
                {labItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeading("LAB", t)}</div>
                    <ul style={listStyle}>
                      {labItems.map((it) => (
                        <OrderItemLine
                          key={it.id}
                          it={it}
                          showMode="request"
                          language={language}
                          t={t}
                          formatShortDateTime={formatShortDateTime}
                        />
                      ))}
                    </ul>
                  </div>
                )}
                {imgItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeading("IMAGING", t)}</div>
                    <ul style={listStyle}>
                      {imgItems.map((it) => (
                        <OrderItemLine
                          key={it.id}
                          it={it}
                          showMode="request"
                          language={language}
                          t={t}
                          formatShortDateTime={formatShortDateTime}
                        />
                      ))}
                    </ul>
                  </div>
                )}
                {medItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeading("MEDICATION", t)}</div>
                    <ul style={listStyle}>
                      {medItems.map((it) => (
                        <OrderItemLine
                          key={it.id}
                          it={it}
                          showMode="request"
                          language={language}
                          t={t}
                          formatShortDateTime={formatShortDateTime}
                        />
                      ))}
                    </ul>
                  </div>
                )}
                {careItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#607d8b" }}>{orderTypeHeading("CARE", t)}</div>
                    <ul style={listStyle}>
                      {careItems.map((it) => (
                        <OrderItemLine
                          key={it.id}
                          it={it}
                          showMode="request"
                          language={language}
                          t={t}
                          formatShortDateTime={formatShortDateTime}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {resultItemsPreview.length > 0 && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionResultsPreview")}</div>
                <ul style={listStyle}>
                  {resultItemsPreview.map((it) => (
                    <OrderItemLine
                      key={`r-${it.id}`}
                      it={it}
                      showMode="result"
                      language={language}
                      t={t}
                      formatShortDateTime={formatShortDateTime}
                    />
                  ))}
                </ul>
              </>
            )}

            {(adminLines.length > 0 || encDisp.length > 0) && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionDispenseAdmin")}</div>
                {adminLines.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#607d8b", marginBottom: 4 }}>
                      {t("encounterClinicalTimeline.ordExecuted")}
                    </div>
                    <ul style={listStyle}>
                      {adminLines.map((it) => (
                        <NurseAdminLine
                          key={it.id}
                          it={it}
                          language={language}
                          t={t}
                          formatShortDateTime={formatShortDateTime}
                        />
                      ))}
                    </ul>
                  </>
                )}
                {encDisp.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#607d8b", marginBottom: 4 }}>
                      {t("encounterClinicalTimeline.dispenseRecorded")}
                    </div>
                    <ul style={listStyle}>
                      {encDisp.map((d) => {
                        const label =
                          catalogMedicationNameForLocale(d.catalogMedication, language) ||
                          d.catalogMedication.code ||
                          "—";
                        const by = physicianName(d.dispensedBy);
                        return (
                          <li key={d.id}>
                            <strong>{label}</strong>
                            {fillTemplate(t("encounterClinicalTimeline.dispenseTimes"), { qty: d.quantityDispensed })}
                            {by ? fillTemplate(t("encounterClinicalTimeline.dispenseBy"), { who: by }) : ""}
                            {fillTemplate(t("encounterClinicalTimeline.dispenseOn"), {
                              datetime: formatShortDateTime(d.dispensedAt),
                            })}
                            {d.dosageInstructions ? ` — ${d.dosageInstructions}` : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}

            {discharge && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionDischarge")}</div>
                <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                  {discharge.disposition ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblDisposition")} </span>
                      {discharge.disposition}
                    </div>
                  ) : null}
                  {discharge.exitCondition ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblExitCondition")} </span>
                      {discharge.exitCondition}
                    </div>
                  ) : null}
                  {discharge.dischargeInstructions ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblDischargeInstructions")}{" "}
                      </span>
                      {discharge.dischargeInstructions}
                    </div>
                  ) : null}
                  {discharge.medicationsGiven ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblMedicationsGiven")}{" "}
                      </span>
                      {discharge.medicationsGiven}
                    </div>
                  ) : null}
                  {discharge.followUp ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblFollowUp")} </span>
                      {discharge.followUp}
                    </div>
                  ) : null}
                  {discharge.returnIfWorse ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblReturnIfWorse")} </span>
                      {discharge.returnIfWorse}
                    </div>
                  ) : null}
                  {discharge.patientDestination ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>
                        {t("encounterClinicalTimeline.lblPatientDestination")}{" "}
                      </span>
                      {discharge.patientDestination}
                    </div>
                  ) : null}
                  {discharge.dischargeMode ? (
                    <div>
                      <span style={{ fontWeight: 600, color: "#546e7a" }}>{t("encounterClinicalTimeline.lblDischargeMode")} </span>
                      {discharge.dischargeMode}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {encFollowUps.length > 0 && (
              <>
                <div style={subTitle}>{t("encounterClinicalTimeline.sectionFollowUps")}</div>
                <ul style={listStyle}>
                  {encFollowUps.map((fu) => (
                    <li key={fu.id}>
                      {formatShortDateTime(fu.dueDate)} — {fu.reason || t("encounterClinicalTimeline.followUpNoReason")}
                      {" — "}
                      {followUpStatusLabel(fu.status, t)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
