"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MedicationRecommendationPilotAdvisoryCard } from "@/components/medications/MedicationRecommendationPilotAdvisoryCard";
import { MedicationRecommendationShadowCard } from "@/components/medications/MedicationRecommendationShadowCard";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchPhase16ExposableRecommendations,
  submitPhase16Feedback,
  type Phase16RecommendationRow,
} from "@/lib/medicationPhase16RecommendationApi";
import {
  acknowledgePhase17Advisory,
  disagreePhase17Advisory,
  dismissPhase17Advisory,
  fetchPhase17EncounterAdvisories,
  type Phase17EncounterAdvisories,
} from "@/lib/medicationPhase17PilotApi";

export default function ProviderMedicationRecommendationsPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const canAccess =
    roles.includes("PROVIDER") ||
    roles.includes("RN") ||
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const [rows, setRows] = useState<Phase16RecommendationRow[]>([]);
  const [pilotBundle, setPilotBundle] = useState<Phase17EncounterAdvisories | null>(
    null
  );
  const [encounterId, setEncounterId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadShadow = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    try {
      setRows(await fetchPhase16ExposableRecommendations(facilityId));
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase16Recommendations.errorLoad")
      );
    }
  }, [facilityId, language, t]);

  const loadPilot = useCallback(async () => {
    if (!facilityId || !encounterId.trim()) {
      setPilotBundle(null);
      return;
    }
    setError(null);
    try {
      setPilotBundle(
        await fetchPhase17EncounterAdvisories(facilityId, encounterId.trim())
      );
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : "", language) ||
          t("medicationPhase17Pilot.errorLoad")
      );
    }
  }, [encounterId, facilityId, language, t]);

  useEffect(() => {
    if (ready && facilityId && canAccess) void loadShadow();
  }, [ready, facilityId, canAccess, loadShadow]);

  if (!ready) {
    return <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.loading")}</p>;
  }
  if (!canAccess) {
    return (
      <p style={{ padding: 16 }}>{t("medicationPhase16Recommendations.accessDenied")}</p>
    );
  }

  const showPilot =
    pilotBundle?.mode === "CONTROLLED_PILOT" &&
    (pilotBundle.advisories?.length ?? 0) > 0;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          {t("medicationPhase16Recommendations.providerTitle")}
        </h1>
        <Link href="/app/provider" style={{ fontSize: 14 }}>
          {t("medicationPhase16Recommendations.backProvider")}
        </Link>
        <button type="button" onClick={() => void loadShadow()}>
          {t("medicationPhase16Recommendations.refresh")}
        </button>
      </div>
      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationPhase16Recommendations.providerBanner")}
      </p>
      <p
        style={{
          margin: 0,
          padding: "8px 12px",
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationPhase17Pilot.providerPanelBanner")}
      </p>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "10px 12px",
          display: "grid",
          gap: 8,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>
          {t("medicationPhase17Pilot.encounterAdvisoryTitle")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("medicationPhase17Pilot.encounterAdvisoryHelp")}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
            placeholder={t("medicationPhase17Pilot.encounterIdPlaceholder")}
            style={{ minWidth: 240, padding: "6px 8px" }}
          />
          <button type="button" onClick={() => void loadPilot()}>
            {t("medicationPhase17Pilot.loadAdvisories")}
          </button>
        </div>
        {showPilot ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: "#92400e",
              }}
            >
              {t("medicationPhase17Pilot.providerAdvisoryBanner")}
            </p>
            {pilotBundle!.advisories.map((adv) => (
              <MedicationRecommendationPilotAdvisoryCard
                key={adv.exposureId ?? adv.definitionId ?? adv.title}
                row={{
                  exposureId: adv.exposureId,
                  title: adv.title,
                  reasonSummary: adv.reasonSummary,
                  recommendationKind: adv.recommendationKind,
                  confidenceScore: adv.confidenceScore,
                  evidenceLevel: adv.evidenceLevel,
                  recommendationStrength: adv.recommendationStrength,
                  approvedByUserId: adv.approvedByUserId,
                  approvedAt: adv.approvedAt ?? undefined,
                  version: adv.version,
                  knowledgeVersion: adv.knowledgeVersion,
                  controlledPilot: adv.controlledPilot,
                  structuredPayload: adv.structuredPayload,
                }}
                busy={busyId === adv.exposureId}
                onAcknowledge={() => {
                  if (!facilityId || !adv.exposureId) return;
                  setBusyId(adv.exposureId);
                  void acknowledgePhase17Advisory(facilityId, adv.exposureId)
                    .then(() => loadPilot())
                    .catch((e: unknown) =>
                      setError(
                        normalizeUserFacingError(
                          e instanceof Error ? e.message : "",
                          language
                        ) || t("medicationPhase17Pilot.errorLoad")
                      )
                    )
                    .finally(() => setBusyId(null));
                }}
                onDismiss={() => {
                  if (!facilityId || !adv.exposureId) return;
                  setBusyId(adv.exposureId);
                  void dismissPhase17Advisory(facilityId, adv.exposureId)
                    .then(() => loadPilot())
                    .catch((e: unknown) =>
                      setError(
                        normalizeUserFacingError(
                          e instanceof Error ? e.message : "",
                          language
                        ) || t("medicationPhase17Pilot.errorLoad")
                      )
                    )
                    .finally(() => setBusyId(null));
                }}
                onDisagree={() => {
                  if (!facilityId || !adv.exposureId) return;
                  setBusyId(adv.exposureId);
                  void disagreePhase17Advisory(
                    facilityId,
                    adv.exposureId,
                    "Provider disagreement (informational)"
                  )
                    .then(() => loadPilot())
                    .catch((e: unknown) =>
                      setError(
                        normalizeUserFacingError(
                          e instanceof Error ? e.message : "",
                          language
                        ) || t("medicationPhase17Pilot.errorLoad")
                      )
                    )
                    .finally(() => setBusyId(null));
                }}
              />
            ))}
          </>
        ) : encounterId.trim() && pilotBundle ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            {t("medicationPhase17Pilot.noPilotAuthorization")}
          </p>
        ) : null}
      </section>

      {error ? (
        <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      <h2 style={{ margin: 0, fontSize: 16 }}>
        {t("medicationPhase17Pilot.shadowSectionTitle")}
      </h2>
      {rows.length === 0 ? (
        <p style={{ color: "#64748b", margin: 0 }}>
          {t("medicationPhase16Recommendations.emptyProvider")}
        </p>
      ) : (
        rows.map((row) => (
          <MedicationRecommendationShadowCard
            key={row.id}
            row={row}
            busy={busyId === row.id}
            onAcknowledge={() => {
              if (!facilityId) return;
              setBusyId(row.id);
              void submitPhase16Feedback(facilityId, row.id, {
                feedbackType: "ACKNOWLEDGED",
              })
                .then(() => loadShadow())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase16Recommendations.errorLoad")
                  )
                )
                .finally(() => setBusyId(null));
            }}
            onReject={() => {
              if (!facilityId) return;
              setBusyId(row.id);
              void submitPhase16Feedback(facilityId, row.id, {
                feedbackType: "REJECTED",
                notes: "Provider rejected as information only",
              })
                .then(() => loadShadow())
                .catch((e: unknown) =>
                  setError(
                    normalizeUserFacingError(
                      e instanceof Error ? e.message : "",
                      language
                    ) || t("medicationPhase16Recommendations.errorLoad")
                  )
                )
                .finally(() => setBusyId(null));
            }}
          />
        ))
      )}
    </div>
  );
}
