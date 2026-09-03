"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  approveRoiRequest,
  cancelRoiRequest,
  createRoiRequest,
  denyRoiRequest,
  fetchRoiRequests,
  fulfillRoiRequest,
  type RoiRequestRow,
} from "@/lib/chartRoiApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { resolveProductUiLanguageOrDefault, productUiBcp47Tag } from "@/i18n/config";

const REQUEST_TYPES = [
  "PATIENT_REQUEST",
  "INSURANCE",
  "LEGAL",
  "REGULATOR",
  "INTERNAL_AUDIT",
] as const;

export default function AdminRoiPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const isFacilityAdmin = roles.includes("ADMIN");
  const [items, setItems] = useState<RoiRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [requestType, setRequestType] = useState<string>("PATIENT_REQUEST");
  const [purpose, setPurpose] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const lang = resolveProductUiLanguageOrDefault(language);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchRoiRequests(facilityId, { language: lang });
      setItems(d.items);
    } catch (e: unknown) {
      setItems([]);
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("roi.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, lang, language, t]);

  useEffect(() => {
    if (!ready || !isFacilityAdmin || !facilityId) return;
    void load();
  }, [ready, isFacilityAdmin, facilityId, load]);

  const onCreate = async () => {
    if (!facilityId || !patientId.trim() || !purpose.trim()) {
      setError(t("roi.errorRequired"));
      return;
    }
    setBusyId("__create__");
    setError(null);
    try {
      await createRoiRequest(
        facilityId,
        {
          patientId: patientId.trim(),
          encounterId: encounterId.trim() || null,
          requestType,
          purpose: purpose.trim(),
        },
        lang
      );
      setPurpose("");
      setEncounterId("");
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("roi.errorCreate"));
    } finally {
      setBusyId(null);
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("roi.errorAction"));
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => items, [items]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }
  if (!isFacilityAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("roi.accessDenied")}</p>
        <Link href="/app/admin">{t("roi.backAdmin")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <Link href="/app/admin" style={{ fontSize: 14 }}>
        {t("roi.backAdmin")}
      </Link>
      <h1 style={{ marginTop: 8 }}>{t("roi.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("roi.intro")}</p>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      <section style={{ marginBottom: 24, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>{t("roi.sectionCreate")}</h2>
        <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
          <label>
            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{t("roi.fieldPatientId")}</span>
            <input
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{t("roi.fieldEncounterId")}</span>
            <input
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{t("roi.fieldType")}</span>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)} style={{ padding: 8 }}>
              {REQUEST_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {t(`roi.requestType.${rt}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{t("roi.fieldPurpose")}</span>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} style={{ width: "100%", padding: 8 }} />
          </label>
          <button type="button" onClick={() => void onCreate()} disabled={busyId !== null || !facilityId}>
            {busyId === "__create__" ? t("common.loading") : t("roi.create")}
          </button>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>{t("roi.sectionList")}</h2>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? t("common.loading") : t("roi.refresh")}
          </button>
        </div>
        {rows.length === 0 ? (
          <p style={{ color: "#64748b" }}>{t("roi.empty")}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 8 }}>{t("roi.colCreated")}</th>
                <th style={{ padding: 8 }}>{t("roi.colType")}</th>
                <th style={{ padding: 8 }}>{t("roi.colStatus")}</th>
                <th style={{ padding: 8 }}>{t("roi.colPatient")}</th>
                <th style={{ padding: 8 }}>{t("roi.colEncounter")}</th>
                <th style={{ padding: 8 }}>{t("roi.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{new Date(r.createdAt).toLocaleString(productUiBcp47Tag(lang))}</td>
                  <td style={{ padding: 8 }}>{t(`roi.requestType.${r.requestType}`)}</td>
                  <td style={{ padding: 8 }}>{t(`roi.status.${r.status}`)}</td>
                  <td style={{ padding: 8, fontFamily: "monospace", fontSize: 12 }}>{r.patientId.slice(0, 8)}…</td>
                  <td style={{ padding: 8, fontFamily: "monospace", fontSize: 12 }}>
                    {r.encounterId ? `${r.encounterId.slice(0, 8)}…` : "—"}
                  </td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {r.status === "DRAFT" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() =>
                            void act(r.id, () => approveRoiRequest(facilityId, r.id, lang))
                          }
                        >
                          {t("roi.approve")}
                        </button>{" "}
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void act(r.id, () => denyRoiRequest(facilityId, r.id, null, lang))}
                        >
                          {t("roi.deny")}
                        </button>{" "}
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void act(r.id, () => cancelRoiRequest(facilityId, r.id, null, lang))}
                        >
                          {t("roi.cancel")}
                        </button>
                      </>
                    ) : null}
                    {r.status === "APPROVED" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId !== null || !r.encounterId}
                          title={!r.encounterId ? t("roi.hintFulfillNeedsEncounter") : undefined}
                          onClick={() =>
                            void act(r.id, () =>
                              fulfillRoiRequest(facilityId, r.id, { createSnapshotIfMissing: true }, lang)
                            )
                          }
                        >
                          {t("roi.fulfillSnapshot")}
                        </button>{" "}
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void act(r.id, () => cancelRoiRequest(facilityId, r.id, null, lang))}
                        >
                          {t("roi.cancel")}
                        </button>
                      </>
                    ) : null}
                    {r.status === "FULFILLED" && r.encounterChartExportId && r.encounterId ? (
                      <a
                        href={`/api/backend/encounters/${encodeURIComponent(r.encounterId)}/chart-export/snapshots/${encodeURIComponent(r.encounterChartExportId)}?format=html`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("roi.openSnapshotClinical")}
                      </a>
                    ) : null}
                    {r.status === "FULFILLED" && r.encounterChartExportId ? (
                      <>
                        {" "}
                        <a
                          href={`/api/backend/roi-requests/${encodeURIComponent(r.id)}/snapshot-document?format=html`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("roi.openSnapshotRoi")}
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
