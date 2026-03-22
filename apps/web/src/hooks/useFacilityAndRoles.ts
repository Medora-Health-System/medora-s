"use client";

import { useState, useEffect } from "react";
import { parseApiResponse } from "@/lib/apiClient";

export type UserFacilityOption = { id: string; name: string };

export function useFacilityAndRoles() {
  const [facilityId, setFacilityId] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<UserFacilityOption[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apply = (fid: string, user: any) => {
      setFacilityId(fid);
      const fidKey = String(fid);
      const r =
        user?.facilityRoles
          ?.filter((fr: any) => String(fr.facilityId) === fidKey)
          .map((fr: any) => fr.role) ?? [];
      setRoles(r);
      const map = new Map<string, string>();
      for (const fr of user?.facilityRoles ?? []) {
        const id = String(fr.facilityId);
        const name =
          typeof fr.facilityName === "string" && fr.facilityName.trim() ? String(fr.facilityName).trim() : id;
        if (!map.has(id)) map.set(id, name);
      }
      setFacilities([...map.entries()].map(([id, name]) => ({ id, name })));
      setReady(true);
    };

    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) {
          setReady(true);
          return;
        }
        const data = await parseApiResponse(res);
        const d = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
        const frs = Array.isArray(d.facilityRoles) ? (d.facilityRoles as { facilityId?: string }[]) : [];
        const cookieValue = document.cookie
          .split("; ")
          .find((row) => row.startsWith("medora_facility_id="))
          ?.split("=")[1];
        const cookieOk =
          cookieValue && frs.some((fr) => String(fr.facilityId) === String(cookieValue));
        const fid = cookieOk ? cookieValue : frs[0]?.facilityId;
        if (fid) {
          if (!cookieOk) {
            document.cookie = `medora_facility_id=${fid}; path=/; max-age=${365 * 24 * 60 * 60}`;
          }
          apply(String(fid), d);
        } else {
          setReady(true);
        }
      } catch {
        setReady(true);
      }
    })();
  }, []);

  const canManagePharmacy =
    roles.includes("PHARMACY") || roles.includes("ADMIN");
  const canViewPharmacy =
    canManagePharmacy ||
    roles.includes("PROVIDER") ||
    roles.includes("RN");
  const canViewPublicHealth =
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN");
  /** Only PROVIDER and ADMIN can prescribe (create medication orders). RN can create LAB/IMAGING orders. */
  const canPrescribe = roles.includes("PROVIDER") || roles.includes("ADMIN");

  return {
    facilityId,
    roles,
    facilities,
    ready,
    canManagePharmacy,
    canViewPharmacy,
    canViewPublicHealth,
    canPrescribe,
  };
}
