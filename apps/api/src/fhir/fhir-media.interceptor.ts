import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, NotAcceptableException, UnsupportedMediaTypeException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { map, Observable, timeout } from "rxjs";
import { FHIR_REQUEST_POLICY } from "./fhir-protocol";

const WIRE_MEDIA = ["application/fhir+json", "application/json"];
const NON_INSTANCE_TYPES = new Set(["Bundle", "CapabilityStatement", "OperationOutcome"]);

export function decorateFhirReadResource(body: unknown): { body: unknown; etag?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { body };
  const resource = body as Record<string, any>;
  if (typeof resource.resourceType !== "string" || NON_INSTANCE_TYPES.has(resource.resourceType) || typeof resource.id !== "string") return { body };
  const existingMeta = resource.meta && typeof resource.meta === "object" && !Array.isArray(resource.meta) ? resource.meta : {};
  const material: Record<string, any> = { ...resource, meta: { ...existingMeta } };
  delete material.meta.versionId;
  if (Object.keys(material.meta).length === 0) delete material.meta;
  const versionId = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 32);
  return { body: { ...resource, meta: { ...existingMeta, versionId } }, etag: `W/\"${versionId}\"` };
}

@Injectable()
export class FhirMediaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const accept = String(req.headers.accept ?? "*/*").toLowerCase();
    const accepted = accept.split(",").map((value: string) => value.trim().split(";")[0]);
    if (!["*/*", ...WIRE_MEDIA].some((media) => accepted.includes(media))) throw new NotAcceptableException("Only FHIR JSON is available");
    if (!["GET", "HEAD"].includes(req.method)) {
      const contentType = String(req.headers["content-type"] ?? "").split(";")[0].toLowerCase();
      if (!WIRE_MEDIA.includes(contentType)) throw new UnsupportedMediaTypeException("Unsupported FHIR Content-Type");
    }
    if (String(req.originalUrl ?? req.url).length > FHIR_REQUEST_POLICY.maxQueryBytes) throw new HttpException("FHIR request URI is too large", 414);
    res.type("application/fhir+json");
    res.setHeader("Vary", "Accept");
    const isMetadata = String(req.originalUrl ?? req.url).replace(/\?.*$/, "").endsWith("/metadata");
    res.setHeader("Cache-Control", isMetadata ? "private, max-age=60" : "no-store");
    return next.handle().pipe(timeout(FHIR_REQUEST_POLICY.timeoutMs), map((body) => {
      const decorated = req.method === "GET" ? decorateFhirReadResource(body) : { body };
      if (decorated.etag) res.setHeader("ETag", decorated.etag);
      const decoratedBody = decorated.body;
      if (Buffer.byteLength(JSON.stringify(decoratedBody)) > FHIR_REQUEST_POLICY.maxResponseBytes) throw new NotAcceptableException("FHIR response exceeds safety ceiling");
      return decoratedBody;
    }));
  }
}
