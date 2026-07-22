"use client";

import { useEffect, useMemo, useState } from "react";
import {
  findServiceLineBySlug,
  findUnitInTree,
  HOSPITAL_SERVICE_LINE_DEFINITIONS,
  serviceLineForUnitType,
  type HospitalClinicalUnitType,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchHospitalCensus } from "@/features/hospital-care/hospitalCareCensusApi";
import { fetchHospitalServiceLineTree } from "@/features/hospital-care/hospitalServiceLineTreeApi";
import { isForbiddenApiError } from "@/features/hospital-care/hospitalCarePlacementApi";
import {
  scopeInpatientPatientsToUnit,
  UnitBoardShell,
} from "./UnitBoardShell";
import type { HospitalCensusPatientRow } from "@/features/hospital-care/hospitalCareCensusApi";

type Mode =
  | { kind: "all" }
  | { kind: "serviceLine"; slug: string }
  | { kind: "unit"; unitSlug: string };

export function InpatientUnitBoardView({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const { facilityId } = useFacilityAndRoles();
  const [patients, setPatients] = useState<HospitalCensusPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    title: string;
    subtitle: string;
    serviceLineName?: string;
    colorToken?: Parameters<typeof UnitBoardShell>[0]["colorToken"];
    unitCode?: string;
    unitId?: string;
    unitType?: string;
    occupiedBeds?: number | null;
    availableBeds?: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [census, tree] = await Promise.all([
          fetchHospitalCensus("INPATIENT"),
          fetchHospitalServiceLineTree(),
        ]);
        if (cancelled) return;

        if (mode.kind === "all") {
          setPatients(census.inpatientPatients);
          setMeta({
            title: t("hospitalCareD3e6c.board.allTitle"),
            subtitle: t("hospitalCareD3e6c.board.allSubtitle"),
            colorToken: "service.medical",
          });
          return;
        }

        if (mode.kind === "serviceLine") {
          const def = findServiceLineBySlug(mode.slug);
          const line = tree.serviceLines.find((s) => s.code === def?.code);
          const codes = new Set((line?.units ?? []).map((u) => u.code.toUpperCase()));
          const scoped = census.inpatientPatients.filter((p) => {
            const label = (p.unitRoomBed ?? "").toUpperCase();
            return Array.from(codes).some(
              (c) => label.startsWith(`${c}-`) || label.includes(`${c}:`)
            );
          });
          // Also include units with matching types via tree unit list patient aggregation path
          const fromUnits = (line?.units ?? []).flatMap((u) =>
            scopeInpatientPatientsToUnit(census.inpatientPatients, u.code)
          );
          const byId = new Map<string, HospitalCensusPatientRow>();
          for (const p of [...scoped, ...fromUnits]) byId.set(p.encounterId, p);
          setPatients(Array.from(byId.values()));
          setMeta({
            title: def?.name ?? mode.slug,
            subtitle: t("hospitalCareD3e6c.board.serviceLineSubtitle"),
            serviceLineName: def?.name,
            colorToken: def?.colorToken ?? "service.other",
          });
          return;
        }

        const unit = findUnitInTree(tree, mode.unitSlug);
        if (!unit) {
          setPatients([]);
          setMeta({
            title: mode.unitSlug,
            subtitle: t("hospitalCareD3e6c.board.unitNotFound"),
            colorToken: "service.other",
          });
          return;
        }
        setPatients(scopeInpatientPatientsToUnit(census.inpatientPatients, unit.code));
        const sl = HOSPITAL_SERVICE_LINE_DEFINITIONS.find(
          (d) => d.code === serviceLineForUnitType(unit.unitType as HospitalClinicalUnitType)
        );
        setMeta({
          title: unit.name,
          subtitle: t("hospitalCareD3e6c.board.unitSubtitle"),
          serviceLineName: sl?.name,
          colorToken: sl?.colorToken ?? "service.other",
          unitCode: unit.code,
          unitId: unit.id,
          unitType: unit.unitType,
          occupiedBeds: unit.occupiedBeds,
          availableBeds: unit.availableBeds,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3ca.loadError")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, t]);

  const shellProps = useMemo(() => meta, [meta]);

  if (loading) {
    return (
      <HospitalCareShellLoading />
    );
  }
  if (error) {
    return (
      <p style={{ fontSize: 13, color: "#b91c1c", padding: 16 }} role="alert">
        {error}
      </p>
    );
  }
  if (!shellProps) return null;

  return (
    <UnitBoardShell
      title={shellProps.title}
      subtitle={shellProps.subtitle}
      serviceLineName={shellProps.serviceLineName}
      colorToken={shellProps.colorToken}
      unitCode={shellProps.unitCode}
      unitId={shellProps.unitId}
      unitType={shellProps.unitType}
      patients={patients}
      occupiedBeds={shellProps.occupiedBeds}
      availableBeds={shellProps.availableBeds}
      useUnitPatientRoute={mode.kind === "unit"}
      facilityId={facilityId}
      showUnitBedBoard={mode.kind === "unit"}
      showStartAdmission
    />
  );
}

function HospitalCareShellLoading() {
  const { t } = useI18n();
  return <p style={{ fontSize: 13, color: "#64748b", padding: 16 }}>{t("common.loading")}</p>;
}
