"use client";

/**
 * D4A.2.7B — Inpatient active workspace shell.
 * Bootstrap via inpatient-operations (type-gated). Blocks writers when unresolved.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  providerPrimaryNav,
  nursingPrimaryNav,
  technicianPrimaryNav,
  type EncounterResolutionFailureCategory,
  type HospitalWorkspaceBootstrapV1,
  type InpatientWorkspaceRole,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  INPATIENT_CENSUS_PATH,
  isInpatientWorkspaceEnabledInBrowser,
  inpatientNursingWorkspacePath,
  inpatientProviderWorkspacePath,
  inpatientSharedChartPath,
  inpatientTechnicianWorkspacePath,
} from "./inpatientWorkspacePaths";
import {
  parseInpatientWorkspaceSection,
  type InpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { InpatientWorkspaceSectionNav } from "./InpatientWorkspaceSectionNav";
import { InpatientWorkspacePanel } from "./InpatientWorkspacePanel";
import { EnterpriseHospitalPatientHeader } from "./EnterpriseHospitalPatientHeader";
import { InpatientEncounterUnavailablePanel } from "./InpatientEncounterUnavailablePanel";
import { fetchInpatientWorkspaceBootstrap } from "@/features/hospital-care/inpatientOperationsApi";
import { emergencyActiveWorkspacePath } from "@/features/emergency/emergencyRoutes";
import { observationActiveWorkspacePath } from "@/features/observation-workspace/observationWorkspacePaths";
import { classifyInpatientBootstrapClientError } from "./inpatientBootstrapClientErrors";

function roleFromPath(pathname: string): InpatientWorkspaceRole {
  if (pathname.endsWith("/provider")) return "PROVIDER";
  if (pathname.endsWith("/nursing")) return "NURSING";
  if (pathname.endsWith("/technician")) return "TECHNICIAN";
  if (pathname.endsWith("/chart")) return "CHART";
  return "CHART";
}

function defaultRoleFromAuth(roles: string[]): InpatientWorkspaceRole {
  const set = new Set(roles.map((r) => r.toUpperCase()));
  if (set.has("PROVIDER")) return "PROVIDER";
  if (set.has("RN")) return "NURSING";
  if (set.has("LAB") || set.has("RADIOLOGY")) return "TECHNICIAN";
  return "CHART";
}

function filterSectionsForRole(
  role: InpatientWorkspaceRole
): InpatientWorkspaceSection[] {
  const list =
    role === "PROVIDER"
      ? providerPrimaryNav()
      : role === "NURSING"
        ? nursingPrimaryNav()
        : role === "TECHNICIAN"
          ? technicianPrimaryNav()
          : providerPrimaryNav();
  return list as InpatientWorkspaceSection[];
}

export function InpatientActiveWorkspaceView({
  forcedRole,
}: {
  forcedRole?: InpatientWorkspaceRole;
}) {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { roles, ready: authReady } = useFacilityAndRoles();
  const encounterId = String(params?.id ?? "").trim();
  const workspaceEnabled = isInpatientWorkspaceEnabledInBrowser();

  const pathRole = forcedRole ?? roleFromPath(pathname);
  const [role, setRole] = useState<InpatientWorkspaceRole>(pathRole);

  useEffect(() => {
    if (forcedRole) {
      setRole(forcedRole);
      return;
    }
    if (pathname.match(/\/(provider|nursing|technician|chart)$/)) {
      setRole(roleFromPath(pathname));
      return;
    }
    if (authReady) {
      const preferred = defaultRoleFromAuth(roles);
      setRole(preferred);
      const target =
        preferred === "PROVIDER"
          ? inpatientProviderWorkspacePath(encounterId)
          : preferred === "NURSING"
            ? inpatientNursingWorkspacePath(encounterId)
            : preferred === "TECHNICIAN"
              ? inpatientTechnicianWorkspacePath(encounterId)
              : inpatientSharedChartPath(encounterId);
      if (encounterId && !pathname.endsWith(`/${preferred.toLowerCase()}`) && !pathname.endsWith("/chart")) {
        router.replace(target);
      }
    }
  }, [forcedRole, pathname, authReady, roles, encounterId, router]);

  const allowed = filterSectionsForRole(role);
  const initialSection =
    parseInpatientWorkspaceSection(searchParams.get("section")) ?? allowed[0] ?? "overview";
  const [section, setSection] = useState<InpatientWorkspaceSection>(
    allowed.includes(initialSection) ? initialSection : allowed[0] ?? "overview"
  );
  const [bootstrap, setBootstrap] = useState<HospitalWorkspaceBootstrapV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCategory, setErrorCategory] = useState<
    EncounterResolutionFailureCategory | string | null
  >(null);

  useEffect(() => {
    const fromUrl = parseInpatientWorkspaceSection(searchParams.get("section"));
    if (fromUrl && allowed.includes(fromUrl)) setSection(fromUrl);
  }, [searchParams, allowed]);

  const selectSection = useCallback(
    (next: InpatientWorkspaceSection) => {
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
      setBootstrap(null);
      setErrorCategory("MISSING_ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorCategory(null);
    try {
      const data = await fetchInpatientWorkspaceBootstrap(encounterId, role);
      setBootstrap(data);
      if (!data.resolution.ok) {
        setErrorCategory(data.resolution.category);
      }
    } catch (err) {
      setBootstrap(null);
      setErrorCategory(classifyInpatientBootstrapClientError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId, role]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  const writersEnabled = Boolean(bootstrap?.writersEnabled && bootstrap.resolution.ok);
  const header = bootstrap?.header ?? null;

  const encounterLite = useMemo(() => {
    if (!header || !bootstrap?.resolution.ok) return null;
    return {
      id: header.encounterId,
      status: header.encounterStatus,
      type: header.encounterType,
      providerDocumentationStatus: null,
      patient: {
        id: header.patientId,
        firstName: header.patientName.split(/\s+/)[0] ?? null,
        lastName: header.patientName.split(/\s+/).slice(1).join(" ") || null,
        mrn: header.mrn,
        dob: header.dateOfBirth,
        sexAtBirth: header.sexAtBirth,
      },
    };
  }, [header, bootstrap]);

  const sourceHref = useMemo(() => {
    if (!bootstrap || bootstrap.resolution.ok) return null;
    const actual = bootstrap.resolution.actualEncounterType;
    if (!actual || !encounterId) return null;
    const upper = String(actual).toUpperCase();
    if (upper === "EMERGENCY") return emergencyActiveWorkspacePath(encounterId);
    if (upper.includes("OBS")) return observationActiveWorkspacePath(encounterId);
    return null;
  }, [bootstrap, encounterId]);

  return (
    <div style={{ padding: "12px 16px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <Link href={INPATIENT_CENSUS_PATH} style={{ fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
          {t("inpatientD3e.workspace.backCensus")}
        </Link>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {t("inpatientWorkspaceRecoveryD4a27b.roleLabel")}:{" "}
          <strong>{t(`inpatientWorkspaceRecoveryD4a27b.roles.${role}`)}</strong>
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : errorCategory || !writersEnabled || !header ? (
        <InpatientEncounterUnavailablePanel
          category={errorCategory ?? "UNKNOWN"}
          requestedEncounterId={encounterId}
          actualEncounterType={
            bootstrap && !bootstrap.resolution.ok
              ? bootstrap.resolution.actualEncounterType
              : null
          }
          onRetry={() => void loadBootstrap()}
          sourceEncounterHref={sourceHref}
          showTechnical={roles.includes("ADMIN")}
        />
      ) : (
        <>
          <EnterpriseHospitalPatientHeader
            header={header}
            onOpenOrders={() => selectSection("orders")}
            onOpenMar={() => selectSection("medications")}
            onOpenResults={() => selectSection("results")}
          />

          <InpatientWorkspaceSectionNav
            active={section}
            onSelect={selectSection}
            allowedSections={allowed}
          />

          <section style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px" }}>
            {!workspaceEnabled ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>
                {t("inpatientWorkspaceRecoveryD4a27b.states.NOT_CONFIGURED")}
              </p>
            ) : (
              <InpatientWorkspacePanel
                section={section}
                encounterId={encounterId}
                encounter={encounterLite}
                workspaceEnabled={workspaceEnabled}
                writersEnabled={writersEnabled}
                workspaceRole={role}
                onRefetchEncounter={loadBootstrap}
                onNavigateSection={selectSection}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
