"use client";

import { RevenueClaimSubmissionWorkspace } from "@/features/revenue/RevenueClaimSubmissionWorkspace";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";

export default function AdminRevenueClaimSubmissionPage() {
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
      <div style={{ padding: 24 }} data-testid="revenue-claim-access-denied">
        <h1 style={{ marginTop: 0 }}>{t("revenueClaimSubmission.title")}</h1>
        <p style={{ color: "#64748b" }}>{t("revenueClaimSubmission.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <RevenueClaimSubmissionWorkspace facilityId={facilityId} />
    </div>
  );
}
