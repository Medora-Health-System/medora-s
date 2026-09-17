import { redirect } from "next/navigation";

/**
 * Legacy generic Encounters list retired.
 * Keep the exact /app/encounters route as a compatibility redirect so old
 * bookmarks and links enter Medora's canonical facility-aware workspace.
 *
 * IMPORTANT: /app/encounters/[id] is the authoritative encounter chart and is
 * intentionally preserved. This redirect applies only to the list route.
 */
export default function LegacyEncountersListPage() {
  redirect("/app");
}
