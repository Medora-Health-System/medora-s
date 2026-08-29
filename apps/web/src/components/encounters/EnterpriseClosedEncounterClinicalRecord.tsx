"use client";

/**
 * MEDUI.D4C.8B — Enterprise closed-encounter clinical record composition.
 * Encounter-scoped, read-only, human-readable. No patient chart aggregate fetch. No mutation controls.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { D4C8B_CERTIFICATION_ID, formatToothDisplayLabel, getCanonicalTooth } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import {
  parseDischargeSummaryForChart,
  parseNursingAssessmentSectionsForChart,
  parsePhysicianEvalV1ForChart,
  nursingAssessmentSignatureForLocale,
  providerDocumentationWorkspaceSignatureForLocale,
  DISCHARGE_SUMMARY_CORE_STRING_KEYS,
  PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS,
} from "@/components/patient-chart/patientChartHelpers";
import { parseEncounterDiagnosisApiItems } from "@/features/emergency/encounterClinicalRecordAdapter";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import {
  formatEncounterChromeDateTime,
  tOrderItemStatusForWorklist,
} from "@/lib/encounterChromeI18n";
import { parseVitalsHistoryEntries, type VitalsHistoryEntry } from "@/lib/encounterClinicalSafetyUi";
import { useI18n } from "@/lib/i18n";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import {
  formatHeightDualLine,
  formatTemperatureDualLine,
  formatWeightDualLine,
} from "@/lib/patientVitals";
import { formatOxygenSupportCompact } from "@/lib/vitalsMeasurementContextDisplay";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type EncounterLike = {
  id: string;
  status?: string | null;
  type?: string | null;
  chiefComplaint?: string | null;
  visitReason?: string | null;
  triageAcuity?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  providerAddenda?: Array<{
    id: string;
    text: string;
    createdAt: string;
    createdByDisplayFr?: string | null;
  }>;
  patient?: { id?: string | null } | null;
};

type OrderItemLike = {
  id: string;
  status?: string;
  catalogItemType?: string;
  displayLabel?: string;
  displayLabelFr?: string;
  displayLabelEn?: string;
  medicationFulfillmentIntent?: string | null;
  result?: {
    resultText?: string | null;
    verifiedAt?: string | null;
    effectiveResultedAt?: string | null;
    effectiveResultedAtVersion?: number;
    effectiveFinalizedAt?: string | null;
    effectiveFinalizedAtVersion?: number;
    criticalValue?: boolean | null;
    resultData?: unknown;
    enteredByDisplayFr?: string | null;
    acknowledgedByDisplayFr?: string | null;
    acknowledgedByProviderAt?: string | null;
  } | null;
};

type OrderLike = {
  id: string;
  type?: string;
  status?: string;
  createdAt?: string;
  orderedByDisplayFr?: string | null;
  items?: OrderItemLike[];
};

type MarRow = {
  id: string;
  administeredAt?: string | null;
  marAction?: string | null;
  action?: string | null;
  notes?: string | null;
  doseText?: string | null;
  route?: string | null;
  administeredByDisplayFr?: string | null;
  orderItem?: {
    displayLabel?: string;
    displayLabelFr?: string;
    displayLabelEn?: string;
  } | null;
};

type Props = {
  facilityId: string;
  encounter: EncounterLike;
};

function SectionShell(props: { title: string; testId: string; children: ReactNode }) {
  return (
    <section data-testid={props.testId} style={{ ...MEDORA_CARD_SHELL, padding: 16, marginTop: 14 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{text}</p>;
}

function FieldList({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;
  return (
    <dl style={{ margin: 0, display: "grid", gap: 8 }}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#64748b" }}>{row.label}</dt>
          <dd
            style={{
              margin: "2px 0 0",
              fontSize: 14,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
              lineHeight: 1.45,
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function vitalCell(v: Record<string, unknown>, key: string): string {
  const raw = v[key];
  if (raw == null || raw === "") return "—";
  return String(raw);
}

function formatBp(v: Record<string, unknown>): string {
  const sys = v.bpSys;
  const dia = v.bpDia;
  if (sys == null || dia == null || sys === "" || dia === "") return "—";
  return `${sys}/${dia}`;
}

function formatTemp(v: Record<string, unknown>, language: "en" | "fr"): string {
  const raw = v.tempC;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return "—";
  return formatTemperatureDualLine(n, language);
}

function formatWeight(v: Record<string, unknown>, language: "en" | "fr"): string {
  const raw = v.weightKg;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return "—";
  return formatWeightDualLine(n, language);
}

function formatHeight(v: Record<string, unknown>, language: "en" | "fr"): string {
  const raw = v.heightCm;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return "—";
  return formatHeightDualLine(n, language);
}

function painFromVitals(v: Record<string, unknown>): string {
  for (const key of ["painScore", "pain", "painLevel"] as const) {
    const raw = v[key];
    if (raw == null || raw === "") continue;
    return String(raw);
  }
  return "—";
}

function flattenOrderItems(orders: OrderLike[]): Array<OrderItemLike & { order: OrderLike }> {
  const out: Array<OrderItemLike & { order: OrderLike }> = [];
  for (const order of orders) {
    for (const item of order.items ?? []) {
      out.push({ ...item, order });
    }
  }
  return out;
}

function dischargeLabelKey(key: string): string {
  return `enterpriseClosedClinicalRecordD4c8b.discharge.fields.${key}`;
}

/**
 * INP.PROV.1B — project durable inpatientProviderWorkspaceV1 signed notes into closed record.
 * Same JSON authority as the documentation workspace / Summary — read-only, no copy store.
 */
function projectInpatientProviderWorkspaceForClosedRecord(
  admissionSummaryJson: unknown,
  language: string
): Array<{ label: string; text: string }> {
  const root =
    admissionSummaryJson && typeof admissionSummaryJson === "object" && !Array.isArray(admissionSummaryJson)
      ? (admissionSummaryJson as Record<string, unknown>)
      : null;
  const ws =
    root?.inpatientProviderWorkspaceV1 &&
    typeof root.inpatientProviderWorkspaceV1 === "object" &&
    !Array.isArray(root.inpatientProviderWorkspaceV1)
      ? (root.inpatientProviderWorkspaceV1 as Record<string, unknown>)
      : null;
  if (!ws) return [];

  const out: Array<{ label: string; text: string }> = [];
  const hp = ws.hpDraft && typeof ws.hpDraft === "object" ? (ws.hpDraft as Record<string, unknown>) : null;
  if (hp && String(hp.status ?? "").toUpperCase() === "SIGNED") {
    const sections =
      hp.sections && typeof hp.sections === "object" && !Array.isArray(hp.sections)
        ? (hp.sections as Record<string, { text?: string | null }>)
        : {};
    const parts: string[] = [];
    for (const [key, val] of Object.entries(sections)) {
      const text = String(val?.text ?? "").trim();
      if (text) parts.push(`${key.replace(/_/g, " ")}\n${text}`);
    }
    if (parts.length) {
      out.push({
        label: language === "fr" ? "H&P (hospitalisation)" : "H&P (inpatient)",
        text: parts.join("\n\n"),
      });
    }
  }

  const notes = Array.isArray(ws.progressNotes) ? ws.progressNotes : [];
  for (const raw of notes) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    const status = String(n.status ?? "").toUpperCase();
    if (status !== "SIGNED" && status !== "CORRECTED" && status !== "AMENDED") continue;
    const text = String(n.text ?? "").trim();
    if (!text) continue;
    const when = String(n.signedAt ?? n.serviceDate ?? "").trim();
    out.push({
      label:
        language === "fr"
          ? `Note d’évolution${when ? ` · ${when}` : ""}`
          : `Progress note${when ? ` · ${when}` : ""}`,
      text,
    });
  }
  return out;
}

export function EnterpriseClosedEncounterClinicalRecord({ facilityId, encounter }: Props) {
  const { t, language } = useI18n();
  const encounterId = encounter.id;
  const patientId = encounter.patient?.id ?? null;

  const [vitals, setVitals] = useState<VitalsHistoryEntry[]>([]);
  const [orders, setOrders] = useState<OrderLike[]>([]);
  const [marRows, setMarRows] = useState<MarRow[]>([]);
  const [diagnoses, setDiagnoses] = useState<
    Array<{ id: string; code: string; description: string | null; sortOrder: number }>
  >([]);
  const [dentalFindings, setDentalFindings] = useState<
    Array<{
      id: string;
      toothCode: string;
      findingType: string;
      surfaces: string[];
      clinicalState: string;
      documentedAt: string;
      documentedByDisplay?: string | null;
    }>
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [vitalsRaw, ordersRaw, marRaw, dxRaw, odontogramRaw] = await Promise.all([
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/vitals-history`, { facilityId }).catch(
            () => null
          ),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/orders`, { facilityId }).catch(() => []),
          apiFetch(`/encounters/${encodeURIComponent(encounterId)}/medication-administrations`, {
            facilityId,
          }).catch(() => []),
          patientId
            ? apiFetch(`/patients/${encodeURIComponent(patientId)}/diagnoses?limit=200`, {
                facilityId,
              }).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
          apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/odontogram`, {
            facilityId,
          }).catch(() => null),
        ]);
        if (cancelled) return;
        setVitals(parseVitalsHistoryEntries(vitalsRaw));
        setOrders(Array.isArray(ordersRaw) ? (ordersRaw as OrderLike[]) : []);
        setMarRows(Array.isArray(marRaw) ? (marRaw as MarRow[]) : []);
        setDiagnoses(
          parseEncounterDiagnosisApiItems(dxRaw, encounterId).map((d) => ({
            id: d.id,
            code: d.code,
            description: d.description ?? null,
            sortOrder: d.sortOrder ?? 0,
          }))
        );
        const encFindings = Array.isArray(odontogramRaw?.encounterFindings)
          ? odontogramRaw.encounterFindings
          : [];
        setDentalFindings(
          encFindings
            .filter((f: { voidedAt?: string | null; clinicalState?: string }) => !f.voidedAt && f.clinicalState !== "VOIDED")
            .map(
              (f: {
                id: string;
                toothCode: string;
                findingType: string;
                surfaces?: string[];
                clinicalState: string;
                documentedAt: string;
                documentedByDisplay?: string | null;
              }) => ({
                id: f.id,
                toothCode: f.toothCode,
                findingType: f.findingType,
                surfaces: f.surfaces ?? [],
                clinicalState: f.clinicalState,
                documentedAt: f.documentedAt,
                documentedByDisplay: f.documentedByDisplay ?? null,
              })
            )
        );
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
            t("enterpriseClosedClinicalRecordD4c8b.loadError")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, patientId, language, t]);

  const nursingSections = useMemo(
    () => parseNursingAssessmentSectionsForChart(encounter.nursingAssessment, language),
    [encounter.nursingAssessment, language]
  );
  const providerSections = useMemo(() => {
    const fromMse = parsePhysicianEvalV1ForChart(encounter.nursingAssessment, language);
    const fromInpatient = projectInpatientProviderWorkspaceForClosedRecord(
      encounter.admissionSummaryJson,
      language
    );
    return [...fromMse, ...fromInpatient];
  }, [encounter.nursingAssessment, encounter.admissionSummaryJson, language]);
  const nursingSig = nursingAssessmentSignatureForLocale(encounter.nursingAssessment, language, t);
  const providerWorkspaceSig = providerDocumentationWorkspaceSignatureForLocale(
    encounter.nursingAssessment,
    language,
    t
  );
  const discharge = useMemo(
    () => parseDischargeSummaryForChart(encounter.dischargeSummaryJson),
    [encounter.dischargeSummaryJson]
  );

  const allItems = useMemo(() => flattenOrderItems(orders), [orders]);
  const resultItems = useMemo(
    () =>
      allItems.filter(
        (it) =>
          (Boolean(it.result?.resultText) ||
            it.status === "RESULTED" ||
            it.status === "VERIFIED") &&
          (it.catalogItemType === "LAB_TEST" || it.catalogItemType === "IMAGING_STUDY")
      ),
    [allItems]
  );
  const procedureItems = useMemo(
    () =>
      allItems.filter(
        (it) => it.catalogItemType === "CARE" || String(it.order.type ?? "").toUpperCase() === "CARE"
      ),
    [allItems]
  );
  const medicationOrderItems = useMemo(
    () =>
      allItems.filter(
        (it) =>
          it.catalogItemType === "MEDICATION" ||
          String(it.order.type ?? "").toUpperCase() === "MEDICATION"
      ),
    [allItems]
  );

  const dischargeRows = useMemo(() => {
    if (!discharge) return [];
    const keys = [...DISCHARGE_SUMMARY_CORE_STRING_KEYS, ...PATIENT_DISCHARGE_INSTRUCTION_STRING_KEYS];
    const rows: Array<{ label: string; value: string }> = [];
    for (const key of keys) {
      const value = (discharge as Record<string, string | undefined>)[key];
      if (!value || !String(value).trim()) continue;
      const labelKey = dischargeLabelKey(key);
      const label = t(labelKey);
      rows.push({ label: label === labelKey ? key : label, value: String(value).trim() });
    }
    return rows;
  }, [discharge, t]);

  const signedStatus = String(encounter.providerDocumentationStatus ?? "").toUpperCase();
  const overviewRows = [
    {
      label: t("enterpriseClosedClinicalRecordD4c8b.overview.chiefComplaint"),
      value:
        (encounter.chiefComplaint ?? "").trim() ||
        (encounter.visitReason ?? "").trim() ||
        t("enterpriseClosedClinicalRecordD4c8b.notDocumented"),
    },
    ...(encounter.triageAcuity
      ? [
          {
            label: t("enterpriseClosedClinicalRecordD4c8b.overview.acuity"),
            value: String(encounter.triageAcuity),
          },
        ]
      : []),
    {
      label: t("enterpriseClosedClinicalRecordD4c8b.overview.providerDocStatus"),
      value:
        signedStatus === "SIGNED"
          ? t("enterpriseClosedClinicalRecordD4c8b.overview.signed")
          : signedStatus
            ? signedStatus
            : t("enterpriseClosedClinicalRecordD4c8b.notDocumented"),
    },
    ...(encounter.providerDocumentationSignedAt
      ? [
          {
            label: t("enterpriseClosedClinicalRecordD4c8b.overview.signedAt"),
            value: formatEncounterChromeDateTime(encounter.providerDocumentationSignedAt, language),
          },
        ]
      : []),
    ...(encounter.providerDocumentationSignedByDisplayFr
      ? [
          {
            label: t("enterpriseClosedClinicalRecordD4c8b.overview.signedBy"),
            value: encounter.providerDocumentationSignedByDisplayFr,
          },
        ]
      : []),
  ];

  const sortedVitals = useMemo(
    () => [...vitals].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    [vitals]
  );
  const sortedDx = useMemo(() => [...diagnoses].sort((a, b) => a.sortOrder - b.sortOrder), [diagnoses]);
  const addenda = encounter.providerAddenda ?? [];

  return (
    <div
      data-testid="enterprise-closed-clinical-record"
      data-certification-id={D4C8B_CERTIFICATION_ID}
      data-read-only="true"
    >
      {loading ? (
        <p style={{ margin: "14px 0 0", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : null}
      {loadError ? (
        <p role="alert" style={{ margin: "14px 0 0", fontSize: 13, color: "#b91c1c" }}>
          {loadError}
        </p>
      ) : null}

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.overview")}
        testId="closed-record-overview"
      >
        <FieldList rows={overviewRows} />
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.vitals")}
        testId="closed-record-vitals"
      >
        {sortedVitals.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.vitals")} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["time", "bp", "hr", "rr", "temp", "spo2", "o2", "pain", "weight", "height", "by"].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e2e8f0",
                          color: "#64748b",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t(`enterpriseClosedClinicalRecordD4c8b.vitals.${col}`)}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedVitals.map((row, idx) => (
                  <tr key={`${row.recordedAt}-${idx}`} data-testid="closed-record-vital-row">
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                      {formatEncounterChromeDateTime(row.recordedAt, language)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {formatBp(row.vitals)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {vitalCell(row.vitals, "hr")}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {vitalCell(row.vitals, "rr")}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {formatTemp(row.vitals, language)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {vitalCell(row.vitals, "spo2")}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {formatOxygenSupportCompact(row.vitals, t) || "—"}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {painFromVitals(row.vitals)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {formatWeight(row.vitals, language)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {formatHeight(row.vitals, language)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {(row.recordedBy?.displayName ?? row.recordedBy?.name ?? "").trim() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.nursing")}
        testId="closed-record-nursing"
      >
        {nursingSections.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.nursing")} />
        ) : (
          <>
            <FieldList rows={nursingSections.map((s) => ({ label: s.label, value: s.text }))} />
            {nursingSig ? (
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>{nursingSig}</p>
            ) : null}
          </>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.provider")}
        testId="closed-record-provider"
      >
        {providerSections.length === 0 &&
        !(encounter.providerNote ?? "").trim() &&
        !(encounter.treatmentPlan ?? "").trim() ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.provider")} />
        ) : (
          <>
            <FieldList rows={providerSections.map((s) => ({ label: s.label, value: s.text }))} />
            {(encounter.providerNote ?? "").trim() ? (
              <div style={{ marginTop: 10 }}>
                <FieldList
                  rows={[
                    {
                      label: t("enterpriseClosedClinicalRecordD4c8b.provider.note"),
                      value: String(encounter.providerNote).trim(),
                    },
                  ]}
                />
              </div>
            ) : null}
            {(encounter.treatmentPlan ?? "").trim() ? (
              <div style={{ marginTop: 10 }}>
                <FieldList
                  rows={[
                    {
                      label: t("enterpriseClosedClinicalRecordD4c8b.provider.plan"),
                      value: String(encounter.treatmentPlan).trim(),
                    },
                  ]}
                />
              </div>
            ) : null}
            {providerWorkspaceSig ? (
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>{providerWorkspaceSig}</p>
            ) : null}
            {signedStatus === "SIGNED" ? (
              <p
                data-testid="closed-record-provider-signed"
                style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 700, color: "#0f766e" }}
              >
                {t("enterpriseClosedClinicalRecordD4c8b.overview.signed")}
                {encounter.providerDocumentationSignedByDisplayFr
                  ? ` — ${encounter.providerDocumentationSignedByDisplayFr}`
                  : ""}
                {encounter.providerDocumentationSignedAt
                  ? ` · ${formatEncounterChromeDateTime(encounter.providerDocumentationSignedAt, language)}`
                  : ""}
              </p>
            ) : null}
          </>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.diagnoses")}
        testId="closed-record-diagnoses"
      >
        {sortedDx.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.diagnoses")} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>
            {sortedDx.map((dx, i) => (
              <li key={dx.id} data-testid="closed-record-diagnosis-row">
                {i === 0 ? (
                  <strong>{t("enterpriseClosedClinicalRecordD4c8b.diagnoses.primary")} · </strong>
                ) : null}
                <strong>{dx.code}</strong>
                {dx.description ? ` — ${dx.description}` : ""}
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.orders")}
        testId="closed-record-orders"
      >
        {allItems.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.orders")} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5, color: "#0f172a" }}>
            {allItems.map((it) => (
              <li key={it.id} data-testid="closed-record-order-row">
                <strong>{getOrderItemDisplayLabelForLanguage(it, language, t)}</strong>
                {" — "}
                {tOrderItemStatusForWorklist(t, it.status ?? "")}
                {it.order.createdAt
                  ? ` · ${formatEncounterChromeDateTime(it.order.createdAt, language)}`
                  : ""}
                {it.order.orderedByDisplayFr ? ` · ${it.order.orderedByDisplayFr}` : ""}
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.medicationsMar")}
        testId="closed-record-mar"
      >
        {medicationOrderItems.length === 0 && marRows.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.medications")} />
        ) : (
          <>
            {medicationOrderItems.length > 0 ? (
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  {t("enterpriseClosedClinicalRecordD4c8b.medications.ordersHeading")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
                  {medicationOrderItems.map((it) => (
                    <li key={`med-${it.id}`}>
                      {getOrderItemDisplayLabelForLanguage(it, language, t)}
                      {" — "}
                      {tOrderItemStatusForWorklist(t, it.status ?? "")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {marRows.length > 0 ? (
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  {t("enterpriseClosedClinicalRecordD4c8b.medications.marHeading")}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
                  {marRows.map((row) => {
                    const label = getOrderItemDisplayLabelForLanguage(
                      {
                        displayLabel: row.orderItem?.displayLabel,
                        displayLabelFr: row.orderItem?.displayLabelFr,
                        displayLabelEn: row.orderItem?.displayLabelEn,
                      },
                      language,
                      t
                    );
                    const action = (row.marAction ?? row.action ?? "").trim() || "—";
                    return (
                      <li key={row.id} data-testid="closed-record-mar-row">
                        <strong>{label}</strong>
                        {row.doseText ? ` · ${row.doseText}` : ""}
                        {row.route ? ` · ${row.route}` : ""}
                        {" — "}
                        {action}
                        {row.administeredAt
                          ? ` · ${formatEncounterChromeDateTime(row.administeredAt, language)}`
                          : ""}
                        {row.administeredByDisplayFr ? ` · ${row.administeredByDisplayFr}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.results")}
        testId="closed-record-results"
      >
        {resultItems.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.results")} />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {resultItems.map((it) => {
              const title = getOrderItemDisplayLabelForLanguage(it, language, t);
              const viewer = clinicalResultFromOrderItemLike({
                displayLabel: title,
                status: it.status,
                catalogItemType: it.catalogItemType,
                result: it.result,
              });
              return (
                <ClinicalResultViewer
                  key={it.id}
                  compact
                  title={viewer.title}
                  itemStatus={viewer.itemStatus}
                  verifiedAt={viewer.verifiedAt}
                  resultDocumentedAt={viewer.resultDocumentedAt}
                  resultClinicalAt={viewer.resultClinicalAt}
                  resultEffectiveVersion={viewer.resultEffectiveVersion}
                  criticalValue={viewer.criticalValue}
                  resultText={viewer.resultText}
                  resultData={viewer.resultData}
                  attachments={viewer.attachments}
                  enteredByDisplayFr={viewer.enteredByDisplayFr}
                  acknowledgedByDisplayFr={viewer.acknowledgedByDisplayFr}
                  acknowledgedByProviderAt={viewer.acknowledgedByProviderAt}
                  catalogItemType={viewer.catalogItemType}
                />
              );
            })}
          </div>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.procedures")}
        testId="closed-record-procedures"
      >
        {procedureItems.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.procedures")} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
            {procedureItems.map((it) => (
              <li key={it.id}>
                {getOrderItemDisplayLabelForLanguage(it, language, t)}
                {" — "}
                {tOrderItemStatusForWorklist(t, it.status ?? "")}
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.dentalFindings")}
        testId="closed-record-dental-findings"
      >
        {dentalFindings.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.dentalFindings")} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
            {dentalFindings.map((f) => {
              const tooth = getCanonicalTooth(f.toothCode);
              const lbl = tooth ? formatToothDisplayLabel(tooth, "FDI") : f.toothCode;
              return (
                <li key={f.id} data-testid="closed-record-dental-finding-row">
                  #{lbl} — {t(`dentalCareD5a4.findings.${f.findingType}`)}
                  {f.surfaces.length ? ` (${f.surfaces.join("+")})` : ""} ·{" "}
                  {t(`dentalCareD5a4.states.${f.clinicalState}`)}
                  {f.documentedByDisplay ? ` · ${f.documentedByDisplay}` : ""} ·{" "}
                  {formatEncounterChromeDateTime(f.documentedAt, language)}
                </li>
              );
            })}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.disposition")}
        testId="closed-record-disposition"
      >
        {dischargeRows.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.disposition")} />
        ) : (
          <FieldList rows={dischargeRows} />
        )}
      </SectionShell>

      <SectionShell
        title={t("enterpriseClosedClinicalRecordD4c8b.sections.addenda")}
        testId="closed-record-addenda"
      >
        {addenda.length === 0 ? (
          <EmptyState text={t("enterpriseClosedClinicalRecordD4c8b.empty.addenda")} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
            {addenda.map((a) => (
              <li key={a.id} data-testid="closed-record-addendum-row">
                <strong>{t("enterpriseClosedClinicalRecordD4c8b.addenda.badge")}</strong>
                {" — "}
                {formatEncounterChromeDateTime(a.createdAt, language)}
                {a.createdByDisplayFr ? ` · ${a.createdByDisplayFr}` : ""}
                <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{a.text}</div>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </div>
  );
}
