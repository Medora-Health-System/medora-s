"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { OBSERVATION_CENSUS_PATH, isObservationWorkspaceEnabledInBrowser } from "./observationWorkspacePaths";
import {
  parseObservationWorkspaceSection,
  type ObservationWorkspaceSection,
} from "./observationWorkspaceSections";
import { ObservationWorkspaceSectionNav } from "./ObservationWorkspaceSectionNav";
import { ObservationWorkspacePanel } from "./ObservationWorkspacePanel";

type ObservationEncounterHeader = {
  id: string;
  status?: string | null;
  type?: string | null;
  admittedAt?: string | null;
  roomLabel?: string | null;
  governedRoomUnit?: string | null;
  assignedProviderName?: string | null;
  assignedNurseName?: string | null;
  providerDocumentationStatus?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
  } | null;
};

export function ObservationActiveWorkspaceView() {
  const { t, language } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const encounterId = String(params?.id ?? "").trim();
  const workspaceEnabled = isObservationWorkspaceEnabledInBrowser();

  const initialSection =
    parseObservationWorkspaceSection(searchParams.get("section")) ?? "overview";
  const [section, setSection] = useState<ObservationWorkspaceSection>(initialSection);
  const [encounter, setEncounter] = useState<ObservationEncounterHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = parseObservationWorkspaceSection(searchParams.get("section"));
    if (fromUrl) setSection(fromUrl);
  }, [searchParams]);

  const selectSection = useCallback(
    (next: ObservationWorkspaceSection) => {
      setSection(next);
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("section", next);
      router.replace(`?${qs.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const loadEncounter = useCallback(async () => {
    if (!encounterId) {
      setError(t("observationD3d.workspace.missingId"));
      setEncounter(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`);
      const obj = asApiObject<ObservationEncounterHeader>(raw);
      if (!obj?.id) throw new Error("missing encounter");
      setEncounter(obj);
    } catch {
      setEncounter(null);
      setError(t("observationD3d.workspace.loadError"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, t]);

  useEffect(() => {
    void loadEncounter();
  }, [loadEncounter]);

  const dash = t("common.dash") || DISPLAY_DASH;
  const patientName = useMemo(() => {
    const first = encounter?.patient?.firstName?.trim() ?? "";
    const last = encounter?.patient?.lastName?.trim() ?? "";
    return `${first} ${last}`.trim() || dash;
  }, [encounter, dash]);

  const observationStarted = encounter?.admittedAt
    ? formatEncounterChromeDateTime(encounter.admittedAt, language)
    : dash;

  return (
    <div
      data-testid="observation-active-workspace"
      data-workspace-enabled={workspaceEnabled ? "true" : "false"}
      style={{
        minHeight: "calc(100vh - 48px)",
        background: "#f8fafc",
        padding: "16px 16px 32px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Link
          href={OBSERVATION_CENSUS_PATH}
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "#0f766e",
            marginBottom: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {t("observationD3d.workspace.backCensus")}
        </Link>

        <header style={{ marginBottom: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            {t("observationD3d.workspace.title")}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            {t("observationD3d.workspace.subtitle")}
          </p>
        </header>

        {loading ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
        ) : error ? (
          <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : (
          <>
            <div
              style={{
                ...MEDORA_CARD_SHELL,
                borderRadius: MEDORA_CARD_SHELL.radius,
                border: MEDORA_CARD_SHELL.border,
                background: MEDORA_CARD_SHELL.background,
                boxShadow: MEDORA_CARD_SHELL.boxShadow,
                padding: 14,
                marginBottom: 12,
              }}
              data-testid="observation-workspace-header"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.patient")}
                  </div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{patientName}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.mrn")}
                  </div>
                  <div>{encounter?.patient?.mrn?.trim() || dash}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.observationTime")}
                  </div>
                  <div>{observationStarted}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.unit")}
                  </div>
                  <div>{encounter?.governedRoomUnit?.trim() || dash}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.bed")}
                  </div>
                  <div>{encounter?.roomLabel?.trim() || dash}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.provider")}
                  </div>
                  <div>{encounter?.assignedProviderName?.trim() || dash}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.nurse")}
                  </div>
                  <div>{encounter?.assignedNurseName?.trim() || dash}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                    {t("observationD3d.workspace.status")}
                  </div>
                  <div>{encounter?.status?.trim() || dash}</div>
                </div>
              </div>
              {!workspaceEnabled ? (
                <p
                  style={{ margin: "12px 0 0", fontSize: 12, color: "#92400e" }}
                  data-testid="observation-workspace-flag-off-banner"
                >
                  {t("observationD3d.featureUnavailable")}
                </p>
              ) : null}
            </div>

            <ObservationWorkspaceSectionNav active={section} onSelect={selectSection} />

            <div
              style={{
                ...MEDORA_CARD_SHELL,
                borderRadius: MEDORA_CARD_SHELL.radius,
                border: MEDORA_CARD_SHELL.border,
                background: MEDORA_CARD_SHELL.background,
                boxShadow: MEDORA_CARD_SHELL.boxShadow,
                padding: 16,
              }}
            >
              <ObservationWorkspacePanel
                section={section}
                encounterId={encounterId}
                encounter={encounter}
                workspaceEnabled={workspaceEnabled}
                onRefetchEncounter={loadEncounter}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
