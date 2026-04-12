"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { DiseaseNotifiableCatalogItem } from "@/lib/publicHealthApi";
import { Field, inputStyle } from "@/components/pharmacy/Modal";

const errText: React.CSSProperties = {
  fontSize: 12,
  color: "#b91c1c",
  marginTop: 4,
  fontWeight: 600,
};

const DROP_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const DROP_LIST: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  zIndex: 20,
  marginTop: 4,
  maxHeight: 220,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
  padding: "6px 0",
};

const GROUP_HEAD: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "6px 12px 4px",
};

const OPTION_ROW: React.CSSProperties = {
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 14,
  color: "#0f172a",
  border: "none",
  background: "transparent",
  width: "100%",
  textAlign: "left",
};

const ROW_INNER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px 8px",
  width: "100%",
};

function reportingCategoryForEntry(e: DiseaseNotifiableCatalogItem): "IMMEDIATE" | "WEEKLY" | "ROUTINE" {
  if (e.reportingCategory) return e.reportingCategory;
  if (e.surveillanceGroup === "IMMEDIATE") return "IMMEDIATE";
  if (e.surveillanceGroup === "WEEKLY") return "WEEKLY";
  return "ROUTINE";
}

function reportingCategoryBadgeStyle(cat: "IMMEDIATE" | "WEEKLY" | "ROUTINE"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.2,
    padding: "2px 7px",
    borderRadius: 9999,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
  if (cat === "IMMEDIATE") {
    return { ...base, background: "rgba(220,38,38,0.14)", color: "#991b1b" };
  }
  if (cat === "WEEKLY") {
    return { ...base, background: "rgba(59,130,246,0.14)", color: "#1d4ed8" };
  }
  return { ...base, background: "rgba(100,116,139,0.14)", color: "#475569" };
}

function normalizeSearch(s: string): string {
  try {
    return s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .trim();
  } catch {
    return s.toLowerCase().trim();
  }
}

function haystack(e: DiseaseNotifiableCatalogItem): string {
  return normalizeSearch([e.code, e.labelFr, ...e.aliasesFr].join(" "));
}

export function findCatalogEntryByCode(
  catalog: DiseaseNotifiableCatalogItem[],
  code: string
): DiseaseNotifiableCatalogItem | undefined {
  const t = code.trim().toLowerCase();
  if (!t) return undefined;
  return catalog.find((e) => e.code.toLowerCase() === t);
}

function filterCatalog(
  catalog: DiseaseNotifiableCatalogItem[],
  query: string,
  max = 24
): DiseaseNotifiableCatalogItem[] {
  const needle = normalizeSearch(query);
  if (needle.length < 2) return [];
  const out = catalog.filter((e) => haystack(e).includes(needle));
  const order = (g: DiseaseNotifiableCatalogItem["surveillanceGroup"]) =>
    g === "IMMEDIATE" ? 0 : g === "WEEKLY" ? 1 : 2;
  out.sort((a, b) => {
    const og = order(a.surveillanceGroup) - order(b.surveillanceGroup);
    if (og !== 0) return og;
    return a.labelFr.localeCompare(b.labelFr, "fr");
  });
  return out.slice(0, max);
}

type Props = {
  catalog: DiseaseNotifiableCatalogItem[];
  diseaseName: string;
  diseaseCode: string;
  onChangeName: (v: string) => void;
  onChangeCode: (v: string) => void;
  markDirty: () => void;
  showInvalidHintName: boolean;
  showInvalidHintCode: boolean;
  requiredStar: string;
};

export function DiseaseCatalogCombobox({
  catalog,
  diseaseName,
  diseaseCode,
  onChangeName,
  onChangeCode,
  markDirty,
  showInvalidHintName,
  showInvalidHintCode,
  requiredStar,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterCatalog(catalog, diseaseName),
    [catalog, diseaseName]
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const groupLabel = (g: DiseaseNotifiableCatalogItem["surveillanceGroup"]) => {
    if (g === "IMMEDIATE") return t("diseaseReports.catalogGroupImmediate");
    if (g === "WEEKLY") return t("diseaseReports.catalogGroupWeekly");
    return t("diseaseReports.catalogGroupOther");
  };

  const handlePick = (entry: DiseaseNotifiableCatalogItem) => {
    markDirty();
    onChangeName(entry.labelFr);
    onChangeCode(entry.code);
    setOpen(false);
  };

  const handleNameChange = (v: string) => {
    markDirty();
    onChangeName(v);
    setOpen(normalizeSearch(v).length >= 2);
  };

  const handleCodeChange = (v: string) => {
    markDirty();
    onChangeCode(v);
    const hit = findCatalogEntryByCode(catalog, v);
    if (hit) onChangeName(hit.labelFr);
  };

  return (
    <>
      <Field label={`${t("diseaseReports.diseaseName")}${requiredStar}`}>
        <div style={DROP_WRAP} ref={wrapRef}>
          <input
            style={inputStyle}
            autoComplete="off"
            value={diseaseName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => {
              if (normalizeSearch(diseaseName).length >= 2) setOpen(true);
            }}
            placeholder={t("diseaseReports.diseaseNamePlaceholder")}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {open && filtered.length > 0 ? (
            <div style={DROP_LIST} role="listbox">
              {(["IMMEDIATE", "WEEKLY", "OTHER"] as const).map((g) => {
                const rows = filtered.filter((e) => e.surveillanceGroup === g);
                if (rows.length === 0) return null;
                return (
                  <div key={g}>
                    <div style={GROUP_HEAD}>{groupLabel(g)}</div>
                    {rows.map((e) => {
                      const rc = reportingCategoryForEntry(e);
                      const badgeKey =
                        rc === "IMMEDIATE"
                          ? "diseaseReports.reportingBadgeImmediate"
                          : rc === "WEEKLY"
                            ? "diseaseReports.reportingBadgeWeekly"
                            : "diseaseReports.reportingBadgeRoutine";
                      return (
                        <button
                          key={e.code}
                          type="button"
                          role="option"
                          style={OPTION_ROW}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            handlePick(e);
                          }}
                        >
                          <span style={ROW_INNER}>
                            <span style={{ fontWeight: 600, flex: "1 1 120px", minWidth: 0 }}>{e.labelFr}</span>
                            <span style={{ color: "#64748b", fontSize: 12 }}>({e.code})</span>
                            <span style={reportingCategoryBadgeStyle(rc)}>{t(badgeKey)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
          {open && normalizeSearch(diseaseName).length >= 2 && catalog.length > 0 && filtered.length === 0 ? (
            <div
              style={{
                ...DROP_LIST,
                padding: "10px 12px",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {t("diseaseReports.catalogNoMatch")}
            </div>
          ) : null}
        </div>
        {normalizeSearch(diseaseName).length > 0 && normalizeSearch(diseaseName).length < 2 ? (
          <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
            {t("diseaseReports.catalogMinChars")}
          </span>
        ) : null}
        {showInvalidHintName ? <div style={errText}>{t("diseaseReports.validationDiseaseName")}</div> : null}
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.diseaseComboboxHint")}
        </span>
      </Field>

      <Field label={`${t("diseaseReports.diseaseCode")}${requiredStar}`}>
        <input
          style={inputStyle}
          value={diseaseCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder={t("diseaseReports.diseaseCodePlaceholder")}
          autoComplete="off"
        />
        {showInvalidHintCode ? <div style={errText}>{t("diseaseReports.validationDiseaseCode")}</div> : null}
        <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
          {t("diseaseReports.diseaseCodeCatalogHint")}
        </span>
      </Field>
    </>
  );
}
