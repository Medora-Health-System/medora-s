"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  filterCensusByUnitSelection,
  filterHospitalCensusPatients,
  filterMyIncompleteChartsEncountersEnterprise,
  filterMyPatientsEncountersEnterprise,
  filterUnassignedHospitalEncountersEnterprise,
  HOSPITAL_SERVICE_LINE_COLOR_CSS,
  resolveUnitBoardProfile,
  dedupeCensusRowsByEncounterId,
  type HospitalServiceLineColorToken,
  type HospitalCensusPatientRow,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import {
  assignHospitalRoleToMe,
  unassignHospitalRole,
} from "@/features/hospital-care/hospitalAssignmentApi";
import {
  HOSPITAL_BOARD_VIEW_TABS,
  isHospitalCareTechAssigner,
  resolveHospitalUnassignedBoardRole,
  type HospitalBoardViewTab,
} from "@/features/hospitalization/hospitalMyPatientsFilter";
import {
  INPATIENT_UNIT_TREE_PATH,
  inpatientUnitPatientWorkspacePath,
} from "./inpatientUnitBoardPaths";
import { inpatientActiveWorkspacePath } from "./inpatientWorkspacePaths";
import { HOSPITAL_CARE_FLOOR_BOARD } from "@/features/hospital-care/hospitalCarePaths";
import { UnitBedBoard } from "./UnitBedBoard";

export type UnitBoardShellProps = {
  title: string;
  subtitle?: string;
  serviceLineName?: string;
  colorToken?: HospitalServiceLineColorToken;
  unitCode?: string | null;
  unitId?: string;
  unitType?: string;
  patients: HospitalCensusPatientRow[];
  occupiedBeds?: number | null;
  availableBeds?: number | null;
  emptyMessage?: string;
  /** When set, chart links use unit-scoped patient route. */
  useUnitPatientRoute?: boolean;
  facilityId?: string | null;
  showUnitBedBoard?: boolean;
  showStartAdmission?: boolean;
};

export function UnitBoardShell({
  title,
  subtitle,
  serviceLineName,
  colorToken = "service.medical",
  unitCode,
  unitId,
  unitType,
  patients,
  occupiedBeds = null,
  availableBeds = null,
  emptyMessage,
  useUnitPatientRoute = true,
  facilityId = null,
  showUnitBedBoard = true,
  showStartAdmission = true,
}: UnitBoardShellProps) {
  const { t } = useI18n();
  const { userId, roles } = useFacilityAndRoles();
  const [query, setQuery] = useState("");
  const [operational, setOperational] = useState("");
  const [boardTab, setBoardTab] = useState<HospitalBoardViewTab>("myPatients");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [localPatients, setLocalPatients] = useState(patients);
  const colors = HOSPITAL_SERVICE_LINE_COLOR_CSS[colorToken];

  useEffect(() => {
    setLocalPatients(dedupeCensusRowsByEncounterId(patients));
  }, [patients]);

  const profile = useMemo(() => {
    if (!unitCode || !unitType) return null;
    return resolveUnitBoardProfile({
      unitId: unitId ?? unitCode,
      unitCode,
      unitType,
      displayName: title,
    });
  }, [unitCode, unitType, unitId, title]);

  const filterCtx = useMemo(
    () => ({ currentUserId: userId ?? "", roles: (roles ?? []) as string[] }),
    [userId, roles]
  );
  const isProvider = (roles ?? []).includes("PROVIDER") || (roles ?? []).includes("ADMIN");
  const isNurse = (roles ?? []).includes("RN") || (roles ?? []).includes("ADMIN");
  const isTech = isHospitalCareTechAssigner(roles ?? []);

  const tabPatients = useMemo(() => {
    if (boardTab === "allPatients") return localPatients;
    if (boardTab === "myPatients") {
      return filterMyPatientsEncountersEnterprise(localPatients, filterCtx);
    }
    if (boardTab === "unassignedPatients") {
      return filterUnassignedHospitalEncountersEnterprise(
        localPatients,
        resolveHospitalUnassignedBoardRole(roles ?? [])
      );
    }
    if (boardTab === "incompleteCharts") {
      return filterMyIncompleteChartsEncountersEnterprise(localPatients, filterCtx);
    }
    return localPatients;
  }, [localPatients, boardTab, filterCtx, roles]);

  const rows = useMemo(
    () =>
      filterHospitalCensusPatients(tabPatients, {
        query,
        clinicalContext: "INPATIENT",
        operational,
      }),
    [tabPatients, query, operational]
  );

  const onAssign = async (
    encounterId: string,
    role: "PROVIDER" | "NURSE" | "TECHNICIAN",
    action: "ASSIGN_ME" | "UNASSIGN"
  ) => {
    if (!facilityId?.trim()) return;
    setAssigningId(encounterId);
    setAssignError(null);
    try {
      const res =
        action === "ASSIGN_ME"
          ? await assignHospitalRoleToMe(facilityId, encounterId, role)
          : await unassignHospitalRole(facilityId, encounterId, role);
      const p = res.projection;
      setLocalPatients((prev) =>
        prev.map((row) =>
          row.encounterId === encounterId
            ? {
                ...row,
                attendingName: p.providerName,
                nurseName: p.nurseName,
                technicianName: p.technicianName,
                providerUserId: p.providerUserId,
                nurseUserId: p.nurseUserId,
                technicianUserId: p.technicianUserId,
              }
            : row
        )
      );
    } catch {
      setAssignError(t("enterpriseHospitalAssignmentD4a30.assignError"));
    } finally {
      setAssigningId(null);
    }
  };

  const snap = useMemo(() => {
    const countAlert = (code: string) =>
      patients.filter((p) => p.alerts.some((a) => a.code === code)).length;
    return {
      active: patients.length,
      rnUnassigned: countAlert("RN_UNASSIGNED"),
      mdUnassigned: countAlert("PHYSICIAN_UNASSIGNED"),
      reassess: countAlert("REASSESSMENT_OVERDUE"),
      vitals: countAlert("VITALS_STALE"),
      critical: countAlert("CRITICAL_RESULTS"),
      readyDc: countAlert("READY_DISCHARGE"),
    };
  }, [patients]);

  return (
    <HospitalCareShell active="inpatient" title={title} subtitle={subtitle}>
      <div style={{ marginBottom: 10 }}>
        <Link href={INPATIENT_UNIT_TREE_PATH} style={backLink}>
          ← {t("hospitalCareD3e6c.board.backToTree")}
        </Link>
      </div>

      <header
        style={{
          ...MEDORA_CARD_SHELL,
          padding: 14,
          borderColor: colors.border,
          background: colors.bg,
          marginBottom: 12,
        }}
        data-testid="unit-board-header"
      >
        <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>
          {serviceLineName ?? t("hospitalCareD3e6c.board.serviceLine")}
        </div>
        <h2 style={{ margin: "4px 0 0", fontSize: 18, color: colors.text }}>{title}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
          {snap.active} {t("hospitalCareD3e6c.tree.patients")}
          {profile ? ` · ${profile.boardProfile}` : ""}
        </p>
      </header>

      {showStartAdmission ? (
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/app/hospitalisation/admissions/new"
            data-testid="unit-board-start-admission"
            style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #2563eb",
              background: "#eff6ff",
              color: "#1e40af",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {t("hospitalCareD3e6d.admission.startAction")}
          </Link>
        </div>
      ) : null}

      <UnitOperationalSnapshot
        snap={snap}
        occupiedBeds={occupiedBeds}
        availableBeds={availableBeds}
      />

      {showUnitBedBoard ? (
        <UnitBedBoard facilityId={facilityId} unitCode={unitCode} />
      ) : null}

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
        role="tablist"
        aria-label={t("enterpriseHospitalAssignmentD4a30.tabsLabel")}
        data-testid="unit-board-assignment-tabs"
      >
        {HOSPITAL_BOARD_VIEW_TABS.map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={boardTab === view}
            onClick={() => setBoardTab(view)}
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              border: boardTab === view ? "1px solid #2563eb" : "1px solid #cbd5e1",
              background: boardTab === view ? "#eff6ff" : "#fff",
              color: boardTab === view ? "#1e40af" : "#334155",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(`enterpriseHospitalAssignmentD4a30.tabs.${view}`)}
          </button>
        ))}
      </div>

      {assignError ? (
        <p role="alert" style={{ fontSize: 12, color: "#b91c1c", marginBottom: 8 }}>
          {assignError}
        </p>
      ) : null}

      <UnitPatientFilterBar
        query={query}
        onQuery={setQuery}
        operational={operational}
        onOperational={setOperational}
      />

      <UnitPatientCardList
        rows={rows}
        emptyMessage={emptyMessage ?? t("hospitalCareD3e6c.board.emptyPatients")}
        unitSlug={unitCode?.toLowerCase()}
        useUnitPatientRoute={useUnitPatientRoute}
        currentUserId={userId}
        isProvider={isProvider}
        isNurse={isNurse}
        isTech={isTech}
        assigningId={assigningId}
        onAssign={onAssign}
      />

      <UnitBedSummary occupied={occupiedBeds} available={availableBeds} />
    </HospitalCareShell>
  );
}

export function UnitOperationalSnapshot({
  snap,
  occupiedBeds,
  availableBeds,
}: {
  snap: {
    active: number;
    rnUnassigned: number;
    mdUnassigned: number;
    reassess: number;
    vitals: number;
    critical: number;
    readyDc: number;
  };
  occupiedBeds: number | null;
  availableBeds: number | null;
}) {
  const { t } = useI18n();
  const items: Array<{ label: string; value: string | number }> = [
    { label: t("hospitalCareD3e6b.summary.patients"), value: snap.active },
    {
      label: t("hospitalCareD3e6b.summary.occupied"),
      value: occupiedBeds == null ? "—" : occupiedBeds,
    },
    {
      label: t("hospitalCareD3e6b.summary.available"),
      value: availableBeds == null ? "—" : availableBeds,
    },
    { label: t("hospitalCareD3e6b.summary.rnUnassigned"), value: snap.rnUnassigned },
    { label: t("hospitalCareD3e6b.summary.mdUnassigned"), value: snap.mdUnassigned },
    { label: t("hospitalCareD3e6b.summary.reassess"), value: snap.reassess },
    { label: t("hospitalCareD3e6b.summary.vitals"), value: snap.vitals },
    { label: t("hospitalCareD3e6b.summary.critical"), value: snap.critical },
    { label: t("hospitalCareD3e6b.summary.readyDc"), value: snap.readyDc },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
        gap: 8,
        marginBottom: 12,
      }}
      data-testid="unit-operational-snapshot"
    >
      {items.map((it) => (
        <div key={it.label} style={{ ...MEDORA_CARD_SHELL, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>{it.label}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export function UnitPatientFilterBar({
  query,
  onQuery,
  operational,
  onOperational,
}: {
  query: string;
  onQuery: (v: string) => void;
  operational: string;
  onOperational: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        ...MEDORA_CARD_SHELL,
        padding: 10,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
      }}
      data-testid="unit-patient-filter-bar"
    >
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={t("hospitalCareD3e6b.filters.search")}
        style={fieldStyle}
      />
      <select
        value={operational}
        onChange={(e) => onOperational(e.target.value)}
        style={fieldStyle}
        aria-label={t("hospitalCareD3e6a.filters.operational")}
      >
        <option value="">{t("hospitalCareD3e6a.filters.opAll")}</option>
        <option value="unassigned_nurse">{t("hospitalCareD3e6a.filters.opRn")}</option>
        <option value="unassigned_physician">{t("hospitalCareD3e6a.filters.opMd")}</option>
        <option value="reassessment_overdue">{t("hospitalCareD3e6a.filters.opReassess")}</option>
        <option value="vitals_stale">{t("hospitalCareD3e6a.filters.opVitals")}</option>
        <option value="critical_results">{t("hospitalCareD3e6a.filters.opCritical")}</option>
        <option value="ready_discharge">{t("hospitalCareD3e6a.filters.opReadyDc")}</option>
      </select>
    </div>
  );
}

export function UnitPatientCardList({
  rows,
  emptyMessage,
  unitSlug,
  useUnitPatientRoute,
  currentUserId,
  isProvider,
  isNurse,
  isTech,
  assigningId,
  onAssign,
}: {
  rows: HospitalCensusPatientRow[];
  emptyMessage: string;
  unitSlug?: string;
  useUnitPatientRoute?: boolean;
  currentUserId?: string;
  isProvider?: boolean;
  isNurse?: boolean;
  isTech?: boolean;
  assigningId?: string | null;
  onAssign?: (
    encounterId: string,
    role: "PROVIDER" | "NURSE" | "TECHNICIAN",
    action: "ASSIGN_ME" | "UNASSIGN"
  ) => void;
}) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#64748b" }} data-testid="unit-board-empty">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul
      style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}
      data-testid="unit-patient-cards"
    >
      {rows.map((row) => {
        const href =
          useUnitPatientRoute && unitSlug
            ? inpatientUnitPatientWorkspacePath(unitSlug, row.encounterId)
            : inpatientActiveWorkspacePath(row.encounterId);
        const mineProvider = Boolean(currentUserId && row.providerUserId === currentUserId);
        const mineNurse = Boolean(currentUserId && row.nurseUserId === currentUserId);
        const mineTech = Boolean(currentUserId && row.technicianUserId === currentUserId);
        return (
          <li
            key={row.encounterId}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "8px 10px",
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{row.patientName}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {row.mrn ?? "—"} · {row.unitRoomBed || t("hospitalCareD3e6a.patients.noBed")}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                {t("enterpriseHospitalAssignmentD4a30.provider")}:{" "}
                {row.attendingName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
                {" · "}
                {t("enterpriseHospitalAssignmentD4a30.nurse")}:{" "}
                {row.nurseName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
                {" · "}
                {t("enterpriseHospitalAssignmentD4a30.technician")}:{" "}
                {row.technicianName?.trim() || t("enterpriseHospitalAssignmentD4a30.unassigned")}
              </div>
              {onAssign ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {isProvider ? (
                    <button
                      type="button"
                      disabled={assigningId === row.encounterId}
                      onClick={() =>
                        onAssign(
                          row.encounterId,
                          "PROVIDER",
                          mineProvider ? "UNASSIGN" : "ASSIGN_ME"
                        )
                      }
                      style={unitAssignBtn}
                    >
                      {mineProvider
                        ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                        : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                    </button>
                  ) : null}
                  {isNurse ? (
                    <button
                      type="button"
                      disabled={assigningId === row.encounterId}
                      onClick={() =>
                        onAssign(row.encounterId, "NURSE", mineNurse ? "UNASSIGN" : "ASSIGN_ME")
                      }
                      style={unitAssignBtn}
                    >
                      {mineNurse
                        ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                        : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                    </button>
                  ) : null}
                  {isTech ? (
                    <button
                      type="button"
                      disabled={assigningId === row.encounterId}
                      onClick={() =>
                        onAssign(
                          row.encounterId,
                          "TECHNICIAN",
                          mineTech ? "UNASSIGN" : "ASSIGN_ME"
                        )
                      }
                      style={unitAssignBtn}
                    >
                      {mineTech
                        ? t("enterpriseHospitalAssignmentD4a30.removeAssignment")
                        : t("enterpriseHospitalAssignmentD4a30.assignToMe")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <Link href={href} style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
              {t("hospitalCareD3e6b.patients.viewChart")}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const unitAssignBtn: CSSProperties = {
  padding: "2px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

export function UnitBedSummary({
  occupied,
  available,
}: {
  occupied: number | null;
  available: number | null;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        ...MEDORA_CARD_SHELL,
        marginTop: 16,
        padding: "10px 12px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
      data-testid="unit-bed-summary"
    >
      <div style={{ fontSize: 12, color: "#475569" }}>
        {t("hospitalCareD3e6c.board.bedSummary")}
        {": "}
        {occupied == null ? "—" : occupied} {t("hospitalCareD3e6b.tree.occupied")}
        {" · "}
        {available == null ? "—" : available} {t("hospitalCareD3e6b.tree.available")}
      </div>
      <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
        {t("hospitalCareD3e6b.bedManagement.open")}
      </Link>
    </div>
  );
}

export function UnitAttentionPanel({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }} data-testid="unit-attention">
      {children}
    </div>
  );
}

/** Helper to scope inpatient patients to a unit code. */
export function scopeInpatientPatientsToUnit(
  patients: HospitalCensusPatientRow[],
  unitCode: string
): HospitalCensusPatientRow[] {
  return filterCensusByUnitSelection(
    patients,
    { kind: "UNIT", unitCode },
    { clinicalContext: "INPATIENT" }
  );
}

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 13,
  minWidth: 140,
};

const backLink: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#2563eb",
  textDecoration: "none",
};
