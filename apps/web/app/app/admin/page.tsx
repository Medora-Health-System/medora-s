"use client";

import { FacilityAdminControlPanel } from "@/components/admin/FacilityAdminControlPanel";
import { FacilityConfigurationConsole } from "@/features/facility-configuration/FacilityConfigurationConsole";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import LegacyAdminDashboard from "./LegacyAdminDashboard";

export default function AdminPage() {
  const { facilityId } = useFacilityAndRoles();

  return (
    <>
      {facilityId ? (
        <div style={{ margin: "24px 24px 0" }}>
          <FacilityConfigurationConsole facilityId={facilityId} />
        </div>
      ) : null}
      <FacilityAdminControlPanel />
      <LegacyAdminDashboard />
    </>
  );
}