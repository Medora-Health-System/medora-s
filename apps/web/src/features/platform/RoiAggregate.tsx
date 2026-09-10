"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export function RoiAggregate() {
  const { t } = useI18n();
  const [data, setData] = useState<any>();
  const [error, setError] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/backend/platform/operations/roi");
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || t("common.unableToLoad"));
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.unableToLoad"));
    }
  }
  return (
    <section className="platform-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t("roi.eyebrow")}</span>
          <h2>{t("roi.title")}</h2>
        </div>
        <button className="button" onClick={() => void load()}>
          {t("roi.load")}
        </button>
      </div>
      {error && <p className="platform-error">{error}</p>}
      {data && (
        <>
          <div className="metric-grid">
            {data.byStatus.map((x: any) => (
              <article key={x.status}>
                <small>{x.status}</small>
                <strong>{x.count}</strong>
              </article>
            ))}
          </div>
          <p>
            {data.byFacility.length} {t("roi.buckets")}
          </p>
        </>
      )}
    </section>
  );
}
