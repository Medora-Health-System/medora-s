"use client";

import { FacilityAdminControlPanel } from "@/components/admin/FacilityAdminControlPanel";
import LegacyAdminDashboard from "./LegacyAdminDashboard";

export default function AdminPage() {
  return (
    <>
      <FacilityAdminControlPanel />
      <LegacyAdminDashboard />
    </>
  );
}