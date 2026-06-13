/** RN / PROVIDER / ADMIN — matches PATCH /facilities/:id/beds/:bedKey/status roles. */
export function canManageBedOperationalStatus(roles: readonly string[]): boolean {
  return roles.some((role) => role === "RN" || role === "PROVIDER" || role === "ADMIN");
}
