"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { EmergencyClinicalDataDetailDrawer } from "./EmergencyClinicalDataDetailDrawer";

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
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

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

  const detailEntry = useMemo(
    () => entries.find((entry) => entry.id === detailEntryId) ?? null,
    [entries, detailEntryId]
  );

  return (
    <div data-testid="emergency-clinical-data-panel">
      <MedoraCard leftAccentColor="#0284c7" variant="default">
        <MedoraCardInner>
          <MedoraCardTitle title={t("emergencyClinicalData.title")} />

          {loadingEntries ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 10,
                marginTop: 8,
              }}
            >
              <EmergencyClinicalDataSummary entries={entries} facilityTimeZone={facilityTimeZone} />
              <EmergencyClinicalDataRecentFeed
                entries={entries}
                facilityTimeZone={facilityTimeZone}
                onSelectEntry={setDetailEntryId}
              />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <ClinicalDocumentationHub
              careSetting="ED"
              encounterId={encounterId}
              facilityId={facilityId}
              showHeader={false}
              showSavedEntries={false}
              externalEntries={entries}
              externalEntriesLoading={loadingEntries}
              skipEntriesFetch
              workspaceContext="clinicalData"
              onEntriesChanged={loadEntries}
              focusedCardId={focusedCardId}
            />
          </div>
        </MedoraCardInner>
      </MedoraCard>

      <EmergencyClinicalDataDetailDrawer
        entry={detailEntry}
        open={detailEntryId != null}
        facilityTimeZone={facilityTimeZone}
        onClose={() => setDetailEntryId(null)}
        onOpenForm={(cardId) => {
          setDetailEntryId(null);
          setFocusedCardId(cardId);
        }}
      />
    </div>
  );
}
