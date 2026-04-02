"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DepartmentOrderDetail from "@/components/worklists/DepartmentOrderDetail";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";

export default function LabOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  /** Évite le premier rendu avec facilityId=null alors que le hook a déjà l’établissement (sinon « Établissement requis » et pas de chargement). */
  const effectiveFacilityId =
    facilityId ?? (facilityIdFromHook?.trim() ? facilityIdFromHook : null);

  if (!ready) return <p style={{ padding: 24 }}>Chargement…</p>;

  return (
    <DepartmentOrderDetail kind="lab" orderId={orderId} listHref="/app/lab-worklist" facilityId={effectiveFacilityId} />
  );
}
