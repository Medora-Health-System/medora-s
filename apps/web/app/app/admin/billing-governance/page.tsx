"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { tBillingClassification } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { fetchBillingGovernanceSummary, type BillingGovernanceSummaryPayload } from "@/lib/billingGovernanceApi";
import {
  billingGovernanceClassificationFilterOptions,
  billingGovernanceDomainLabelKey,
  billingGovernanceReasonLabelKey,
  billingGovernanceSeverityColor,
  billingGovernanceSeverityLabelKey,
} from "@/lib/billingGovernanceDisplay";
import type { BillingClassification } from "@medora/shared";

function defaultLocalIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CountList({ items, labelKey }: { items: Array<{ key: string; count: number }>; labelKey?: (k: string) => string }) {
  if (items.length === 0) return <p style={{ fontSize: 13, color: "#64748b" }}>—</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
      {items.map((item) => (
        <li key={item.key}>
          {labelKey ? labelKey(item.key) : item.key}: {item.count}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section
      data-testid={testId}
      style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <h2 style={{ margin: "0 0 10px", fontSize: 15 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function AdminBillingGovernancePage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const canView =
    roles.includes("ADMIN") || roles.includes("BILLING") || roles.includes("MEDORA_SUPER_ADMIN");
  const [data, setData] = useState<BillingGovernanceSummaryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(defaultLocalIsoDate());
  const [classificationFilter, setClassificationFilter] = useState<BillingClassification | "">("");
  const [includeOpen, setIncludeOpen] = useState(true);
  const [includeClosed, setIncludeClosed] = useState(true);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchBillingGovernanceSummary(
        facilityId,
        {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          classification: classificationFilter || undefined,
          includeOpen,
          includeClosed,
        },
        language === "en" ? "en" : "fr",
      );
      setData(payload);
    } catch (e: unknown) {
      setData(null);
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("billingGovernance.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, dateFrom, dateTo, classificationFilter, includeOpen, includeClosed, language, t]);

  useEffect(() => {
    if (!ready || !canView || !facilityId) return;
    void load();
  }, [ready, canView, facilityId, load]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!canView) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("billingGovernance.accessDenied")}</p>
        <Link href="/app/admin">{t("billingGovernance.backAdmin")}</Link>
      </div>
    );
  }

  const readinessByDomain = (domain: string) =>
    data?.byReadinessStatus.filter((r) => r.domain === domain) ?? [];

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <Link href="/app/admin" style={{ fontSize: 14 }}>
        {t("billingGovernance.backAdmin")}
      </Link>
      <h1 style={{ marginTop: 8 }}>{t("billingGovernance.pageTitle")}</h1>
      <p style={{ color: "#555", margin: "0 0 8px" }}>{t("billingGovernance.pageSubtitle")}</p>
      <p
        data-testid="billing-governance-disclaimer"
        style={{
          margin: "0 0 16px",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          color: "#475569",
        }}
      >
        {t("billingGovernance.analyticsOnlyDisclaimer")}
      </p>

      <div
        data-testid="billing-governance-filters"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("billingGovernance.filterDateFrom")}</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: 6 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("billingGovernance.filterDateTo")}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: 6 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span>{t("billingGovernance.filterClassification")}</span>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value as BillingClassification | "")}
            style={{ padding: 6 }}
          >
            <option value="">{t("billingGovernance.filterAll")}</option>
            {billingGovernanceClassificationFilterOptions().map((c) => (
              <option key={c} value={c}>
                {tBillingClassification(t, c)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={includeOpen} onChange={(e) => setIncludeOpen(e.target.checked)} />
          {t("billingGovernance.filterIncludeOpen")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 18 }}>
          <input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} />
          {t("billingGovernance.filterIncludeClosed")}
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} style={{ marginTop: 18, padding: "6px 12px" }}>
          {loading ? t("common.loading") : t("billingGovernance.refresh")}
        </button>
      </div>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {data ? (
        <>
          <div
            data-testid="billing-governance-overview-tiles"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}
          >
            {[
              { label: t("billingGovernance.tileEncounters"), value: data.totals.encountersReviewed },
              { label: t("billingGovernance.tileOpen"), value: data.totals.openEncounters },
              { label: t("billingGovernance.tileClosed"), value: data.totals.closedEncounters },
              { label: t("billingGovernance.tileSample"), value: data.totals.readinessSampleSize },
              { label: t("billingGovernance.tileUcToEd"), value: data.conversionSummary.ucToEdCount },
              { label: t("billingGovernance.tileEdToUc"), value: data.conversionSummary.edToUcCount },
            ].map((tile) => (
              <div
                key={tile.label}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700 }}>{tile.value}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{tile.label}</div>
              </div>
            ))}
          </div>

          <Section title={t("billingGovernance.sectionClassification")} testId="billing-governance-classification">
            <CountList
              items={data.byClassification}
              labelKey={(k) => tBillingClassification(t, k as BillingClassification)}
            />
          </Section>

          <Section title={t("billingGovernance.sectionConversion")} testId="billing-governance-conversion">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>
                {t("billingGovernance.ucToEdCount")}: {data.conversionSummary.ucToEdCount}
              </li>
              <li>
                {t("billingGovernance.edToUcCount")}: {data.conversionSummary.edToUcCount}
              </li>
              <li>
                {t("billingGovernance.ackCaptured")}: {data.conversionSummary.acknowledgmentCapturedCount}
              </li>
              <li>
                {t("billingGovernance.ackMissing")}: {data.conversionSummary.missingAcknowledgmentCount}
              </li>
            </ul>
          </Section>

          <Section title={t("billingGovernance.sectionExportReadiness")} testId="billing-governance-export-readiness">
            <CountList items={readinessByDomain("EXPORT_READINESS").map((r) => ({ key: r.status, count: r.count }))} />
          </Section>

          <Section title={t("billingGovernance.sectionLedgerReadiness")} testId="billing-governance-ledger-readiness">
            <CountList items={readinessByDomain("LEDGER_READINESS").map((r) => ({ key: r.status, count: r.count }))} />
          </Section>

          <Section title={t("billingGovernance.sectionFacilityFee")} testId="billing-governance-facility-fee">
            <CountList items={readinessByDomain("FACILITY_FEE").map((r) => ({ key: r.status, count: r.count }))} />
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              {t("billingGovernance.observationReview")}: {data.observationSummary.reviewRequiredCount} ·{" "}
              {t("billingGovernance.extendedObservation")}: {data.observationSummary.extendedObservationCount}
            </p>
          </Section>

          <Section title={t("billingGovernance.sectionChargeReview")} testId="billing-governance-charge-review">
            <CountList items={readinessByDomain("CHARGE_REVIEW").map((r) => ({ key: r.status, count: r.count }))} />
          </Section>

          <Section title={t("billingGovernance.sectionCodingReview")} testId="billing-governance-coding-review">
            <CountList items={readinessByDomain("CODING_REVIEW").map((r) => ({ key: r.status, count: r.count }))} />
          </Section>

          <Section title={t("billingGovernance.sectionClaimAssembly")} testId="billing-governance-claim-assembly">
            <CountList items={readinessByDomain("CLAIM_ASSEMBLY").map((r) => ({ key: r.status, count: r.count }))} />
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              {t("billingGovernance.professionalReady")}: {data.claimAssemblySummary.professionalReadyCount} ·{" "}
              {t("billingGovernance.facilityReady")}: {data.claimAssemblySummary.facilityReadyCount}
            </p>
          </Section>

          <Section title={t("billingGovernance.sectionFacilityConfig")} testId="billing-governance-facility-config">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>
                {t("billingGovernance.missingMode")}: {data.facilityConfiguration.missingClassificationModeCount}
              </li>
              <li>
                {t("billingGovernance.hybridControlsDisabled")}: {data.facilityConfiguration.hybridControlsDisabledCount}
              </li>
              <li>
                {t("billingGovernance.missingIdentity")}: {data.facilityConfiguration.missingBillingIdentityCount}
              </li>
              <li>
                {t("billingGovernance.hospitalIncomplete")}: {data.facilityConfiguration.hospitalEnterpriseIncompleteCount}
              </li>
            </ul>
          </Section>

          {data.warnings.length > 0 ? (
            <Section title={t("billingGovernance.sectionWarnings")} testId="billing-governance-warnings">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {data.warnings.map((w, i) => (
                  <li key={`${w.domain}-${w.reason}-${i}`} style={{ color: billingGovernanceSeverityColor(w.severity) }}>
                    {t(billingGovernanceDomainLabelKey(w.domain))} — {t(billingGovernanceReasonLabelKey(w.reason))}
                    {w.count != null ? ` (${w.count})` : ""} · {t(billingGovernanceSeverityLabelKey(w.severity))}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : !loading ? (
        <p style={{ color: "#64748b" }}>{t("billingGovernance.empty")}</p>
      ) : null}
    </div>
  );
}
