"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingClassification } from "@medora/shared";
import { BillingClassificationBadge } from "@/components/encounters/BillingClassificationBadge";
import { BillingClassificationChangeModal } from "@/components/encounters/BillingClassificationChangeModal";
import { fetchBillingClassificationOptions } from "@/lib/billingClassificationApi";
import { useI18n } from "@/lib/i18n";

type Props = {
  encounterId: string;
  facilityId: string;
  classification: string | null | undefined;
  encounterOpen?: boolean;
  canEdit?: boolean;
  onUpdated?: () => void | Promise<void>;
};

export function BillingClassificationBadgeInteractive({
  encounterId,
  facilityId,
  classification,
  encounterOpen = true,
  canEdit = true,
  onUpdated,
}: Props) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowedTargets, setAllowedTargets] = useState<BillingClassification[]>([]);
  const [allowChange, setAllowChange] = useState(false);
  const [target, setTarget] = useState<BillingClassification | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const opts = await fetchBillingClassificationOptions(facilityId, encounterId);
      setAllowedTargets(opts.allowedTargets);
      setAllowChange(opts.allowChange && canEdit && encounterOpen);
    } catch {
      setAllowedTargets([]);
      setAllowChange(false);
    } finally {
      setLoading(false);
    }
  }, [canEdit, encounterId, encounterOpen, facilityId]);

  useEffect(() => {
    if (menuOpen) void loadOptions();
  }, [menuOpen, loadOptions]);

  const interactive = canEdit && encounterOpen;

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => {
          if (!interactive) return;
          setMenuOpen((v) => !v);
        }}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: interactive ? "pointer" : "default",
        }}
        aria-label={t("billingClassification.badgeActionLabel")}
        title={interactive ? t("billingClassification.badgeActionHint") : undefined}
      >
        <BillingClassificationBadge classification={classification} t={t} />
      </button>
      {menuOpen && interactive ? (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 1400 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 1401,
              minWidth: 200,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              padding: 6,
            }}
          >
            <p style={{ margin: "4px 8px 8px", fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              {t("billingClassification.changeToLabel")}
            </p>
            {loading ? (
              <p style={{ margin: 8, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
            ) : allowChange && allowedTargets.length > 0 ? (
              allowedTargets.map((to) => (
                <button
                  key={to}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTarget(to);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t(`encounterChrome.billingClassification.${to}`)}
                </button>
              ))
            ) : (
              <p style={{ margin: 8, fontSize: 12, color: "#64748b" }}>{t("billingClassification.noTransitions")}</p>
            )}
          </div>
        </>
      ) : null}
      {target ? (
        <BillingClassificationChangeModal
          encounterId={encounterId}
          facilityId={facilityId}
          currentClassification={classification ?? ""}
          targetClassification={target}
          onUpdated={async () => {
            await onUpdated?.();
          }}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </span>
  );
}
