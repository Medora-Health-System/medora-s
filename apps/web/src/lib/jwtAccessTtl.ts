/**
 * Durée du jeton d’accès — même format que Nest/jsonwebtoken : "15m", "8h", "7d", "120s".
 * Utilisable côté client (NEXT_PUBLIC_JWT_ACCESS_TTL) et serveur (JWT_ACCESS_TTL).
 * Défaut 8h (identique à apps/api/src/auth/auth.service.ts).
 */
export function parseJwtAccessTtlSeconds(raw?: string | null): number {
  const v = (raw ?? "").trim();
  if (!v) return 8 * 60 * 60;
  const m = v.match(/^(\d+)\s*([smhd])$/i);
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

/**
 * Intervalle entre deux POST /api/auth/refresh proactifs.
 * Doit rester strictement inférieur au TTL pour éviter la déconnexion avant le refresh.
 */
export function getProactiveRefreshIntervalMs(ttlSeconds: number): number {
  const ttlMs = Math.max(1, ttlSeconds) * 1000;
  let ms = Math.floor(ttlMs * 0.4);
  ms = Math.min(ms, ttlMs - 3_000);
  ms = Math.max(ms, 15_000);
  if (ms >= ttlMs) {
    ms = Math.max(10_000, Math.floor(ttlMs * 0.25));
  }
  return ms;
}
