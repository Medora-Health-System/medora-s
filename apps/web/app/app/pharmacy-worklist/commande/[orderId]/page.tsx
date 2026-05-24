"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DepartmentOrderDetail from "@/components/worklists/DepartmentOrderDetail";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";

export default function PharmacyOrderDetailPage() {
  const { t } = useI18n();
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

  const effectiveFacilityId =
    facilityId ?? (facilityIdFromHook?.trim() ? facilityIdFromHook : null);

  if (!ready) return <p style={{ padding: 24 }}>{t("common.loading")}</p>;

  return (
    <DepartmentOrderDetail
      kind="pharmacy"
      orderId={orderId}
      listHref="/app/pharmacy-worklist"
      facilityId={effectiveFacilityId}
    />
  );
}
