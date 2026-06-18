"use client";

import { useParams } from "next/navigation";
import { RevenueClaimAuditPage } from "@/features/revenue/RevenueClaimAuditPage";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";

export default function AdminRevenueClaimAuditRoutePage() {
  const { t } = useI18n();
  const params = useParams<{ claimId: string }>();
  const claimId = typeof params.claimId === "string" ? params.claimId : "";
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
      <div style={{ padding: 24 }} data-testid="revenue-claim-audit-access-denied">
        <h1 style={{ marginTop: 0 }}>{t("revenueClaimAudit.title")}</h1>
        <p style={{ color: "#64748b" }}>{t("revenueClaimAudit.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <RevenueClaimAuditPage facilityId={facilityId} claimId={claimId} />
    </div>
  );
}
