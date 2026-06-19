"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import {
  fetchClinicalDocumentationEntries,
  type ClinicalDocumentationEntryRow,
} from "@/lib/clinicalDocumentationApi";
import {
  MedoraCard,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { EmergencyClinicalDataSummary } from "./EmergencyClinicalDataSummary";
import { EmergencyClinicalDataRecentFeed } from "./EmergencyClinicalDataRecentFeed";

export type EmergencyClinicalDataPanelProps = {
  encounterId: string;
  facilityId: string;
  facilityTimeZone?: string | null;
};

export function EmergencyClinicalDataPanel({
  encounterId,
  facilityId,
  facilityTimeZone,
}: EmergencyClinicalDataPanelProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ClinicalDocumentationEntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetchClinicalDocumentationEntries(encounterId, facilityId);
      setEntries(res.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  return (
    <div data-testid="emergency-clinical-data-panel">
      <MedoraCard leftAccentColor="#0284c7" variant="default">
        <MedoraCardInner>
          <MedoraCardTitle
            title={t("emergencyClinicalData.title")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyClinicalData.subtitle")}
              </p>
            }
          />

          {loadingEntries ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
          ) : (
            <>
              <EmergencyClinicalDataSummary entries={entries} facilityTimeZone={facilityTimeZone} />
              <EmergencyClinicalDataRecentFeed entries={entries} facilityTimeZone={facilityTimeZone} />
            </>
          )}

          <div style={{ marginTop: 14 }}>
            <ClinicalDocumentationHub
              careSetting="ED"
              encounterId={encounterId}
              facilityId={facilityId}
              accessMode="review"
              showHeader={false}
              showSavedEntries={false}
              externalEntries={entries}
              externalEntriesLoading={loadingEntries}
              skipEntriesFetch
            />
          </div>
        </MedoraCardInner>
      </MedoraCard>
    </div>
  );
}
