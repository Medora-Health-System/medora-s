"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchMedicationMasterConcept,
  fetchMedicationMasterFormulary,
  searchMedicationMaster,
  type MedicationMasterBadges,
  type MedicationMasterConceptDetail,
  type MedicationMasterFormularyItem,
  type MedicationMasterSearchHit,
} from "@/lib/medicationMasterApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type ViewMode = "search" | "formulary";

function cardShell(selected: boolean): CSSProperties {
  return {
    border: selected ? "2px solid #1e40af" : "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    background: selected ? "#eff6ff" : "#fafafa",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  };
}

function badgeChipStyle(kind: "neutral" | "warn" | "danger" | "ok"): CSSProperties {
  if (kind === "danger") return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  if (kind === "warn") return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  if (kind === "ok") return { background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" };
  return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
}

function BadgeRow({ badges, t }: { badges: MedicationMasterBadges; t: (k: string) => string }) {
  const chips: Array<{ key: string; label: string; kind: "neutral" | "warn" | "danger" | "ok" }> = [];
  if (badges.edFormulary) chips.push({ key: "ed", label: t("medicationMasterExplorer.badgeEdFormulary"), kind: "ok" });
  if (badges.rsi) chips.push({ key: "rsi", label: t("medicationMasterExplorer.badgeRsi"), kind: "warn" });
  if (badges.crashCart) chips.push({ key: "crash", label: t("medicationMasterExplorer.badgeCrashCart"), kind: "warn" });
  if (badges.infusion) chips.push({ key: "inf", label: t("medicationMasterExplorer.badgeInfusion"), kind: "neutral" });
  if (badges.controlled) chips.push({ key: "ctrl", label: t("medicationMasterExplorer.badgeControlled"), kind: "danger" });
  if (badges.highAlert) chips.push({ key: "ha", label: t("medicationMasterExplorer.badgeHighAlert"), kind: "danger" });
  if (badges.billingReview) chips.push({ key: "bill", label: t("medicationMasterExplorer.badgeBillingReview"), kind: "warn" });
  chips.push({
    key: "ndc",
    label: badges.ndcPresent
      ? t("medicationMasterExplorer.badgeNdcPresent")
      : t("medicationMasterExplorer.badgeNdcMissing"),
    kind: badges.ndcPresent ? "ok" : "warn",
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {chips.map((c) => (
        <span
          key={c.key}
          style={{
            ...badgeChipStyle(c.kind),
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 9999,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function DetailPanel({
  detail,
  t,
}: {
  detail: MedicationMasterConceptDetail | null;
  t: (k: string) => string;
}) {
  if (!detail) {
    return <p style={{ color: "#64748b", fontSize: 14 }}>{t("medicationMasterExplorer.selectHint")}</p>;
  }
  const { concept, products } = detail;
  return (
    <div style={{ fontSize: 14 }}>
      <h3 style={{ margin: "0 0 8px 0" }}>{t("medicationMasterExplorer.sectionConcept")}</h3>
      <p style={{ margin: "4px 0" }}>
        <strong>{concept.displayName}</strong> ({concept.code})
      </p>
      <p style={{ margin: "4px 0", color: "#475569" }}>
        {t("medicationMasterExplorer.fieldGenericName")} : {concept.genericName}
      </p>
      {concept.therapeuticClass ? (
        <p style={{ margin: "4px 0", color: "#475569" }}>
          {t("medicationMasterExplorer.fieldTherapeuticClass")} : {concept.therapeuticClass.name}
        </p>
      ) : null}

      <h3 style={{ margin: "16px 0 8px 0" }}>{t("medicationMasterExplorer.sectionProducts")}</h3>
      {products.map((product) => (
        <div
          key={product.id}
          style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 10 }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            {product.strengthDisplay} — {product.code}
          </p>
          <p style={{ margin: "4px 0", color: "#475569" }}>
            {t("medicationMasterExplorer.fieldAdministrationType")} : {product.administrationType} ·{" "}
            {t("medicationMasterExplorer.fieldBillingClass")} : {product.billingClass}
          </p>
          {product.administrationProfile ? (
            <p style={{ margin: "4px 0", color: "#475569" }}>
              {t("medicationMasterExplorer.fieldMarWorkflow")} : {product.administrationProfile.defaultMarWorkflow}
            </p>
          ) : null}

          <h4 style={{ margin: "10px 0 6px 0", fontSize: 13 }}>{t("medicationMasterExplorer.sectionPackages")}</h4>
          {product.packages.map((pkg) => (
            <div key={pkg.id} style={{ padding: "6px 0", borderTop: "1px solid #f1f5f9" }}>
              <p style={{ margin: 0 }}>{pkg.packageDescription}</p>
              <p style={{ margin: "2px 0", fontSize: 12, color: "#64748b" }}>
                {pkg.code} · {t("medicationMasterExplorer.colNdc")} : {pkg.ndc11 ?? "—"}
              </p>
              {pkg.facilityFormulary ? (
                <p style={{ margin: "2px 0", fontSize: 12, color: "#64748b" }}>
                  {t("medicationMasterExplorer.fieldOnFormulary")} :{" "}
                  {pkg.facilityFormulary.isOnFormulary ? "oui" : "non"}
                  {pkg.facilityFormulary.favoriteTier
                    ? ` · ${t("medicationMasterExplorer.fieldFormularyTier")} : ${pkg.facilityFormulary.favoriteTier}`
                    : ""}
                </p>
              ) : null}
              <BadgeRow badges={pkg.badges} t={t} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminMedicationMasterPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isFacilityOrPlatformAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [mode, setMode] = useState<ViewMode>("search");
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<MedicationMasterSearchHit[]>([]);
  const [formularyItems, setFormularyItems] = useState<MedicationMasterFormularyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MedicationMasterConceptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filterEd, setFilterEd] = useState(false);
  const [filterControlled, setFilterControlled] = useState(false);
  const [filterHighAlert, setFilterHighAlert] = useState(false);
  const [filterInfusion, setFilterInfusion] = useState(false);
  const [filterOnFormulary, setFilterOnFormulary] = useState(false);
  const [filterBaseline, setFilterBaseline] = useState(false);
  const [ndcStatus, setNdcStatus] = useState<"any" | "present" | "missing">("any");

  const loadSearch = useCallback(async () => {
    if (!facilityId) {
      setError(t("medicationMasterExplorer.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchMedicationMaster(facilityId, {
        q: query.trim(),
        limit: 60,
        facilityId,
        edFormularyOnly: filterEd,
        controlledOnly: filterControlled,
        highAlertOnly: filterHighAlert,
        infusionOnly: filterInfusion,
        onFormularyOnly: filterOnFormulary,
        ndcStatus,
        baselineOnly: filterBaseline,
        activeOnly: filterBaseline ? false : undefined,
      });
      setSearchHits(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setSearchHits([]);
      setTotal(0);
      setError(normalizeUserFacingError(raw, language) || t("medicationMasterExplorer.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [
    facilityId,
    query,
    filterEd,
    filterControlled,
    filterHighAlert,
    filterInfusion,
    filterOnFormulary,
    filterBaseline,
    ndcStatus,
    language,
    t,
  ]);

  const loadFormulary = useCallback(async () => {
    if (!facilityId) {
      setError(t("medicationMasterExplorer.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMedicationMasterFormulary(facilityId);
      setFormularyItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setFormularyItems([]);
      setTotal(0);
      setError(normalizeUserFacingError(raw, language) || t("medicationMasterExplorer.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  const loadList = useCallback(() => {
    if (mode === "formulary") return loadFormulary();
    return loadSearch();
  }, [mode, loadFormulary, loadSearch]);

  useEffect(() => {
    if (!ready || !isFacilityOrPlatformAdmin || !facilityId) return;
    void loadList();
  }, [ready, isFacilityOrPlatformAdmin, facilityId, mode, loadList]);

  useEffect(() => {
    if (!selectedConceptId || !facilityId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchMedicationMasterConcept(facilityId, selectedConceptId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedConceptId, facilityId]);

  const listRows = useMemo(() => {
    if (mode === "formulary") {
      return formularyItems.map((item) => ({
        key: item.formularyItemId,
        conceptId: item.conceptId,
        title: item.displayName,
        subtitle: `${item.strengthDisplay} · ${item.packageDescription}`,
        meta: item.packageCode,
        badges: item.badges,
      }));
    }
    return searchHits.map((hit) => ({
      key: `${hit.conceptId}:${hit.productId ?? ""}:${hit.packageId ?? ""}`,
      conceptId: hit.conceptId,
      title: hit.displayName,
      subtitle: [hit.strengthDisplay, hit.packageDescription].filter(Boolean).join(" · "),
      meta: hit.conceptCode,
      badges: hit.badges,
    }));
  }, [mode, formularyItems, searchHits]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isFacilityOrPlatformAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("medicationMasterExplorer.accessDenied")}</p>
        <Link href="/app">{t("medicationMasterExplorer.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("medicationMasterExplorer.backAdmin")}
      </Link>
      <h1 style={{ margin: "8px 0 4px 0" }}>{t("medicationMasterExplorer.title")}</h1>
      <p style={{ color: "#475569", maxWidth: 720 }}>{t("medicationMasterExplorer.intro")}</p>
      <div
        style={{
          margin: "12px 0",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          color: "#0c4a6e",
          fontSize: 13,
        }}
      >
        {t("medicationMasterExplorer.readOnlyBanner")}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode("search")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: mode === "search" ? "2px solid #1e40af" : "1px solid #cbd5e1",
            background: mode === "search" ? "#eff6ff" : "#fff",
            fontWeight: 600,
          }}
        >
          {t("medicationMasterExplorer.modeSearch")}
        </button>
        <button
          type="button"
          onClick={() => setMode("formulary")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: mode === "formulary" ? "2px solid #1e40af" : "1px solid #cbd5e1",
            background: mode === "formulary" ? "#eff6ff" : "#fff",
            fontWeight: 600,
          }}
        >
          {t("medicationMasterExplorer.modeFormulary")}
        </button>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={loading}
          style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8 }}
        >
          {t("medicationMasterExplorer.refresh")}
        </button>
      </div>

      {mode === "search" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadSearch();
          }}
          style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("medicationMasterExplorer.searchPlaceholder")}
            style={{ flex: "1 1 240px", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
          <button type="submit" disabled={loading} style={{ padding: "10px 18px", borderRadius: 8 }}>
            {t("medicationMasterExplorer.searchButton")}
          </button>
        </form>
      ) : null}

      <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <legend style={{ fontWeight: 600 }}>{t("medicationMasterExplorer.filtersTitle")}</legend>
        <ExplorerFilters
          t={t}
          filterEd={filterEd}
          setFilterEd={setFilterEd}
          filterControlled={filterControlled}
          setFilterControlled={setFilterControlled}
          filterHighAlert={filterHighAlert}
          setFilterHighAlert={setFilterHighAlert}
          filterInfusion={filterInfusion}
          setFilterInfusion={setFilterInfusion}
          filterOnFormulary={filterOnFormulary}
          setFilterOnFormulary={setFilterOnFormulary}
          filterBaseline={filterBaseline}
          setFilterBaseline={setFilterBaseline}
          ndcStatus={ndcStatus}
          setNdcStatus={setNdcStatus}
        />
      </fieldset>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <p style={{ fontSize: 13, color: "#64748b" }}>
        {t("medicationMasterExplorer.resultsCount").replace("{count}", String(total))}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 420px)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading && listRows.length === 0 ? <p>{t("common.loading")}</p> : null}
          {!loading && listRows.length === 0 ? (
            <p>{t("medicationMasterExplorer.emptyResults")}</p>
          ) : (
            listRows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => setSelectedConceptId(row.conceptId)}
                style={cardShell(selectedConceptId === row.conceptId)}
              >
                <div style={{ fontWeight: 600 }}>{row.title}</div>
                <div style={{ color: "#475569", fontSize: 13 }}>{row.subtitle}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{row.meta}</div>
                <BadgeRow badges={row.badges} t={t} />
              </button>
            ))
          )}
        </div>

        <aside
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
            position: "sticky",
            top: 16,
            maxHeight: "80vh",
            overflow: "auto",
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{t("medicationMasterExplorer.detailTitle")}</h2>
          {selectedConceptId ? (
            <Link
              href={`/app/admin/medication-master/review/${encodeURIComponent(selectedConceptId)}`}
              style={{
                display: "inline-block",
                marginBottom: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "#1e40af",
              }}
            >
              {t("medicationMasterExplorer.openFullReview")}
            </Link>
          ) : null}
          {detailLoading ? <p>{t("common.loading")}</p> : <DetailPanel detail={detail} t={t} />}
        </aside>
      </div>
    </div>
  );
}

function ExplorerFilters(props: {
  t: (k: string) => string;
  filterEd: boolean;
  setFilterEd: (v: boolean) => void;
  filterControlled: boolean;
  setFilterControlled: (v: boolean) => void;
  filterHighAlert: boolean;
  setFilterHighAlert: (v: boolean) => void;
  filterInfusion: boolean;
  setFilterInfusion: (v: boolean) => void;
  filterOnFormulary: boolean;
  setFilterOnFormulary: (v: boolean) => void;
  filterBaseline: boolean;
  setFilterBaseline: (v: boolean) => void;
  ndcStatus: "any" | "present" | "missing";
  setNdcStatus: (v: "any" | "present" | "missing") => void;
}) {
  const {
    t,
    filterEd,
    setFilterEd,
    filterControlled,
    setFilterControlled,
    filterHighAlert,
    setFilterHighAlert,
    filterInfusion,
    setFilterInfusion,
    filterOnFormulary,
    setFilterOnFormulary,
    filterBaseline,
    setFilterBaseline,
    ndcStatus,
    setNdcStatus,
  } = props;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 14 }}>
      <label>
        <input type="checkbox" checked={filterEd} onChange={(e) => setFilterEd(e.target.checked)} />{" "}
        {t("medicationMasterExplorer.filterEdFormulary")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={filterControlled}
          onChange={(e) => setFilterControlled(e.target.checked)}
        />{" "}
        {t("medicationMasterExplorer.filterControlled")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={filterHighAlert}
          onChange={(e) => setFilterHighAlert(e.target.checked)}
        />{" "}
        {t("medicationMasterExplorer.filterHighAlert")}
      </label>
      <label>
        <input type="checkbox" checked={filterInfusion} onChange={(e) => setFilterInfusion(e.target.checked)} />{" "}
        {t("medicationMasterExplorer.filterInfusion")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={filterOnFormulary}
          onChange={(e) => setFilterOnFormulary(e.target.checked)}
        />{" "}
        {t("medicationMasterExplorer.filterOnFormulary")}
      </label>
      <label>
        <input
          type="checkbox"
          checked={filterBaseline}
          onChange={(e) => setFilterBaseline(e.target.checked)}
        />{" "}
        {t("medicationMasterExplorer.filterGlobalBaseline")}
      </label>
      <label>
        <input type="radio" name="ndc" checked={ndcStatus === "any"} onChange={() => setNdcStatus("any")} />{" "}
        {t("medicationMasterExplorer.filterNdcAny")}
      </label>
      <label>
        <input type="radio" name="ndc" checked={ndcStatus === "present"} onChange={() => setNdcStatus("present")} />{" "}
        {t("medicationMasterExplorer.filterNdcPresent")}
      </label>
      <label>
        <input type="radio" name="ndc" checked={ndcStatus === "missing"} onChange={() => setNdcStatus("missing")} />{" "}
        {t("medicationMasterExplorer.filterNdcMissing")}
      </label>
    </div>
  );
}
