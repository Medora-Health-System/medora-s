"use client";

import { RevenueCycleWorkspace } from "@/features/revenue/RevenueCycleWorkspace";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";

export default function AdminRevenueCyclePage() {
  const { t } = useI18n();
  const { ready, facilityId, roles } = useFacilityAndRoles();
  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("BILLING") ||
    roles.includes("FRONT_DESK");

  if (!ready) {
    return <p style={{ padding: 24 }}>{t("common.loading")}</p>;
  }

  if (!canAccess) {
    return (
      <div style={{ padding: 24 }} data-testid="revenue-cycle-access-denied">
        <h1 style={{ marginTop: 0 }}>{t("revenueCycle.title")}</h1>
        <p style={{ color: "#64748b" }}>{t("revenueCycle.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <RevenueCycleWorkspace facilityId={facilityId} />
    </div>
  );
}
