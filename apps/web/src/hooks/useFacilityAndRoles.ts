"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAuthMeSession } from "@/lib/authSessionMe";

export type UserFacilityOption = { id: string; name: string };

function parseMsppContextFromMe(
  d: Record<string, unknown>,
  msppLen: number,
  frsLen: number
): { isMsppUser: boolean; hasFacilityAccess: boolean } {
  const nested = d.msppContext;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const o = nested as Record<string, unknown>;
    if (typeof o.isMsppUser === "boolean" && typeof o.hasFacilityAccess === "boolean") {
      return { isMsppUser: o.isMsppUser, hasFacilityAccess: o.hasFacilityAccess };
    }
  }
  return { isMsppUser: msppLen > 0, hasFacilityAccess: frsLen > 0 };
}

export function useFacilityAndRoles() {
  const [facilityId, setFacilityId] = useState<string>("");
  /** Phase 10A — current user id (mirrors `/auth/me.id`); used for "Assigned to me" UI checks. */
  const [userId, setUserId] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [msppRoles, setMsppRoles] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<UserFacilityOption[]>([]);
  const [canCreateFacilities, setCanCreateFacilities] = useState(false);
  const [ready, setReady] = useState(false);
  const [isMsppUser, setIsMsppUser] = useState(false);
  const [hasFacilityAccess, setHasFacilityAccess] = useState(false);
  /** True if any `facilityRoles` row has `MEDORA_SUPER_ADMIN` (not scoped to active facility cookie). */
  const [isPlatformOperator, setIsPlatformOperator] = useState(false);
  /**
   * Phase 1 — facility-scoped clinical policy mirror. Backend remains the sole enforcer; this
   * is used purely to decide whether the RN lab-result entry UI should be shown for the
   * **active** facility. Defaults to `false` when missing from `/auth/me`.
   */
  const [allowRnLabResultSubmission, setAllowRnLabResultSubmission] = useState(false);

  const applySessionFromMe = useCallback((d: Record<string, unknown>) => {
    const meId = typeof d.id === "string" ? d.id : "";
    setUserId(meId);
    setCanCreateFacilities(d.canCreateFacilities === true);
    const mspp = Array.isArray(d.msppRoles)
      ? d.msppRoles.filter((x): x is string => typeof x === "string")
      : [];
    setMsppRoles(mspp);
    const frs = Array.isArray(d.facilityRoles) ? (d.facilityRoles as { facilityId?: string }[]) : [];
    const ctx = parseMsppContextFromMe(d, mspp.length, frs.length);
    setIsMsppUser(ctx.isMsppUser);
    setHasFacilityAccess(ctx.hasFacilityAccess);
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
      setIsPlatformOperator(false);
      setAllowRnLabResultSubmission(false);
      setReady(true);
      return;
    }
    if (!cookieOk) {
      document.cookie = `medora_facility_id=${fid}; path=/; max-age=${365 * 24 * 60 * 60}`;
    }
    setFacilityId(String(fid));
    const fidKey = String(fid);
    const frsTyped =
      (d.facilityRoles as {
        facilityId?: string;
        role?: string;
        allowRnLabResultSubmission?: boolean;
      }[]) ?? [];
    setIsPlatformOperator(frsTyped.some((fr) => fr.role === "MEDORA_SUPER_ADMIN"));
    const r =
      frsTyped
        .filter((fr) => String(fr.facilityId) === fidKey)
        .map((fr) => fr.role)
        .filter((role): role is string => typeof role === "string") ?? [];
    setRoles(r);
    /** Read the facility-scoped policy from any matching role row (server emits it on every entry). */
    const activePolicyRow = frsTyped.find((fr) => String(fr.facilityId) === fidKey);
    setAllowRnLabResultSubmission(activePolicyRow?.allowRnLabResultSubmission === true);
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
        const { ok, data: d } = await fetchAuthMeSession();
        if (!ok || !d) {
          setIsPlatformOperator(false);
          setReady(true);
          return;
        }
        applySessionFromMe(d);
      } catch {
        setIsPlatformOperator(false);
        setAllowRnLabResultSubmission(false);
        setReady(true);
      }
    })();
  }, [applySessionFromMe]);

  /** Recharge les établissements et rôles depuis `GET /api/auth/me` (ex. après création d’un établissement). */
  const refreshFromMe = useCallback(async () => {
    const { ok, data: d } = await fetchAuthMeSession({ force: true });
    if (!ok || !d) {
      throw new Error("Session expirée.");
    }
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

  /** Facility admin or platform operator at the **active** facility — shared admin hub, users, audit, reports, go-live. */
  const isFacilityOrPlatformAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

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

  /** Utilisateur MSPP national sans établissement actif en session (cookie / premier établissement). */
  const isMsppOnlyUser = isMsppUser && !facilityId.trim();

  return {
    facilityId,
    userId,
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
    isPlatformOperator,
    isFacilityOrPlatformAdmin,
    isMsppUser,
    hasFacilityAccess,
    isMsppOnlyUser,
    canPrescribe,
    /** Phase 1 — `Facility.allowRnLabResultSubmission` for the **active** facility. */
    allowRnLabResultSubmission,
  };
}
