"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { computeHospitalDay } from "@medora/shared";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  INPATIENT_CENSUS_PATH,
  isInpatientWorkspaceEnabledInBrowser,
} from "./inpatientWorkspacePaths";
import {
  parseInpatientWorkspaceSection,
  type InpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { InpatientWorkspaceSectionNav } from "./InpatientWorkspaceSectionNav";
import { InpatientWorkspacePanel } from "./InpatientWorkspacePanel";

type InpatientEncounterHeader = {
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

export function InpatientActiveWorkspaceView() {
  const { t, language } = useI18n();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const encounterId = String(params?.id ?? "").trim();
  const workspaceEnabled = isInpatientWorkspaceEnabledInBrowser();

  const initialSection =
    parseInpatientWorkspaceSection(searchParams.get("section")) ?? "overview";
  const [section, setSection] = useState<InpatientWorkspaceSection>(initialSection);
  const [encounter, setEncounter] = useState<InpatientEncounterHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = parseInpatientWorkspaceSection(searchParams.get("section"));
    if (fromUrl) setSection(fromUrl);
  }, [searchParams]);

  const selectSection = useCallback(
    (next: InpatientWorkspaceSection) => {
      setSection(next);
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("section", next);
      router.replace(`?${qs.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const loadEncounter = useCallback(async () => {
    if (!encounterId) {
      setError(t("inpatientD3e.workspace.missingId"));
      setEncounter(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`);
      const obj = asApiObject<InpatientEncounterHeader>(raw);
      if (!obj?.id) throw new Error("missing encounter");
      setEncounter(obj);
    } catch {
      setEncounter(null);
      setError(t("inpatientD3e.workspace.loadError"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, t]);

  useEffect(() => {
    void loadEncounter();
  }, [loadEncounter]);

  const patientName = useMemo(() => {
    const p = encounter?.patient;
    if (!p) return DISPLAY_DASH;
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return name || DISPLAY_DASH;
  }, [encounter]);

  const hospitalDay = computeHospitalDay(encounter?.admittedAt ?? null);

  return (
    <div style={{ padding: "12px 16px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 10 }}>
        <Link href={INPATIENT_CENSUS_PATH} style={{ fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
          {t("inpatientD3e.workspace.backCensus")}
        </Link>
      </div>

      <header
        style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px", marginBottom: 12 }}
        data-testid="inpatient-workspace-header"
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          {t("inpatientD3e.workspace.title")}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          {t("inpatientD3e.workspace.subtitle")}
        </p>
        {loading ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
        ) : error ? (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 16px",
              marginTop: 10,
              fontSize: 12,
              color: "#334155",
            }}
          >
            <span>
              {t("inpatientD3e.workspace.patient")}: <strong>{patientName}</strong>
            </span>
            <span>
              {t("inpatientD3e.workspace.mrn")}: {encounter?.patient?.mrn?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientProviderD4a26.header.dob")}:{" "}
              {encounter?.patient?.dob
                ? formatEncounterChromeDateTime(encounter.patient.dob, language)
                : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientProviderD4a26.header.sex")}:{" "}
              {encounter?.patient?.sexAtBirth?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.hospitalDay")}:{" "}
              {hospitalDay != null ? String(hospitalDay) : DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.unit")}:{" "}
              {encounter?.governedRoomUnit?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.roomBed")}: {encounter?.roomLabel?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.attending")}:{" "}
              {encounter?.assignedProviderName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.nurse")}:{" "}
              {encounter?.assignedNurseName?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.status")}: {encounter?.status?.trim() || DISPLAY_DASH}
            </span>
            <span>
              {t("inpatientD3e.workspace.admittedAt")}:{" "}
              {encounter?.admittedAt
                ? formatEncounterChromeDateTime(encounter.admittedAt, language)
                : DISPLAY_DASH}
            </span>
            {!encounter?.assignedProviderName?.trim() ? (
              <span role="status" style={{ color: "#9a3412", fontWeight: 600 }}>
                ⚠ {t("inpatientProviderD4a26.alerts.noAttending")}
              </span>
            ) : null}
          </div>
        )}
      </header>

      <InpatientWorkspaceSectionNav active={section} onSelect={selectSection} />

      <section style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px" }}>
        <InpatientWorkspacePanel
          section={section}
          encounterId={encounterId}
          encounter={encounter}
          workspaceEnabled={workspaceEnabled}
          onRefetchEncounter={loadEncounter}
          onNavigateSection={selectSection}
        />
      </section>
    </div>
  );
}
