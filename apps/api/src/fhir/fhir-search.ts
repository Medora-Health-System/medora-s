import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { FHIR_REQUEST_POLICY, parseStrictSearch } from "./fhir-protocol";

export type ParsedSearch = { count: number; cursor?: string; values: Record<string, string> };

type CursorPayload = { v: 1; r: string; k: string };
const CURSOR_KEY_RE = /^[A-Za-z0-9._~-]{1,512}$/;

function cursorSecret(): string {
  const secret = (process.env.FHIR_CURSOR_SIGNING_KEY ?? process.env.JWT_SECRET ?? "").trim();
  if (secret.length < 16) throw new Error("FHIR cursor signing key is required");
  return secret;
}

function signCursorPayload(payload: string): string {
  return createHmac("sha256", cursorSecret()).update(payload).digest("base64url");
}

export function encodeFhirCursor(resourceType: string, key: string): string {
  if (!resourceType || !CURSOR_KEY_RE.test(key)) throw new BadRequestException("Invalid pagination cursor key");
  const payload = Buffer.from(JSON.stringify({ v: 1, r: resourceType, k: key } satisfies CursorPayload), "utf8").toString("base64url");
  return `v1.${payload}.${signCursorPayload(payload)}`;
}

export function decodeFhirCursor(token: string, expectedResourceType?: string): string {
  if (typeof token !== "string" || token.length < 16 || token.length > 1024 || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new BadRequestException("Invalid pagination cursor");
  }
  const [, payload, signature] = token.split(".");
  const expected = signCursorPayload(payload!);
  const actualBuffer = Buffer.from(signature!, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) throw new BadRequestException("Invalid pagination cursor");
  let decoded: CursorPayload;
  try {
    decoded = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as CursorPayload;
  } catch {
    throw new BadRequestException("Invalid pagination cursor");
  }
  if (decoded?.v !== 1 || typeof decoded.r !== "string" || !CURSOR_KEY_RE.test(decoded.k) || (expectedResourceType && decoded.r !== expectedResourceType)) {
    throw new BadRequestException("Invalid pagination cursor");
  }
  return decoded.k;
}

@Injectable()
export class FhirSearchService {
  constructor(private readonly config: ConfigService) {}

  parse(query: Record<string, unknown>, allowed: readonly string[], resourceType?: string): ParsedSearch {
    parseStrictSearch(query, allowed);
    const values: Record<string, string> = {};
    for (const [key, raw] of Object.entries(query)) {
      if (Array.isArray(raw)) throw new BadRequestException("Repeated search parameters are not supported");
      const value = String(raw).trim();
      if (key !== "_cursor" && /[%_*\u0000-\u001f\u007f]/u.test(value)) throw new BadRequestException("Unsafe search parameter value");
      values[key] = value;
    }
    const count = values._count == null ? FHIR_REQUEST_POLICY.defaultCount : Number(values._count);
    if (!Number.isInteger(count) || count < 1 || count > FHIR_REQUEST_POLICY.maxCount) throw new BadRequestException("Invalid _count");
    const cursor = values._cursor ? decodeFhirCursor(values._cursor, resourceType) : undefined;
    delete values._count;
    delete values._cursor;
    return { count, cursor, values };
  }

  baseUrl(): string {
    const raw = this.config.get<string>("FHIR_PUBLIC_BASE_URL")?.replace(/\/$/, "");
    if (!raw) throw new Error("FHIR_PUBLIC_BASE_URL is required");
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid FHIR_PUBLIC_BASE_URL");
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid FHIR_PUBLIC_BASE_URL");
    return url.toString().replace(/\/$/, "");
  }
}

export function searchBundle<T extends { id?: string }>(baseUrl: string, resourceType: string, query: Record<string, unknown>, resources: T[], hasNext: boolean) {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (raw == null || Array.isArray(raw)) continue;
    params.set(key, String(raw));
  }
  const self = `${baseUrl}/${resourceType}${params.size ? `?${params}` : ""}`;
  const link: Array<{ relation: string; url: string }> = [{ relation: "self", url: self }];
  const last = resources.at(-1)?.id;
  if (hasNext && last) {
    params.set("_cursor", encodeFhirCursor(resourceType, last));
    link.push({ relation: "next", url: `${baseUrl}/${resourceType}?${params}` });
  }
  const entry = resources.map((resource) => ({ fullUrl: `${baseUrl}/${resourceType}/${encodeURIComponent(resource.id!)}`, resource, search: { mode: "match" } }));
  const pageFingerprint = createHash("sha256").update(self).update("\0").update(resources.map((r) => r.id ?? "").join("\0")).digest("hex").slice(0, 32);
  return { resourceType: "Bundle", id: pageFingerprint, type: "searchset", timestamp: new Date().toISOString(), link, entry };
}
