"use client";

/**
 * D4A.2.7C — Observation active workspace.
 * Primary header from observation-operations bootstrap (not generic encounter GET).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  observationNursingNav,
  observationProviderNav,
  type HospitalWorkspaceBootstrapV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { OBSERVATION_CENSUS_PATH, isObservationWorkspaceEnabledInBrowser } from "./observationWorkspacePaths";
import {
  parseObservationWorkspaceSection,
  type ObservationWorkspaceSection,
} from "./observationWorkspaceSections";
import { ObservationWorkspaceSectionNav } from "./ObservationWorkspaceSectionNav";
import { ObservationWorkspacePanel } from "./ObservationWorkspacePanel";
import { EnterpriseHospitalPatientHeader } from "@/features/inpatient-workspace/EnterpriseHospitalPatientHeader";
import { fetchObservationWorkspaceBootstrap } from "@/features/hospital-care/observationOperationsApi";

export function ObservationActiveWorkspaceView({
  forcedAudience,
}: {
  forcedAudience?: "PROVIDER" | "NURSING";
} = {}) {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { facilityId } = useFacilityAndRoles();
  const encounterId = String(params?.id ?? "").trim();
  const workspaceEnabled = isObservationWorkspaceEnabledInBrowser();

  const providerNav = observationProviderNav() as ObservationWorkspaceSection[];
  const nursingNav = observationNursingNav() as ObservationWorkspaceSection[];
  const allowed =
    forcedAudience === "PROVIDER"
      ? providerNav
      : forcedAudience === "NURSING"
        ? nursingNav
        : [...new Set([...providerNav, ...nursingNav])];

  const role =
    forcedAudience === "PROVIDER"
      ? "PROVIDER"
      : forcedAudience === "NURSING"
        ? "NURSING"
        : "CHART";

  const initialSection =
    parseObservationWorkspaceSection(searchParams.get("section")) ?? allowed[0] ?? "overview";
  const [section, setSection] = useState<ObservationWorkspaceSection>(
    allowed.includes(initialSection) ? initialSection : allowed[0]!
  );
  const [bootstrap, setBootstrap] = useState<HospitalWorkspaceBootstrapV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = parseObservationWorkspaceSection(searchParams.get("section"));
    if (fromUrl && allowed.includes(fromUrl)) setSection(fromUrl);
  }, [searchParams, allowed]);

  const selectSection = useCallback(
    (next: ObservationWorkspaceSection) => {
      if (!allowed.includes(next)) return;
      setSection(next);
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("section", next);
      router.replace(`?${qs.toString()}`, { scroll: false });
    },
    [router, searchParams, allowed]
  );

  const loadBootstrap = useCallback(async () => {
    if (!encounterId) {
      setError(t("observationD3d.workspace.missingId"));
      setBootstrap(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchObservationWorkspaceBootstrap(encounterId, role, { facilityId });
      if (!payload.resolution.ok || !payload.header) {
        setBootstrap(payload);
        setError(
          payload.resolution.ok
            ? t("inpatientRapidConvergenceD4a27c.observation.bootstrapFailed")
            : t(payload.resolution.messageCode) !== payload.resolution.messageCode
              ? t(payload.resolution.messageCode)
              : t("inpatientRapidConvergenceD4a27c.observation.bootstrapFailed")
        );
        return;
      }
      setBootstrap(payload);
    } catch {
      setBootstrap(null);
      setError(t("inpatientRapidConvergenceD4a27c.observation.bootstrapFailed"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, role, t, facilityId]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const writersEnabled = Boolean(bootstrap?.writersEnabled && bootstrap.resolution.ok);
  const encounterLite = useMemo(() => {
    if (!bootstrap?.header) return null;
    return {
      id: bootstrap.header.encounterId,
      status: bootstrap.header.encounterStatus,
      type: bootstrap.header.encounterType,
      admittedAt: bootstrap.header.admittedAt,
      roomLabel: [bootstrap.header.unit, bootstrap.header.room, bootstrap.header.bed]
        .filter(Boolean)
        .join(" / "),
      governedRoomUnit: bootstrap.header.unit,
      assignedProviderName: bootstrap.header.attendingName,
      assignedNurseName: bootstrap.header.assignedRnName,
      patient: {
        id: bootstrap.header.patientId,
        firstName: bootstrap.header.patientName.split(/\s+/)[0] ?? null,
        lastName: bootstrap.header.patientName.split(/\s+/).slice(1).join(" ") || null,
        mrn: bootstrap.header.mrn,
        dob: bootstrap.header.dateOfBirth,
        sexAtBirth: bootstrap.header.sexAtBirth,
      },
    };
  }, [bootstrap]);

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
        ) : error && !bootstrap?.header ? (
          <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : (
          <>
            {bootstrap?.header ? (
              <EnterpriseHospitalPatientHeader
                header={bootstrap.header}
                role={role}
                sticky
              />
            ) : null}

            {!writersEnabled ? (
              <p role="status" style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                {t("inpatientWorkspaceRecoveryD4a27b.unavailable.writersDisabled")}
              </p>
            ) : null}

            {!workspaceEnabled ? (
              <p
                style={{ margin: "0 0 12px", fontSize: 12, color: "#92400e" }}
                data-testid="observation-workspace-flag-off-banner"
              >
                {t("observationD3d.featureUnavailable")}
              </p>
            ) : null}

            <ObservationWorkspaceSectionNav
              active={section}
              onSelect={selectSection}
              allowedSections={allowed}
            />

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
                encounter={encounterLite}
                workspaceEnabled={workspaceEnabled && writersEnabled}
                onRefetchEncounter={loadBootstrap}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
