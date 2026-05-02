"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchEdReportAllRowsForExport,
  fetchEdReportJson,
  type EdReportJsonResponse,
  type EdReportSlug,
} from "@/lib/reportsApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const SLUGS = new Set<EdReportSlug>([
  "door-to-door",
  "door-to-provider",
  "door-to-ekg",
  "medication-administration",
]);

const COLUMN_ORDER: Record<EdReportSlug, string[]> = {
  "door-to-door": [
    "facilityId",
    "encounterId",
    "patientId",
    "mrn",
    "arrivalAt",
    "closedAt",
    "durationMinutes",
    "encounterStatus",
    "disposition",
  ],
  "door-to-provider": [
    "facilityId",
    "encounterId",
    "patientId",
    "mrn",
    "arrivalAt",
    "firstProviderAt",
    "minutesToProvider",
    "providerUserId",
    "providerName",
    "providerTitle",
    "source",
  ],
  "door-to-ekg": [
    "facilityId",
    "encounterId",
    "patientId",
    "mrn",
    "arrivalAt",
    "firstEkgAt",
    "minutesToEkg",
    "source",
  ],
  "medication-administration": [
    "facilityId",
    "encounterId",
    "patientId",
    "mrn",
    "orderItemId",
    "medicationName",
    "route",
    "orderedAt",
    "administeredAt",
    "administeredBy",
    "administeredByTitle",
    "marAction",
    "quantity",
    "notesPresent",
  ],
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  return { from: isoDay(from), to: isoDay(to) };
}

function downloadJsonFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function colLabel(t: (k: string) => string, key: string): string {
  const k = `reportsOps.col.${key}`;
  const out = t(k);
  return out === k ? key : out;
}

export default function EdReportDetailPage() {
  const params = useParams();
  const rawSlug = typeof params?.slug === "string" ? params.slug : "";
  const slug = rawSlug as EdReportSlug;
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");
  const [range, setRange] = useState(defaultRange);
  const [providerId, setProviderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [meta, setMeta] = useState<Pick<EdReportJsonResponse, "from" | "to" | "truncated"> | null>(null);

  const validSlug = SLUGS.has(slug);

  const queryBase = useMemo(
    () => ({
      from: `${range.from}T00:00:00.000Z`,
      to: `${range.to}T23:59:59.999Z`,
      ...(providerId.trim() ? { providerId: providerId.trim() } : {}),
      limit: 100,
    }),
    [range.from, range.to, providerId]
  );

  const columns = useMemo(() => {
    if (!validSlug) return [];
    return COLUMN_ORDER[slug];
  }, [slug, validSlug]);

  const runReport = useCallback(async () => {
    if (!facilityId || !validSlug) {
      setError(t("reportsOps.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    setNextCursor(null);
    try {
      const data = await fetchEdReportJson(facilityId, slug, { ...queryBase });
      setRows(data.rows);
      setNextCursor(data.nextCursor);
      setMeta({ from: data.from, to: data.to, truncated: data.truncated });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setRows([]);
      setNextCursor(null);
      setMeta(null);
      setError(normalizeUserFacingError(raw, language) || t("reportsOps.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, validSlug, slug, queryBase, language, t]);

  const loadMore = useCallback(async () => {
    if (!facilityId || !validSlug || !nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEdReportJson(facilityId, slug, { ...queryBase, cursor: nextCursor });
      setRows((prev) => [...prev, ...data.rows]);
      setNextCursor(data.nextCursor);
      setMeta({ from: data.from, to: data.to, truncated: data.truncated });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("reportsOps.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, validSlug, slug, queryBase, nextCursor, language, t]);

  const downloadJson = useCallback(async () => {
    if (!facilityId || !validSlug) {
      setError(t("reportsOps.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEdReportAllRowsForExport(facilityId, slug, {
        from: queryBase.from,
        to: queryBase.to,
        ...(queryBase.providerId ? { providerId: queryBase.providerId } : {}),
      });
      const payload = {
        reportType: data.reportType,
        generatedAt: data.generatedAt,
        from: data.from,
        to: data.to,
        rowCount: data.rowCount,
        truncated: data.truncated,
        rows: data.rows,
      };
      downloadJsonFile(`${slug}.json`, JSON.stringify(payload, null, 2));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("reportsOps.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, validSlug, slug, queryBase, language, t]);

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

  if (!validSlug) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/app/reports">{t("reportsOps.backHub")}</Link>
        <p>{t("reportsOps.unknownReport")}</p>
      </div>
    );
  }

  const titleKey =
    slug === "door-to-door"
      ? "reportsOps.cardDoorDoorTitle"
      : slug === "door-to-provider"
        ? "reportsOps.cardDoorProvTitle"
        : slug === "door-to-ekg"
          ? "reportsOps.cardDoorEkgTitle"
          : "reportsOps.cardMedMarTitle";

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/reports" style={{ color: "#1a1a1a" }}>
          {t("reportsOps.backHub")}
        </Link>
        {" · "}
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("reportsOps.backAdmin")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t(titleKey)}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("reportsOps.reportPageIntro")}</p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          disabled={!facilityId || loading}
          onClick={() => void runReport()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#1a1a1a",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading && rows.length === 0 ? t("reportsOps.loading") : t("reportsOps.runReport")}
        </button>
        <button
          type="button"
          disabled={!facilityId || loading || !nextCursor}
          onClick={() => void loadMore()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading || !nextCursor ? "not-allowed" : "pointer",
          }}
        >
          {t("reportsOps.loadMore")}
        </button>
        <button
          type="button"
          disabled={!facilityId || loading}
          onClick={() => void downloadJson()}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {t("reportsOps.downloadJson")}
        </button>
      </div>

      {rows.length > 0 ? (
        <p style={{ fontSize: 14, color: "#334155" }}>
          {t("reportsOps.rowsLoaded")}: <strong>{rows.length}</strong>
          {meta?.truncated ? ` — ${t("reportsOps.truncatedHint")}` : null}
          {nextCursor ? ` — ${t("reportsOps.morePagesHint")}` : null}
        </p>
      ) : null}

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      {rows.length > 0 ? (
        <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                {columns.map((col) => (
                  <th key={col} style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {colLabel(t, col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  {columns.map((col) => (
                    <td key={col} style={{ padding: 8, verticalAlign: "top", fontFamily: "monospace" }}>
                      {row[col] == null || row[col] === "" ? "—" : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows.length === 0 && meta === null ? (
        <p style={{ color: "#64748b", fontSize: 14 }}>{t("reportsOps.runToPreview")}</p>
      ) : null}
    </div>
  );
}
