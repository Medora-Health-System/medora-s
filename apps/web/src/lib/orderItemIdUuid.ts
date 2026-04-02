/** Canonical UUID string (RFC-style hex groups). Rejects synthetic offline ids such as `local:…`. */
const UUID_HEX_GROUPS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrderItemIdUuid(id: string): boolean {
  return typeof id === "string" && id.trim().length > 0 && UUID_HEX_GROUPS.test(id.trim());
}
