"use client";
import { useEffect, useState } from "react";
import { platformFacilitiesApi, type FacilitySummary } from "@/lib/platform/api";
import { useI18n } from "@/i18n/I18nProvider";

type View = "governance" | "claims" | "payments";

export function BillingOperations() {
  const { t } = useI18n();
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [id, setId] = useState("");
  const [view, setView] = useState<View>("governance");
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  useEffect(() => {
    platformFacilitiesApi.list().then((x) => {
      setFacilities(x);
      setId(x[0]?.id || "");
    });
  }, []);
  async function load() {
    try {
      setError("");
      const r = await fetch(
        `/api/backend/platform/operations/${view === "governance" ? "billing" : view}?facilityId=${encodeURIComponent(id)}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || t("common.unableToLoad"));
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.unableToLoad"));
    }
  }
  const facility = facilities.find((x) => x.id === id);
  return (
    <>
      <section className="platform-panel">
        <div className="platform-search">
          <label>
            {t("billing.facilityScope")}
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setData(undefined);
              }}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("billing.function")}
            <select
              value={view}
              onChange={(e) => {
                setView(e.target.value as View);
                setData(undefined);
              }}
            >
              <option value="governance">{t("billing.governance")}</option>
              <option value="claims">{t("billing.claims")}</option>
              <option value="payments">{t("billing.payments")}</option>
            </select>
          </label>
          <button className="button" onClick={() => void load()} disabled={!id}>
            {t("common.load")}
          </button>
        </div>
        {facility && (
          <p className="notice">
            {t("billing.selectedFacility")} <b>{facility.name}</b>. {t("billing.noChartAuthority")}
          </p>
        )}
        {error && <p className="platform-error">{error}</p>}
      </section>
      {data && view === "governance" && (
        <section className="platform-panel">
          <h2>{t("billing.governance")}</h2>
          <Metrics value={data.summary ?? data} />
        </section>
      )}
      {data && view !== "governance" && (
        <section className="platform-panel">
          <div className="panel-heading">
            <h2>{view === "claims" ? t("billing.claimQueue") : t("billing.paymentsQueue")}</h2>
            <span className="platform-badge">
              {data.total} {t("billing.records")}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.keys(data.rows?.[0] ?? {})
                    .slice(0, 7)
                    .map((k) => (
                      <th key={k}>{human(k)}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {(data.rows ?? []).map((row: any, i: number) => (
                  <tr key={row.claimId ?? row.encounterId ?? i}>
                    {Object.keys(data.rows[0] ?? {})
                      .slice(0, 7)
                      .map((k) => (
                        <td key={k}>{render(row[k], t)}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
function Metrics({ value }: { value: any }) {
  const { t } = useI18n();
  return (
    <div className="metric-grid">
      {Object.entries(value ?? {})
        .filter(([, v]) => v == null || ["string", "number", "boolean"].includes(typeof v))
        .map(([k, v]) => (
          <article key={k}>
            <small>{human(k)}</small>
            <strong>{render(v, t)}</strong>
          </article>
        ))}
    </div>
  );
}
function render(v: unknown, t: (k: "common.yes" | "common.no") => string) {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? t("common.yes") : t("common.no");
  return String(v);
}
function human(v: string) {
  return v.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}
