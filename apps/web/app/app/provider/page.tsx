import { redirect } from "next/navigation";

/**
 * Legacy provider dashboard retired.
 * Keep the route as a compatibility redirect so bookmarks and older links
 * enter the canonical Medora workspace, where facility-aware navigation
 * selects the current care-setting experience.
 */
export default function LegacyProviderPage() {
  redirect("/app");
}
