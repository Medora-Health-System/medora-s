"use client";

/**
 * MEDUI.INP.2F — Encounter medical-record Summary (read-only projection).
 * Reuses existing GET engines. Does not persist a duplicate Summary clinical store.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatCarePlanClinicianAttribution,
  formatNursingAdmissionAttributionClinician,
  humanizeClinicalLabel,
  projectEncounterCarePlanMedicalRecord,
  projectInpatientNursingAssessmentOverview,
  projectNursingAdmissionMedicalRecord,
  type EncounterCarePlanMedicalRecordProjectionV1,
  type InpatientNursingAssessmentV1,
  type MedSurgNursingAdmissionDocV1,
  type NursingAdmissionMedicalRecordProjectionV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch } from "@/lib/apiClient";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  snapshotsToVitalSummaryReadings,
  VitalSummaryPanel,
} from "@/components/patients/VitalSummaryPanel";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { parseVitalsHistoryEntries } from "@/lib/encounterClinicalSafetyUi";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import {
  fetchNursingAdmissionDocumentation,
  fetchProviderClinicalSynthesis,
  fetchProviderWorkspace,
} from "@/features/hospital-care/inpatientOperationsApi";
import {
  printEncounterChartLivePreview,
} from "@/components/encounters/EncounterChartLivePreview";
import { buildRxPrintFacilityIdentity } from "@/components/pharmacy/RxPrintLayout";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import {
  buildCarePlanMedicalRecordPrintHtml,
  formatCarePlanDocumentedLine,
  formatCarePlanReviewedLine,
  resolveCarePlanDisciplineLabel,
  resolveCarePlanPlanTitle,
  resolveCarePlanStatusLabel,
} from "./carePlanMedicalRecordProjectionCp1b";

type EncounterLite = {
  id: string;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | Date | null;
    sexAtBirth?: string | null;
  } | null;
};

type Props = {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite | null;
  room?: string | null;
  admittedAt?: string | null;
  attendingName?: string | null;
  assignedRnName?: string | null;
  codeStatus?: string | null;
  isolation?: string[] | null;
  admissionDiagnosis?: string | null;
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
};

const card = { ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 10 } as const;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSummaryClinicalDateTime(iso?: string | null, language?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(language === "fr" ? "fr-HT" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function nursingAdmissionAttributionHtml(
  nursingAdmission: NursingAdmissionMedicalRecordProjectionV1,
  t: (key: string) => string,
  language: string
): string {
  const attr = nursingAdmission.attribution;
  if (!attr) return "";
  const lines: string[] = [];
  const completed = formatNursingAdmissionAttributionClinician(attr.completed);
  if (completed) {
    const when = formatSummaryClinicalDateTime(attr.completed.atIso, language);
    lines.push(
      `<div data-testid="print-nursing-admission-completed-by"><dt>${escHtml(
        t("inpatientNursingAdmissionInp2g.record.completedBy")
      )}</dt><dd>${escHtml(completed)}${when ? ` · ${escHtml(when)}` : ""}</dd></div>`
    );
  }
  const signed = formatNursingAdmissionAttributionClinician(attr.signed);
  if (signed) {
    const when = formatSummaryClinicalDateTime(attr.signed.atIso, language);
    lines.push(
      `<div data-testid="print-nursing-admission-signed-by"><dt>${escHtml(
        t("inpatientNursingAdmissionInp2g.record.signedBy")
      )}</dt><dd>${escHtml(signed)}${when ? ` · ${escHtml(when)}` : ""}</dd></div>`
    );
  }
  const corrected = attr.latestCorrection
    ? formatNursingAdmissionAttributionClinician(attr.latestCorrection)
    : null;
  if (corrected && attr.latestCorrection?.atIso) {
    const when = formatSummaryClinicalDateTime(attr.latestCorrection.atIso, language);
    lines.push(
      `<div data-testid="print-nursing-admission-corrected-by"><dt>${escHtml(
        t("inpatientNursingAdmissionInp2g.record.correctedBy")
      )}</dt><dd>${escHtml(corrected)}${when ? ` · ${escHtml(when)}` : ""}</dd></div>`
    );
  }
  return lines.join("");
}

function displayOrDash(v: unknown, dash: string): string {
  if (v == null) return dash;
  const s = String(v).trim();
  return s ? s : dash;
}

/** Prefer order item clinical labels; fall back to order type (never invent medication names). */
function orderSummaryLabel(order: Record<string, unknown>, dash: string): string {
  const top =
    order.displayLabel ??
    order.label ??
    order.name ??
    order.medicationName ??
    order.displayName ??
    order.manualLabel;
  if (typeof top === "string" && top.trim()) return top.trim();
  const items = Array.isArray(order.items) ? order.items : [];
  const names: string[] = [];
  for (const it of items) {
    const row = asRecord(it);
    if (!row) continue;
    const n =
      row.displayName ??
      row.medicationName ??
      row.medicationLabelSnapshot ??
      row.manualLabel ??
      row.name ??
      row.label ??
      row.catalogName ??
      row.description ??
      row.notes;
    if (typeof n === "string" && n.trim()) names.push(n.trim());
  }
  if (names.length) return names.join(", ");
  if (typeof order.notes === "string" && order.notes.trim()) return order.notes.trim();
  const typ = displayOrDash(order.type ?? order.orderType, dash);
  const route = items.length ? asRecord(items[0])?.route : null;
  if (typeof route === "string" && route.trim() && typ !== dash) return `${typ} (${route.trim()})`;
  return typ;
}

export function InpatientEncounterMedicalRecordSummaryView({
  encounterId,
  facilityId,
  encounter,
  room,
  admittedAt,
  attendingName,
  assignedRnName,
  codeStatus,
  isolation,
  admissionDiagnosis,
  onNavigateSection,
}: Props) {
  const { t, language } = useI18n();
  const { facilities, careProfileJson } = useFacilityAndRoles();
  const dash = t("common.dash");
  const [printBusy, setPrintBusy] = useState(false);
  const [nursingAdmission, setNursingAdmission] =
    useState<NursingAdmissionMedicalRecordProjectionV1 | null>(null);
  const [carePlanProjection, setCarePlanProjection] =
    useState<EncounterCarePlanMedicalRecordProjectionV1>({
      availability: "EMPTY",
      currentPlans: [],
      completedDiscontinuedPlans: [],
      historicalLegacy: [],
    });
  const [nursingAssessment, setNursingAssessment] = useState<string | null>(null);
  const [providerLines, setProviderLines] = useState<string[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [marLines, setMarLines] = useState<string[]>([]);
  const [ioLine, setIoLine] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [vitalsSnaps, setVitalsSnaps] = useState<PatientTriageVitalsSnapshot[]>([]);
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);

  const patientId = encounter?.patient?.id ?? "";
  const patientName = [encounter?.patient?.firstName, encounter?.patient?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(false);
      try {
        const [
          admissionSettled,
          nursingSettled,
          providerSettled,
          synSettled,
          ordersSettled,
          marSettled,
          vitalsSettled,
          triageSettled,
          carePlansSettled,
        ] = await Promise.allSettled([
          fetchNursingAdmissionDocumentation(encounterId),
          apiFetch(
            `/encounters/${encodeURIComponent(encounterId)}/inpatient-nursing-assessment-events`,
            { facilityId },
          ),
          fetchProviderWorkspace(encounterId),
          fetchProviderClinicalSynthesis(encounterId),
          fetchOrdersForEncounter(facilityId, encounterId),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/medication-administrations`, {
            facilityId,
          }),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/vitals-history`, { facilityId }),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/triage`, { facilityId }),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/care-plans`, { facilityId }),
        ]);
        if (cancelled) return;

        if (admissionSettled.status === "fulfilled") {
          const documentation = (
            admissionSettled.value as unknown as { documentation?: MedSurgNursingAdmissionDocV1 }
          )?.documentation;
          setNursingAdmission(projectNursingAdmissionMedicalRecord(documentation ?? null));
        }

        if (carePlansSettled.status === "fulfilled") {
          const payload = asRecord(carePlansSettled.value);
          const plans = Array.isArray(payload?.plans) ? payload!.plans : [];
          const legacyRaw = Array.isArray(payload?.legacyReadOnly)
            ? payload!.legacyReadOnly
            : Array.isArray(payload?.legacyReadOnly)
              ? payload!.legacyReadOnly
              : [];
          const legacyItems = legacyRaw.map((row: unknown) => {
            const rec = asRecord(row);
            const item = asRecord(rec?.item) ?? rec;
            return {
              discipline: typeof item?.discipline === "string" ? item.discipline : null,
              goalText: typeof item?.goalText === "string" ? item.goalText : null,
              createdAt:
                typeof item?.createdAt === "string"
                  ? item.createdAt
                  : typeof item?.documentedAt === "string"
                    ? item.documentedAt
                    : null,
            };
          });
          // Single aggregate GET → one medical-record projection (Summary + Print).
          setCarePlanProjection(
            projectEncounterCarePlanMedicalRecord({
              plans: plans as Parameters<typeof projectEncounterCarePlanMedicalRecord>[0]["plans"],
              legacyItems,
            })
          );
        } else {
          setCarePlanProjection({
            availability: "EMPTY",
            currentPlans: [],
            completedDiscontinuedPlans: [],
            historicalLegacy: [],
          });
        }

        if (nursingSettled.status === "fulfilled") {
          const raw = nursingSettled.value;
          const entries = Array.isArray(asRecord(raw)?.entries)
            ? (asRecord(raw)?.entries as Array<{ assessment?: InpatientNursingAssessmentV1 }>)
            : [];
          // Event payload: `{ assessment: InpatientNursingAssessmentV1 }` (no nested `.assessment`).
          const latest = entries.at(-1)?.assessment ?? null;
          const ov = latest ? projectInpatientNursingAssessmentOverview(latest) : null;
          if (ov) {
            setNursingAssessment(
              [
                ov.assessmentType,
                ov.status,
                ov.mentalStatus,
                ov.narrativeExcerpt,
                ov.rn.displayName,
                ov.rn.role,
                ov.lastAssessmentAt,
              ]
                .filter((x) => x != null && String(x).trim())
                .map((x) => humanizeClinicalLabel(String(x)))
                .join(" · ") || null
            );
          } else {
            setNursingAssessment(null);
          }
        }

        const providerLinesAcc: string[] = [];
        if (providerSettled.status === "fulfilled") {
          const doc = asRecord(providerSettled.value.documentation);
          const hp = asRecord(doc?.hpDraft);
          if (hp) {
            const status = displayOrDash(hp.status, dash);
            providerLinesAcc.push(
              `${t("inpatientMedicalRecordSummaryInp2f.sections.provider")}: ${humanizeClinicalLabel(status)}`
            );
          }
          const notes = Array.isArray(doc?.progressNotes) ? doc!.progressNotes : [];
          for (const n of notes as Array<Record<string, unknown>>) {
            const text = typeof n.text === "string" ? n.text.trim() : "";
            if (!text) continue;
            const st = humanizeClinicalLabel(String(n.status ?? ""));
            providerLinesAcc.push(`${st}: ${text.slice(0, 240)}`);
          }
        }
        setProviderLines(providerLinesAcc);

        if (synSettled.status === "fulfilled") {
          const syn = asRecord(asRecord(synSettled.value)?.synthesis);
          const io = asRecord(syn?.intakeOutput);
          if (io && io.documentationPresent) {
            setIoLine(
              [
                io.intake24hMl != null ? `In ${io.intake24hMl} mL` : null,
                io.output24hMl != null ? `Out ${io.output24hMl} mL` : null,
                io.balance24hMl != null ? `Net ${io.balance24hMl} mL` : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
            );
          } else {
            setIoLine(null);
          }
          const ev = Array.isArray(syn?.events) ? syn!.events : [];
          setEvents(
            (ev as Array<Record<string, unknown>>).map((e) => {
              const summary = displayOrDash(e.summary, dash);
              const at = displayOrDash(e.occurredAt, dash);
              return `${humanizeClinicalLabel(String(e.type ?? ""))} · ${at} · ${summary}`;
            })
          );
        }

        if (ordersSettled.status === "fulfilled") {
          const items = Array.isArray(ordersSettled.value)
            ? (ordersSettled.value as Array<Record<string, unknown>>)
            : [];
          setOrders(items);
        }

        if (marSettled.status === "fulfilled") {
          const rows = Array.isArray(marSettled.value)
            ? marSettled.value
            : Array.isArray(asRecord(marSettled.value)?.items)
              ? (asRecord(marSettled.value)?.items as unknown[])
              : [];
          setMarLines(
            (rows as Array<Record<string, unknown>>).map((row) => {
              const adminBy = asRecord(row.administeredBy);
              const byFromUser =
                adminBy &&
                [adminBy.firstName, adminBy.lastName]
                  .filter((x) => typeof x === "string" && String(x).trim())
                  .join(" ")
                  .trim();
              const name = displayOrDash(
                row.medicationLabelSnapshot ??
                  row.medicationName ??
                  row.displayName ??
                  row.drug,
                dash
              );
              const at = displayOrDash(
                row.effectiveAdministeredAt ?? row.administeredAt ?? row.clinicalTime,
                dash
              );
              const by = displayOrDash(
                row.administeredByDisplayName ?? row.performerDisplayName ?? byFromUser,
                dash
              );
              return `${name} · ${at} · ${by}`;
            })
          );
        }

        if (vitalsSettled.status === "fulfilled") {
          const parsed = parseVitalsHistoryEntries(vitalsSettled.value);
          setVitalsSnaps(
            parsed.map((entry, idx) => ({
              encounterId,
              encounterType: "INPATIENT",
              triageId: `vh-${idx}-${entry.recordedAt}`,
              vitalsJson: entry.vitals as Record<string, unknown>,
              updatedAt: entry.recordedAt,
              triageCompleteAt: entry.recordedAt,
              measuredAt: entry.recordedAt,
            }))
          );
        }

        if (triageSettled.status === "fulfilled") {
          setTriage(asRecord(triageSettled.value));
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [dash, encounterId, facilityId, t]);

  const vitalReadings = useMemo(
    () => snapshotsToVitalSummaryReadings(vitalsSnaps, language, t),
    [language, t, vitalsSnaps]
  );

  const facilityIdentity = useMemo(() => {
    const fac = facilities.find((f) => f.id === facilityId);
    return buildRxPrintFacilityIdentity({
      facilityName: fac?.name ?? null,
      careProfileJson: fac?.careProfileJson ?? careProfileJson,
    });
  }, [careProfileJson, facilities, facilityId]);

  const printChart = useCallback(async () => {
    if (!encounter) return;
    setPrintBusy(true);
    try {
      const nursingBody =
        nursingAdmission && nursingAdmission.availability === "READY"
          ? `<dl>${nursingAdmission.rows
              .map(
                (r) =>
                  `<div><dt>${escHtml(t(`inpatientNursingAdmissionInp2g.record.${r.fieldKey}`))}</dt><dd>${escHtml(
                    humanizeClinicalLabel(r.value)
                  )}</dd></div>`
              )
              .join("")}${nursingAdmissionAttributionHtml(nursingAdmission, t, language)}</dl>`
          : `<p>${escHtml(t("inpatientMedicalRecordSummaryInp2f.empty"))}</p>`;

      const formatCarePlanDt = (iso: string | null) => {
        if (!iso) return "";
        try {
          return new Date(iso).toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          });
        } catch {
          return iso;
        }
      };

      const carePlanBody = buildCarePlanMedicalRecordPrintHtml({
        projection: carePlanProjection,
        t,
        formatDateTime: formatCarePlanDt,
        emptyLabel: t("inpatientMedicalRecordSummaryInp2f.empty"),
      });

      await printEncounterChartLivePreview({
        encounter: encounter as unknown as Record<string, unknown>,
        triage,
        orders,
        facilityId,
        facilityName: facilityIdentity.name,
        facilityIdentity,
        language,
        legalMedicalRecord: true,
        supplementalPrintSections: [
          {
            title: t("inpatientMedicalRecordSummaryInp2f.sections.nursingAdmission"),
            bodyHtml: nursingBody,
          },
          {
            title: t("inpatientMedicalRecordSummaryInp2f.sections.carePlan"),
            bodyHtml: carePlanBody,
          },
        ],
      });
    } finally {
      setPrintBusy(false);
    }
  }, [
    carePlanProjection,
    encounter,
    facilityId,
    facilityIdentity,
    language,
    nursingAdmission,
    orders,
    t,
    triage,
  ]);

  const medOrders = orders.filter((o) => {
    const typ = String(o.type ?? o.orderType ?? "").toUpperCase();
    return typ.includes("MED") || typ.includes("RX") || typ.includes("PHARM");
  });

  return (
    <div data-testid="inpatient-panel-summary-live" data-readonly="true">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16 }}>{t("inpatientMedicalRecordSummaryInp2f.title")}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientMedicalRecordSummaryInp2f.subtitle")}
          </p>
        </div>
        <button
          type="button"
          data-testid="inpatient-summary-print-entire-chart"
          onClick={() => void printChart()}
          disabled={printBusy}
          className="no-print"
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 600,
            cursor: printBusy ? "wait" : "pointer",
          }}
        >
          {printBusy
            ? t("inpatientMedicalRecordSummaryInp2f.printing")
            : t("inpatientMedicalRecordSummaryInp2f.printEntireChart")}
        </button>
      </div>
      {loadError ? (
        <p style={{ color: "#9a3412", fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.unavailable")}</p>
      ) : null}

      <section style={card} data-testid="summary-demographics">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.demographics")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(patientName, dash)} · {t("inpatientProviderD4a26.header.dob")}{" "}
          {displayOrDash(encounter?.patient?.dob, dash)} · MRN{" "}
          {displayOrDash(encounter?.patient?.mrn, dash)}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.facility")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(facilityIdentity.name, dash)} · {displayOrDash(admittedAt, dash)} ·{" "}
          {displayOrDash(room, dash)} · {displayOrDash(admissionDiagnosis, dash)}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.careTeam")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {displayOrDash(attendingName, dash)}
          {assignedRnName ? ` · RN ${assignedRnName}` : ""}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.codeStatus")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {codeStatus ? humanizeClinicalLabel(codeStatus) : t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.isolation")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {isolation?.length
            ? isolation.map((x) => humanizeClinicalLabel(x)).join(", ")
            : t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card} data-testid="summary-nursing-admission">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.nursingAdmission")}
        </h2>
        {!nursingAdmission || nursingAdmission.availability === "EMPTY" ? (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        ) : (
          <dl
            data-testid="summary-nursing-admission-structured"
            style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}
          >
            {nursingAdmission.rows.map((row) => (
              <div
                key={row.fieldKey}
                style={{ display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr", gap: 8 }}
              >
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>
                  {t(`inpatientNursingAdmissionInp2g.record.${row.fieldKey}`)}
                </dt>
                <dd style={{ margin: 0 }}>{humanizeClinicalLabel(row.value)}</dd>
              </div>
            ))}
            {formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.completed) ? (
              <div
                data-testid="summary-nursing-admission-completed-by"
                style={{ display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr", gap: 8 }}
              >
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>
                  {t("inpatientNursingAdmissionInp2g.record.completedBy")}
                </dt>
                <dd style={{ margin: 0 }}>
                  {formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.completed)}
                  {nursingAdmission.attribution.completed.atIso
                    ? ` · ${formatSummaryClinicalDateTime(
                        nursingAdmission.attribution.completed.atIso,
                        language
                      )}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.signed) ? (
              <div
                data-testid="summary-nursing-admission-signed-by"
                style={{ display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr", gap: 8 }}
              >
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>
                  {t("inpatientNursingAdmissionInp2g.record.signedBy")}
                </dt>
                <dd style={{ margin: 0 }}>
                  {formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.signed)}
                  {nursingAdmission.attribution.signed.atIso
                    ? ` · ${formatSummaryClinicalDateTime(
                        nursingAdmission.attribution.signed.atIso,
                        language
                      )}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {nursingAdmission.attribution.latestCorrection &&
            formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.latestCorrection) ? (
              <div
                data-testid="summary-nursing-admission-corrected-by"
                style={{ display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr", gap: 8 }}
              >
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>
                  {t("inpatientNursingAdmissionInp2g.record.correctedBy")}
                </dt>
                <dd style={{ margin: 0 }}>
                  {formatNursingAdmissionAttributionClinician(nursingAdmission.attribution.latestCorrection)}
                  {nursingAdmission.attribution.latestCorrection.atIso
                    ? ` · ${formatSummaryClinicalDateTime(
                        nursingAdmission.attribution.latestCorrection.atIso,
                        language
                      )}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {nursingAdmission.amendments.length > 0 ? (
              <div>
                <dt style={{ margin: "0 0 4px", color: "#64748b", fontWeight: 600 }}>
                  {t("inpatientNursingAdmissionInp2g.record.amendments")}
                </dt>
                <dd style={{ margin: 0 }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {nursingAdmission.amendments.map((a, i) => (
                      <li key={`${a.createdAt}-${i}`}>
                        {[a.type, a.sectionId, a.reason, a.createdAt].filter(Boolean).join(" · ")}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("admission")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-care-plan">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.carePlan")}
        </h2>
        {carePlanProjection.availability === "EMPTY" ? (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        ) : (
          <div data-testid="summary-care-plan-list" style={{ display: "grid", gap: 14 }}>
            {carePlanProjection.currentPlans.length ? (
              <div data-testid="summary-care-plan-current">
                <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
                  {t("inpatientMedicalRecordSummaryInp2f.carePlan.currentPlans")}
                </h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {carePlanProjection.currentPlans.map((plan) => (
                    <CarePlanMedicalRecordCard
                      key={plan.planId}
                      plan={plan}
                      language={language}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {carePlanProjection.completedDiscontinuedPlans.length ? (
              <div data-testid="summary-care-plan-completed">
                <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
                  {t("inpatientMedicalRecordSummaryInp2f.carePlan.completedDiscontinuedPlans")}
                </h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {carePlanProjection.completedDiscontinuedPlans.map((plan) => (
                    <CarePlanMedicalRecordCard
                      key={plan.planId}
                      plan={plan}
                      language={language}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {carePlanProjection.historicalLegacy.length ? (
              <div data-testid="summary-care-plan-historical">
                <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>
                  {t("inpatientMedicalRecordSummaryInp2f.carePlan.historical")}
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                  {carePlanProjection.historicalLegacy.map((item, idx) => (
                    <li key={`legacy-${idx}`}>
                      {[item.goalText, resolveCarePlanDisciplineLabel(item.discipline, t)]
                        .filter(Boolean)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("carePlan")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-nursing-assessment">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.nursingAssessment")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {nursingAssessment ?? t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("nursing")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-vitals">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.vitals")}
        </h2>
        {vitalReadings.length ? (
          <VitalSummaryPanel readings={vitalReadings} actionsEnabled={false} />
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-provider">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.provider")}
        </h2>
        {providerLines.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {providerLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-orders">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.orders")}
        </h2>
        {orders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {orders.slice(0, 40).map((o, i) => (
              <li key={typeof o.id === "string" ? o.id : i}>
                {orderSummaryLabel(o, dash)} · {humanizeClinicalLabel(String(o.status ?? ""))}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("orders")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.medications")}
        </h2>
        {medOrders.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {medOrders.slice(0, 40).map((o, i) => (
              <li key={typeof o.id === "string" ? o.id : i}>{orderSummaryLabel(o, dash)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      <section style={card} data-testid="summary-mar">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.mar")}
        </h2>
        {marLines.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {marLines.slice(0, 80).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
        <button type="button" className="no-print" onClick={() => onNavigateSection?.("medications")}>
          {t("inpatientMedicalRecordSummaryInp2f.openSource")}
        </button>
      </section>

      <section style={card} data-testid="summary-results">
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.results")}
        </h2>
        <EmergencyResultsPanel
          encounterId={encounterId}
          facilityId={facilityId}
          refreshToken={0}
          canAcknowledgeResults={false}
          patient={
            encounter?.patient
              ? {
                  firstName: encounter.patient.firstName ?? null,
                  lastName: encounter.patient.lastName ?? null,
                  mrn: encounter.patient.mrn ?? null,
                  dob:
                    encounter.patient.dob instanceof Date
                      ? encounter.patient.dob.toISOString()
                      : (encounter.patient.dob ?? null),
                  sexAtBirth: encounter.patient.sexAtBirth ?? null,
                }
              : null
          }
          encounterMeta={{
            id: encounterId,
            createdAt: new Date().toISOString(),
          }}
        />
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.intakeOutput")}
        </h2>
        <p style={{ margin: 0, fontSize: 13 }}>
          {ioLine ?? t("inpatientMedicalRecordSummaryInp2f.empty")}
        </p>
      </section>

      <section style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>
          {t("inpatientMedicalRecordSummaryInp2f.sections.events")}
        </h2>
        {events.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {events.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13 }}>{t("inpatientMedicalRecordSummaryInp2f.empty")}</p>
        )}
      </section>

      {patientId ? <span data-testid="summary-patient-id-hidden" hidden>{patientId}</span> : null}
    </div>
  );
}

function formatMrDateTime(iso: string | null, language: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function CarePlanMedicalRecordCard({
  plan,
  language,
  t,
}: {
  plan: import("@medora/shared").CarePlanMedicalRecordPlanV1;
  language: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const formatDt = (iso: string | null) => formatMrDateTime(iso, language);
  const title = resolveCarePlanPlanTitle(plan, t);
  const status = resolveCarePlanStatusLabel(plan.status, t);
  const contributors = plan.contributors
    .map((d) => resolveCarePlanDisciplineLabel(d, t) ?? d)
    .filter(Boolean)
    .join(" · ");
  const goalsOutcomes = [...plan.goals, ...plan.outcomes];

  return (
    <article
      data-testid={`summary-care-plan-${plan.planId}`}
      style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" }}
    >
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
        {t("inpatientMedicalRecordSummaryInp2f.carePlan.statusLabel")}: {status}
      </div>
      {plan.activatedAt ? (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {formatCarePlanClinicianAttribution({
            documentedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy"),
            reviewedByLabel: t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy"),
            activatedByLabel: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.activatedBy"),
            clinician: plan.activatedBy,
            at: formatDt(plan.activatedAt),
            mode: "activated",
            attributionUnavailableLabel: t(
              "inpatientNursingAdmissionInp2g.carePlanWorkspace.attributionUnavailable"
            ),
          })}
        </div>
      ) : null}
      {plan.lastReviewedAt ? (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {t("inpatientMedicalRecordSummaryInp2f.carePlan.lastReviewed")}: {formatDt(plan.lastReviewedAt)}
        </div>
      ) : null}
      {contributors ? (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {t("inpatientMedicalRecordSummaryInp2f.carePlan.contributors")}: {contributors}
        </div>
      ) : null}

      {goalsOutcomes.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.goalsOutcomes")}
          </div>
          {goalsOutcomes.map((g, i) => (
            <div key={`g-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{g.text || g.title}</div>
              {g.status ? (
                <div style={{ color: "#64748b" }}>{resolveCarePlanStatusLabel(g.status, t)}</div>
              ) : null}
              <div style={{ color: "#64748b" }}>{formatCarePlanDocumentedLine(g, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {plan.interventions.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.interventions")}
          </div>
          {plan.interventions.map((item, i) => (
            <div key={`i-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{item.text || item.title}</div>
              {item.discipline ? (
                <div style={{ color: "#64748b" }}>
                  {resolveCarePlanDisciplineLabel(item.discipline, t)}
                </div>
              ) : null}
              <div style={{ color: "#64748b" }}>{formatCarePlanDocumentedLine(item, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {plan.monitoring.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.monitoring")}
          </div>
          {plan.monitoring.map((item, i) => (
            <div key={`m-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{item.text || item.title}</div>
              <div style={{ color: "#64748b" }}>{formatCarePlanDocumentedLine(item, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {plan.education.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.education")}
          </div>
          {plan.education.map((item, i) => (
            <div key={`e-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{item.text || item.title}</div>
              <div style={{ color: "#64748b" }}>{formatCarePlanDocumentedLine(item, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {plan.progress.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.progress")}
          </div>
          {plan.progress.map((p, i) => (
            <div key={`p-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{p.narrative}</div>
              <div style={{ color: "#64748b" }}>{formatCarePlanDocumentedLine(p, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {plan.reviews.length ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {t("inpatientMedicalRecordSummaryInp2f.carePlan.reviews")}
          </div>
          {plan.reviews.map((r, i) => (
            <div key={`r-${i}`} style={{ fontSize: 12, marginTop: 4 }}>
              <div>{r.narrative ?? r.reviewStatus ?? ""}</div>
              <div style={{ color: "#64748b" }}>{formatCarePlanReviewedLine(r, t, formatDt)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
