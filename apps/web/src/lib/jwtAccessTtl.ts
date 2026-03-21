/**
 * Durée du jeton d’accès — même format que Nest/jsonwebtoken : "15m", "8h", "7d", "120s".
 * Côté apps/web : `JWT_ACCESS_TTL` (serveur Next) pilote les cookies et doit correspondre à `JWT_ACCESS_TTL` (Nest).
 * Le client utilise en priorité `accessTokenTtlSeconds` renvoyé par GET /api/auth/me (même calcul que les cookies).
 * `NEXT_PUBLIC_JWT_ACCESS_TTL` sert uniquement de repli si ce champ est absent.
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

/**
 * Repli pour le timer de `POST /api/auth/refresh` proactif (`app/app/layout.tsx`) lorsque
 * GET /api/auth/me ne fournit pas `accessTokenTtlSeconds` (ancien build).
 *
 * Cause historique des déconnexions : intervalle basé sur un TTL client (8h par défaut) alors que
 * les cookies et le JWT Nest suivaient `JWT_ACCESS_TTL` plus court — le refresh arrivait trop tard.
 * Sans NEXT_PUBLIC, on plafonne à 5 min pour rester sous une durée d’accès courte en dev.
 */
export function getEffectiveAccessTtlSecondsForProactiveRefresh(): number {
  const raw = process.env.NEXT_PUBLIC_JWT_ACCESS_TTL?.trim();
  if (raw) return parseJwtAccessTtlSeconds(raw);
  const longDefault = parseJwtAccessTtlSeconds(undefined);
  const conservativeCap = 5 * 60;
  return Math.min(longDefault, conservativeCap);
}
