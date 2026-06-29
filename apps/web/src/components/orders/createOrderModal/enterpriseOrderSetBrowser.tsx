"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { enterpriseOrderSetByCode } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import type { EnterpriseOrderSetAuthority, EnterpriseOrderSetCategory } from "@medora/shared";
import {
  buildEnterpriseOrderSetBrowserModel,
  isRnStandingOrderSet,
  resolveOrderSetTitle,
  toOrderSetUiItems,
  orderSetWarningsForLocale,
  type OrderSetKey,
} from "./enterpriseOrderSetAdapter";

const SHELL_BORDER = "#e2e8f0";
const CANVAS = "#f8fafc";
const ACTIVE_BORDER = "#1a1a1a";

function listButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 10px",
    border: active ? `1px solid ${ACTIVE_BORDER}` : `1px solid ${SHELL_BORDER}`,
    borderRadius: 8,
    background: active ? "#fff" : CANVAS,
    color: "#1f2937",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    fontWeight: active ? 700 : 600,
    width: "100%",
  };
}

export function EnterpriseOrderSetBrowser({
  selected,
  checkedItemKeys,
  onSelect,
  onToggleItem,
  onApply,
  canApply,
  applying,
  onOpenEkgDocumentation,
  locale,
  canPrescribe,
  hasRnStandingOrderAuthority,
  roleCodes,
  browserAuthority,
  onBrowserAuthorityChange,
  browserCategory,
  onBrowserCategoryChange,
  searchQuery,
  onSearchQueryChange,
  t,
}: {
  selected: OrderSetKey;
  checkedItemKeys: string[];
  onSelect: (key: OrderSetKey) => void;
  onToggleItem: (itemKey: string) => void;
  onApply: () => void;
  canApply: boolean;
  applying: boolean;
  onOpenEkgDocumentation?: () => void;
  locale: SupportedLanguage;
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
  browserAuthority: EnterpriseOrderSetAuthority | null;
  onBrowserAuthorityChange: (authority: EnterpriseOrderSetAuthority) => void;
  browserCategory: EnterpriseOrderSetCategory | null;
  onBrowserCategoryChange: (category: EnterpriseOrderSetCategory) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  t: (key: string) => string;
}) {
  const browserModel = useMemo(
    () =>
      buildEnterpriseOrderSetBrowserModel({
        query: searchQuery,
        activeAuthority: browserAuthority,
        activeCategory: browserCategory,
        locale,
        canPrescribe,
        hasRnStandingOrderAuthority,
        roleCodes,
      }),
    [
      browserAuthority,
      browserCategory,
      canPrescribe,
      hasRnStandingOrderAuthority,
      locale,
      roleCodes,
      searchQuery,
    ]
  );

  const selectedSet = enterpriseOrderSetByCode(selected);
  const visibleSets =
    browserModel.mode === "search" ? browserModel.searchResults : browserModel.categorySets;

  const items = useMemo(
    () => (selectedSet ? toOrderSetUiItems(selectedSet, locale) : []),
    [selectedSet, locale]
  );
  const checkedCount = checkedItemKeys.length;
  const totalCount = items.length;
  const checkedSet = new Set(checkedItemKeys);
  const selectedCountLabel = t("createOrderModal.orderSetsSelectedCount")
    .replace("{selected}", String(checkedCount))
    .replace("{total}", String(totalCount));
  const applyingBundleLabel = t("createOrderModal.orderSetsApplyingBundle").replace(
    "{bundle}",
    selectedSet ? resolveOrderSetTitle(selectedSet, locale) : selected
  );
  const warnings = selectedSet ? orderSetWarningsForLocale(selectedSet, locale) : [];

  const handleSelectSet = (code: OrderSetKey) => {
    onSelect(code);
    const set = enterpriseOrderSetByCode(code);
    if (set && browserModel.mode === "browse") {
      if (isRnStandingOrderSet(set)) {
        onBrowserAuthorityChange("RN_STANDING_ORDER");
      } else {
        onBrowserAuthorityChange("PROVIDER_ORDER_SET");
      }
      onBrowserCategoryChange(set.category);
    }
  };

  const browseGridColumns =
    browserModel.authoritySections.length > 1
      ? "minmax(96px, 0.5fr) minmax(108px, 0.55fr) minmax(132px, 0.65fr) minmax(200px, 1fr)"
      : "minmax(108px, 0.55fr) minmax(132px, 0.65fr) minmax(200px, 1fr)";

  return (
    <div data-testid="enterprise-order-set-browser">
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
        {t("createOrderModal.orderSetsSectionTitle")}
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64", lineHeight: 1.4 }}>
        {t("createOrderModal.orderSetsIntro")}
      </p>
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={t("createOrderModal.orderSetsSearchPlaceholder")}
        data-testid="enterprise-order-set-search"
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: 10,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${SHELL_BORDER}`,
          fontSize: 13,
          background: "#fff",
        }}
      />
      <div
        data-testid="enterprise-order-set-preview"
        style={{
          display: "grid",
          gridTemplateColumns:
            browserModel.mode === "search"
              ? "minmax(160px, 0.85fr) minmax(220px, 1.15fr)"
              : browseGridColumns,
          gap: 10,
          alignItems: "stretch",
        }}
      >
        {browserModel.mode === "browse" && browserModel.authoritySections.length > 1 ? (
          <div
            data-testid="enterprise-order-set-browser-authorities"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 340,
              overflowY: "auto",
              padding: "4px 2px",
              border: `1px solid ${SHELL_BORDER}`,
              borderRadius: 10,
              background: CANVAS,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                padding: "4px 8px 2px",
              }}
            >
              {t("createOrderModal.orderSetsBrowserAuthorities")}
            </div>
            {browserModel.authoritySections.map((section) => {
              const active = section.authority === browserModel.activeAuthority;
              const setCount = section.groups.reduce((sum, group) => sum + group.sets.length, 0);
              return (
                <button
                  key={section.authority}
                  type="button"
                  data-testid={`enterprise-order-set-browser-authority-${section.authority}`}
                  onClick={() => onBrowserAuthorityChange(section.authority)}
                  style={{
                    ...listButtonStyle(active),
                    fontSize: 12,
                    padding: "7px 8px",
                  }}
                >
                  {t(`createOrderModal.orderSetsBrowserAuthority.${section.authority}`)}
                  <span style={{ marginLeft: 6, color: "#94a3b8", fontWeight: 600 }}>({setCount})</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {browserModel.mode === "browse" ? (
          <div
            data-testid="enterprise-order-set-browser-categories"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 340,
              overflowY: "auto",
              padding: "4px 2px",
              border: `1px solid ${SHELL_BORDER}`,
              borderRadius: 10,
              background: CANVAS,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                padding: "4px 8px 2px",
              }}
            >
              {t("createOrderModal.orderSetsBrowserCategories")}
            </div>
            {browserModel.groups.map((group) => {
              const active = group.category === browserModel.activeCategory;
              return (
                <button
                  key={group.category}
                  type="button"
                  data-testid={`enterprise-order-set-browser-category-${group.category}`}
                  onClick={() => onBrowserCategoryChange(group.category)}
                  style={{
                    ...listButtonStyle(active),
                    fontSize: 12,
                    padding: "7px 8px",
                  }}
                >
                  {t(`createOrderModal.orderSetsCategory.${group.category}`)}
                  <span style={{ marginLeft: 6, color: "#94a3b8", fontWeight: 600 }}>
                    ({group.sets.length})
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          data-testid="enterprise-order-set-browser-sets"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 340,
            overflowY: "auto",
            padding: "4px 2px",
            border: `1px solid ${SHELL_BORDER}`,
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              padding: "4px 8px 2px",
            }}
          >
            {browserModel.mode === "search"
              ? t("createOrderModal.orderSetsBrowserSearchResults")
              : browserModel.activeCategory
                ? t("createOrderModal.orderSetsBrowserSelectedCategory").replace(
                    "{category}",
                    t(`createOrderModal.orderSetsCategory.${browserModel.activeCategory}`)
                  )
                : t("createOrderModal.orderSetsBrowserAllOrderSets")}
          </div>
          {visibleSets.length === 0 ? (
            <div
              data-testid="enterprise-order-set-browser-no-results"
              style={{ padding: "12px 8px", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}
            >
              {t("createOrderModal.orderSetsBrowserNoResults")}
            </div>
          ) : (
            visibleSets.map((set) => {
              const active = set.code === selected;
              return (
                <button
                  key={set.code}
                  type="button"
                  data-testid={`enterprise-order-set-browser-set-${set.code}`}
                  onClick={() => handleSelectSet(set.code)}
                  style={listButtonStyle(active)}
                >
                  {resolveOrderSetTitle(set, locale)}
                </button>
              );
            })
          )}
        </div>

        <div
          style={{
            border: `1px solid ${SHELL_BORDER}`,
            borderRadius: 10,
            background: "#fff",
            padding: 12,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {selectedSet ? resolveOrderSetTitle(selectedSet, locale) : ""}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{selectedCountLabel}</div>
          </div>
          {selectedSet ? (
            <div style={{ marginBottom: 10 }}>
              <span
                data-testid="enterprise-order-set-authority-badge"
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: 9999,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  background: isRnStandingOrderSet(selectedSet) ? "#ede9fe" : "#e0f2fe",
                  color: isRnStandingOrderSet(selectedSet) ? "#5b21b6" : "#0c4a6e",
                }}
              >
                {t(
                  isRnStandingOrderSet(selectedSet)
                    ? "createOrderModal.orderSetsStandingOrderBadge"
                    : "createOrderModal.orderSetsProviderSetBadge"
                )}
              </span>
            </div>
          ) : null}
          {warnings.length > 0 ? (
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {warnings.map((warning) => (
                <div
                  key={warning}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #fde68a",
                    background: "#fffbeb",
                    color: "#92400e",
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {items.map((item) => (
              <label
                key={item.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px auto 1fr",
                  gap: 8,
                  alignItems: "center",
                  padding: "7px 8px",
                  border: `1px solid ${SHELL_BORDER}`,
                  borderRadius: 8,
                  background: checkedSet.has(item.key) ? CANVAS : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedSet.has(item.key)}
                  onChange={() => onToggleItem(item.key)}
                  style={{ width: 14, height: 14, margin: 0 }}
                />
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 9999,
                    background: item.type === "LAB" ? "#e3f2fd" : item.type === "IMAGING" ? "#e0f7fa" : "#f3e5f5",
                    color: item.type === "LAB" ? "#0d47a1" : item.type === "IMAGING" ? "#006064" : "#6a1b9a",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.3,
                  }}
                >
                  {t(`createOrderModal.orderSetType.${item.type}`)}
                </span>
                <span>
                  {item.displayLabel}
                  {item.required ? (
                    <span style={{ marginLeft: 6, color: "#64748b", fontSize: 11, fontWeight: 700 }}>
                      {t("createOrderModal.orderSetRecommendedBadge")}
                    </span>
                  ) : null}
                  {!item.required ? (
                    <span style={{ marginLeft: 6, color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                      {t("createOrderModal.orderSetOptionalBadge")}
                    </span>
                  ) : null}
                  {item.requiresStructuredParameters ? (
                    <span style={{ marginLeft: 6, color: "#9a3412", fontSize: 11, fontWeight: 700 }}>
                      {t("createOrderModal.orderSetStructuredParametersBadge")}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          {selected === "ed_chest_pain_v1" && onOpenEkgDocumentation ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px dashed #93c5fd",
                background: CANVAS,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                {t("createOrderModal.orderSetEcgProcedureHint")}
              </div>
              <button
                type="button"
                onClick={onOpenEkgDocumentation}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #1d4ed8",
                  borderRadius: 8,
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t("createOrderModal.orderSetDocumentEcgButton")}
              </button>
            </div>
          ) : null}
          {checkedCount === 0 ? (
            <p style={{ margin: "0 0 12px", color: "#b45309", fontSize: 12, fontWeight: 600 }}>
              {t("createOrderModal.orderSetsNoneSelectedWarning")}
            </p>
          ) : null}
          <div style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
            {applyingBundleLabel}
          </div>
          <button
            type="button"
            disabled={!canApply || applying}
            onClick={onApply}
            title={
              checkedCount === 0
                ? t("createOrderModal.orderSetsNoneSelectedWarning")
                : !canApply
                  ? t("createOrderModal.orderSetsApplyDisabledHelp")
                  : undefined
            }
            data-testid="enterprise-order-set-apply"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: canApply ? `1px solid ${ACTIVE_BORDER}` : `1px solid ${SHELL_BORDER}`,
              borderRadius: 8,
              background: canApply ? ACTIVE_BORDER : "#eef2f7",
              color: canApply ? "#fff" : "#64748b",
              cursor: canApply && !applying ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {applying ? t("createOrderModal.orderSetsApplying") : t("createOrderModal.orderSetsApply")}
          </button>
        </div>
      </div>
    </div>
  );
}
