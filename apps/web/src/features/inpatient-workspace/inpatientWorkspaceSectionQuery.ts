/**
 * MEDUI.INP.2E.1 — update `?section=` without a Next App Router RSC navigation.
 * Local `setSection` already mounts MAR; `router.replace` was remounting the workspace.
 */
export function replaceInpatientWorkspaceSectionQuery(section: string): void {
  if (typeof window === "undefined") return;
  const next = section.trim();
  if (!next) return;
  const url = new URL(window.location.href);
  url.searchParams.set("section", next);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}
