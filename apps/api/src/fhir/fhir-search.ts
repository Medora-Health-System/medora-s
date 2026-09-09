import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FHIR_REQUEST_POLICY, parseLogicalId, parseStrictSearch } from "./fhir-protocol";

export type ParsedSearch = { count: number; cursor?: string; values: Record<string, string> };

@Injectable()
export class FhirSearchService {
  constructor(private readonly config: ConfigService) {}
  parse(query: Record<string, unknown>, allowed: readonly string[]): ParsedSearch {
    parseStrictSearch(query, allowed);
    const values: Record<string, string> = {};
    for (const [key, raw] of Object.entries(query)) {
      if (Array.isArray(raw)) throw new BadRequestException("Repeated search parameters are not supported");
      const value = String(raw);
      if (/[%_*\u0000-\u001f\u007f]/u.test(value)) throw new BadRequestException("Unsafe search parameter value");
      values[key] = value.trim();
    }
    const count = values._count == null ? FHIR_REQUEST_POLICY.defaultCount : Number(values._count);
    if (!Number.isInteger(count) || count < 1 || count > FHIR_REQUEST_POLICY.maxCount) throw new BadRequestException("Invalid _count");
    const cursor = values._cursor ? parseLogicalId(values._cursor) : undefined;
    delete values._count; delete values._cursor;
    return { count, cursor, values };
  }

  baseUrl(): string {
    const raw = this.config.get<string>("FHIR_PUBLIC_BASE_URL")?.replace(/\/$/, "");
    if (!raw) throw new Error("FHIR_PUBLIC_BASE_URL is required");
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid FHIR_PUBLIC_BASE_URL");
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Invalid FHIR_PUBLIC_BASE_URL");
    return url.toString().replace(/\/$/, "");
  }
}

export function searchBundle<T extends { id?: string }>(baseUrl: string, resourceType: string, query: Record<string, unknown>, resources: T[], hasNext: boolean) {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) if (typeof raw === "string") params.set(key, raw);
  const self = `${baseUrl}/${resourceType}${params.size ? `?${params}` : ""}`;
  const link: Array<{ relation: string; url: string }> = [{ relation: "self", url: self }];
  const last = resources.at(-1)?.id;
  if (hasNext && last) { params.set("_cursor", last); link.push({ relation: "next", url: `${baseUrl}/${resourceType}?${params}` }); }
  return { resourceType: "Bundle", type: "searchset", link, entry: resources.map((resource) => ({ fullUrl: `${baseUrl}/${resourceType}/${encodeURIComponent(resource.id!)}`, resource, search: { mode: "match" } })) };
}
