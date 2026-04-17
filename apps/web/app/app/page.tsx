"use client";

import { useI18n } from "@/lib/i18n";

/**
 * /app root: layout redirects to role home via getRouteGuardRedirect.
 * This shell only renders if redirect is delayed.
 */
export default function AppRootPage() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 48 }}>
      <p style={{ margin: 0 }}>{t("common.redirecting")}</p>
    </div>
  );
}
