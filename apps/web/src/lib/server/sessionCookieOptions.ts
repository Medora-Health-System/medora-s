import { parseJwtAccessTtlSeconds } from "@/lib/jwtAccessTtl";

/**
 * Durée des cookies de session (access) alignée sur JWT_ACCESS_TTL côté API (variable serveur).
 */
export function jwtAccessTtlSeconds(): number {
  return parseJwtAccessTtlSeconds(process.env.JWT_ACCESS_TTL);
}
