"use client";

import { useEffect, useState } from "react";
import {
  fetchEncounterBillingExportReadiness,
  type EncounterBillingExportReadinessPayload,
} from "@/lib/billingExportReadinessApi";
import { billingExportReadinessProviderSummaryKey } from "@/lib/billingExportReadinessDisplay";
import { useI18n } from "@/lib/i18n";

type Props = {
  facilityId: string | null;
  encounterId: string;
  enabled: boolean;
};

/** Minimal one-line billing export readiness — does not block clinical workflow. */
export function EncounterBillingExportReadinessHint({ facilityId, encounterId, enabled }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<EncounterBillingExportReadinessPayload | null>(null);

  useEffect(() => {
    if (!enabled || !facilityId || !encounterId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void fetchEncounterBillingExportReadiness(facilityId, encounterId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, facilityId, encounterId]);

  if (!enabled || !data) return null;

  return (
    <span
      data-testid="billing-export-readiness-hint"
      style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}
      title={t("billingExportReadiness.previewOnlyDisclaimer")}
    >
      {t(
        billingExportReadinessProviderSummaryKey({
          requiresManualReview: data.requiresManualReview,
          route: data.route,
        }),
      )}
    </span>
  );
}
