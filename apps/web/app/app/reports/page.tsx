"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { asApiObject } from "@/lib/apiClient";
import { fetchEdReportCsv, fetchEdReportJson, type EdReportSlug } from "@/lib/reportsApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  return { from: isoDay(from), to: isoDay(to) };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsOpsPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");
  const [range, setRange] = useState(defaultRange);
  const [providerId, setProviderId] = useState("");
  const [loadingSlug, setLoadingSlug] = useState<EdReportSlug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [activeSlug, setActiveSlug] = useState<EdReportSlug | null>(null);

  const queryBase = useMemo(
    () => ({
      from: `${range.from}T00:00:00.000Z`,
      to: `${range.to}T23:59:59.999Z`,
      ...(providerId.trim() ? { providerId: providerId.trim() } : {}),
    }),
    [range.from, range.to, providerId]
  );

  const runReport = useCallback(
    async (slug: EdReportSlug) => {
      if (!facilityId) {
        setError(t("reportsOps.errorFacility"));
        return;
      }
      setLoadingSlug(slug);
      setError(null);
      try {
        const data = await fetchEdReportJson(facilityId, slug, queryBase);
        setPayload(asApiObject(data));
        setActiveSlug(slug);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setPayload(null);
        setActiveSlug(null);
        setError(normalizeUserFacingError(raw, language) || t("reportsOps.errorLoad"));
      } finally {
        setLoadingSlug(null);
      }
    },
    [facilityId, queryBase, language, t]
  );

  const downloadCsv = useCallback(
    async (slug: EdReportSlug) => {
      if (!facilityId) {
        setError(t("reportsOps.errorFacility"));
        return;
      }
      setLoadingSlug(slug);
      setError(null);
      try {
        const csv = await fetchEdReportCsv(facilityId, slug, { ...queryBase, export: "csv" });
        downloadText(`${slug}.csv`, csv);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("reportsOps.errorLoad"));
      } finally {
        setLoadingSlug(null);
      }
    },
    [facilityId, queryBase, language, t]
  );

  const rows = useMemo(() => {
    if (!payload || !Array.isArray((payload as { rows?: unknown }).rows)) return [];
    return (payload as { rows: Record<string, unknown>[] }).rows;
  }, [payload]);

  const columns = useMemo(() => {
    if (!activeSlug) return [] as string[];
    if (activeSlug === "door-to-ekg") return ["encounterId", "patientId", "arrivalAt", "ekgAt", "minutes", "ekgSource"];
    if (activeSlug === "door-to-provider")
      return ["encounterId", "patientId", "arrivalAt", "providerSeenAt", "minutes", "source"];
    if (activeSlug === "door-to-door") return ["encounterId", "patientId", "arrivalAt", "closedAt", "minutes"];
    return [
      "administrationId",
      "encounterId",
      "patientId",
      "orderId",
      "orderItemId",
      "orderedAt",
      "medicationOrdered",
      "administeredAt",
      "administeredByDisplay",
      "marAction",
      "minutesOrderToAdmin",
    ];
  }, [activeSlug]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <p>{t("reportsOps.accessDenied")}</p>
        <Link href="/app">{t("reportsOps.backApp")}</Link>
      </div>
    );
  }

  const cards: { slug: EdReportSlug; titleKey: string; descKey: string }[] = [
    { slug: "door-to-ekg", titleKey: "reportsOps.cardDoorEkgTitle", descKey: "reportsOps.cardDoorEkgDesc" },
    { slug: "door-to-provider", titleKey: "reportsOps.cardDoorProvTitle", descKey: "reportsOps.cardDoorProvDesc" },
    { slug: "door-to-door", titleKey: "reportsOps.cardDoorDoorTitle", descKey: "reportsOps.cardDoorDoorDesc" },
    {
      slug: "medication-administration",
      titleKey: "reportsOps.cardMedMarTitle",
      descKey: "reportsOps.cardMedMarDesc",
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("reportsOps.backAdmin")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t("reportsOps.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("reportsOps.intro")}</p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.slug}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{t(c.titleKey)}</div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{t(c.descKey)}</p>
            <button
              type="button"
              disabled={!facilityId || loadingSlug !== null}
              onClick={() => void runReport(c.slug)}
              style={{
                marginRight: 8,
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: "#1a1a1a",
                color: "#fff",
                fontWeight: 600,
                cursor: loadingSlug ? "wait" : "pointer",
              }}
            >
              {loadingSlug === c.slug ? t("reportsOps.loading") : t("reportsOps.view")}
            </button>
            <button
              type="button"
              disabled={!facilityId || loadingSlug !== null}
              onClick={() => void downloadCsv(c.slug)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #1a1a1a",
                background: "#fff",
                fontWeight: 600,
                cursor: loadingSlug ? "wait" : "pointer",
              }}
            >
              CSV
            </button>
          </div>
        ))}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 14,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("reportsOps.cardAuditTitle")}</div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{t("reportsOps.cardAuditDesc")}</p>
          <Link
            href="/app/admin/audit"
            style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #1a1a1a",
              color: "#1a1a1a",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("reportsOps.openAudit")}
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 20,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("reportsOps.filterFrom")}</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("reportsOps.filterTo")}</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
          <span>{t("reportsOps.filterProviderId")}</span>
          <input
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder={t("reportsOps.filterProviderPlaceholder")}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontFamily: "monospace", fontSize: 12 }}
          />
        </label>
      </section>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {payload && activeSlug ? (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {(payload as { truncated?: boolean }).truncated ? t("reportsOps.truncatedHint") : null}
          </p>
          <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#fafafa", textAlign: "left" }}>
                  {columns.map((col) => (
                    <th key={col} style={{ padding: 8, whiteSpace: "nowrap" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                    {columns.map((col) => (
                      <td key={col} style={{ padding: 8, verticalAlign: "top", fontFamily: "monospace" }}>
                        {row[col] == null ? "—" : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ padding: 16, color: "#666" }}>
                      {t("reportsOps.empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
