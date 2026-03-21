import { ui } from "@/lib/uiLabels";

/**
 * /app root: layout redirects to role home via getRouteGuardRedirect.
 * This shell only renders if redirect is delayed.
 */
export default function AppRootPage() {
  return (
    <div style={{ padding: 48 }}>
      <p style={{ margin: 0 }}>{ui.common.redirecting}</p>
    </div>
  );
}
