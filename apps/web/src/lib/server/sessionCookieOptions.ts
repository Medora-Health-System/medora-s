/**
 * Durée des cookies de session (access) alignée sur JWT_ACCESS_TTL côté API.
 * Même format que Nest/jsonwebtoken : "15m", "8h", "7d", "120s".
 * Défaut 8h (identique à apps/api/src/auth/auth.service.ts).
 */
export function jwtAccessTtlSeconds(): number {
  const raw = (process.env.JWT_ACCESS_TTL ?? "").trim();
  if (!raw) return 8 * 60 * 60;
  const m = raw.match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 8 * 60 * 60;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return 8 * 60 * 60;
  const u = m[2].toLowerCase();
  if (u === "s") return n;
  if (u === "m") return n * 60;
  if (u === "h") return n * 3600;
  if (u === "d") return n * 86400;
  return 8 * 60 * 60;
}
