"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { platformFacilitiesApi, type FacilitySummary } from "@/lib/platform/api";

type Kind = "health" | "backup" | "go-live" | "compliance" | "exports" | "billing" | "catalog";

export function OperationalProjection({ kind, title, path }: { kind: Kind; title: string; path: string }) {
  const { t } = useI18n();
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [id, setId] = useState("");
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  useEffect(() => {
    platformFacilitiesApi
      .list()
      .then((x) => {
        setFacilities(x);
        setId(x[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  async function load() {
    setError("");
    setData(undefined);
    try {
      const r = await fetch(`/api/backend${path}?facilityId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || t("common.operationUnavailable"));
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.failed"));
    }
  }
  const selected = facilities.find((f) => f.id === id);
  return (
    <>
      <section className="platform-panel">
        <div className="platform-search">
          <label>
            {t("ops.facilityScope")}
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setData(undefined);
              }}
            >
              {facilities.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </label>
          <button className="button" disabled={!id} onClick={() => void load()}>
            {t("common.load")} {title}
          </button>
        </div>
        {selected && (
          <p className="notice">
            {t("ops.selectedFacility")} <b>{selected.name}</b> — {selected.code}. {t("ops.notInherited")}
          </p>
        )}
        {error && (
          <p className="platform-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {data && <Projection kind={kind} data={data} />}
    </>
  );
}

function Projection({ kind, data }: { kind: Kind; data: any }) {
  const { formatDate, t } = useI18n();
  if (kind === "health" || kind === "backup" || kind === "go-live")
    return (
      <>
        <section className="platform-panel">
          <h2>{t("ops.overallStatus")}</h2>
          <span className={`platform-badge ${String(data.status).toLowerCase()}`}>
            {String(data.status).replaceAll("_", " ")}
          </span>
          <p>
            {t("ops.generated")} {formatDate(data.generatedAt)}
          </p>
        </section>
        <section className="platform-panel">
          <h2>{t("ops.authoritativeChecks")}</h2>
          <div className="operations-list">
            {(data.checks ?? []).map((c: any) => (
              <article key={c.key}>
                <b>{human(c.label || c.key)}</b>
                <span className={`platform-badge ${c.status}`}>{c.status}</span>
                <p>{c.detail ? human(c.detail) : c.value != null ? String(c.value) : t("ops.noIssue")}</p>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  if (kind === "compliance")
    return (
      <>
        <section className="platform-panel">
          <h2>{t("ops.auditCoverage")}</h2>
          <div className="metric-grid">
            {Object.entries(data.auditCoverage ?? {}).map(([k, v]: any) => (
              <article key={k}>
                <small>{human(k)}</small>
                <strong>{v.percent}%</strong>
                <p>
                  {v.audited} / {v.total} {t("ops.audited")}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="platform-panel">
          <h2>{t("ops.riskSignals")}</h2>
          <MetricGrid value={data.riskSignals} />
        </section>
      </>
    );
  if (kind === "exports")
    return (
      <>
        <section className="platform-panel">
          <h2>{t("ops.exportReadiness")}</h2>
          <MetricGrid value={data.summary} />
        </section>
        <section className="platform-panel">
          <h2>{t("ops.recentExports")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("security.colTime")}</th>
                  <th>{t("ops.colType")}</th>
                  <th>{t("security.status")}</th>
                  <th>{t("ops.colSource")}</th>
                  <th>{t("ops.colRows")}</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentExports ?? []).map((x: any) => (
                  <tr key={x.id}>
                    <td>{formatDate(x.createdAt)}</td>
                    <td>{human(x.exportType)}</td>
                    <td>{x.status}</td>
                    <td>{x.source}</td>
                    <td>{x.rowCount ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  if (kind === "catalog")
    return (
      <>
        <section className="platform-panel">
          <h2>{t("ops.catalogCoverage")}</h2>
          <MetricGrid value={data.summary} />
        </section>
        <section className="platform-panel">
          <h2>{t("ops.itemsReview")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("ops.medication")}</th>
                  <th>{t("ops.route")}</th>
                  <th>{t("ops.billingClass")}</th>
                  <th>{t("ops.flags")}</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows ?? []).slice(0, 100).map((x: any) => (
                  <tr key={x.catalogMedicationId}>
                    <td>{x.label}</td>
                    <td>{x.route || "—"}</td>
                    <td>{x.billingClass || "—"}</td>
                    <td>{x.flags.join(", ") || t("ops.none")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  return (
    <section className="platform-panel">
      <h2>{t("ops.revenueCycle")}</h2>
      <MetricGrid value={data.summary ?? data} />
    </section>
  );
}

function MetricGrid({ value }: { value: Record<string, unknown> }) {
  const { t } = useI18n();
  return (
    <div className="metric-grid">
      {Object.entries(value ?? {})
        .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v) || v == null)
        .map(([k, v]) => (
          <article key={k}>
            <small>{human(k)}</small>
            <strong>{v == null ? "—" : typeof v === "boolean" ? (v ? t("common.yes") : t("common.no")) : String(v)}</strong>
          </article>
        ))}
    </div>
  );
}
function human(v: string) {
  return v.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}
