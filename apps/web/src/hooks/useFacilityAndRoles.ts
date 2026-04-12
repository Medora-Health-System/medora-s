"use client";

import { useState, useEffect, useCallback } from "react";
import { parseApiResponse } from "@/lib/apiClient";

export type UserFacilityOption = { id: string; name: string };

export function useFacilityAndRoles() {
  const [facilityId, setFacilityId] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [msppRoles, setMsppRoles] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<UserFacilityOption[]>([]);
  const [canCreateFacilities, setCanCreateFacilities] = useState(false);
  const [ready, setReady] = useState(false);

  const applySessionFromMe = useCallback((d: Record<string, unknown>) => {
    setCanCreateFacilities(d.canCreateFacilities === true);
    const mspp = Array.isArray(d.msppRoles)
      ? d.msppRoles.filter((x): x is string => typeof x === "string")
      : [];
    setMsppRoles(mspp);
    const frs = Array.isArray(d.facilityRoles) ? (d.facilityRoles as { facilityId?: string }[]) : [];
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    const cookieOk =
      cookieValue && frs.some((fr) => String(fr.facilityId) === String(cookieValue));
    const fid = cookieOk ? cookieValue : frs[0]?.facilityId;
    if (!fid) {
      setFacilityId("");
      setRoles([]);
      setFacilities([]);
      setReady(true);
      return;
    }
    if (!cookieOk) {
      document.cookie = `medora_facility_id=${fid}; path=/; max-age=${365 * 24 * 60 * 60}`;
    }
    setFacilityId(String(fid));
    const fidKey = String(fid);
    const r =
      (d.facilityRoles as { facilityId?: string; role?: string }[])
        ?.filter((fr) => String(fr.facilityId) === fidKey)
        .map((fr) => fr.role)
        .filter((role): role is string => typeof role === "string") ?? [];
    setRoles(r);
    const map = new Map<string, string>();
    for (const fr of (d.facilityRoles as { facilityId?: string; facilityName?: string }[]) ?? []) {
      const id = String(fr.facilityId);
      const name =
        typeof fr.facilityName === "string" && fr.facilityName.trim() ? String(fr.facilityName).trim() : id;
      if (!map.has(id)) map.set(id, name);
    }
    setFacilities([...map.entries()].map(([id, name]) => ({ id, name })));
    setReady(true);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setReady(true);
          return;
        }
        const data = await parseApiResponse(res);
        const d =
          data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
        applySessionFromMe(d);
      } catch {
        setReady(true);
      }
    })();
  }, [applySessionFromMe]);

  /** Recharge les établissements et rôles depuis `GET /api/auth/me` (ex. après création d’un établissement). */
  const refreshFromMe = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      throw new Error("Session expirée.");
    }
    const data = await parseApiResponse(res);
    const d =
      data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    applySessionFromMe(d);
  }, [applySessionFromMe]);

  const canManagePharmacy =
    roles.includes("PHARMACY") || roles.includes("ADMIN");
  const canViewPharmacy =
    canManagePharmacy ||
    roles.includes("PROVIDER") ||
    roles.includes("RN");

  const medoraPublicHealthRoles =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
  const isMsppAdmin = msppRoles.includes("MSPP_ADMIN");

  /** Résumé santé publique — Medora inchangé ; MSPP : admin délégué ou rôle module explicite. */
  const canViewPublicHealthSummary =
    medoraPublicHealthRoles || isMsppAdmin || msppRoles.includes("MSPP_PUBLIC_HEALTH");
  /** Déclarations maladies — idem. */
  const canViewPublicHealthDiseaseReports =
    medoraPublicHealthRoles || isMsppAdmin || msppRoles.includes("MSPP_DISEASE_REPORTS");
  /** Vaccinations — idem. */
  const canViewPublicHealthVaccinations =
    medoraPublicHealthRoles || isMsppAdmin || msppRoles.includes("MSPP_VACCINATIONS");

  /** Au moins un des trois modules (ex. nav agrégée). */
  const canViewPublicHealth =
    canViewPublicHealthSummary || canViewPublicHealthDiseaseReports || canViewPublicHealthVaccinations;
  /** Only PROVIDER and ADMIN can prescribe (create medication orders). RN can create LAB/IMAGING orders. */
  const canPrescribe = roles.includes("PROVIDER") || roles.includes("ADMIN");

  return {
    facilityId,
    roles,
    msppRoles,
    facilities,
    canCreateFacilities,
    ready,
    refreshFromMe,
    canManagePharmacy,
    canViewPharmacy,
    canViewPublicHealth,
    canViewPublicHealthSummary,
    canViewPublicHealthDiseaseReports,
    canViewPublicHealthVaccinations,
    isMsppAdmin,
    canPrescribe,
  };
}
