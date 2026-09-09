import { CallHandler, ExecutionContext, Injectable, NestInterceptor, NotAcceptableException, UnsupportedMediaTypeException } from "@nestjs/common";
import { map, Observable, timeout } from "rxjs";
import { FHIR_REQUEST_POLICY } from "./fhir-protocol";

@Injectable()
export class FhirMediaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const accept = String(req.headers.accept ?? "*/*").toLowerCase();
    const wireMedia = ["application/fhir+json", "application/json"];
    if (!["*/*", ...wireMedia].some((m) => accept.split(",").some((v: string) => v.trim().split(";")[0] === m))) throw new NotAcceptableException("Only FHIR JSON is available");
    if (!["GET", "HEAD"].includes(req.method)) {
      const contentType = String(req.headers["content-type"] ?? "").split(";")[0].toLowerCase();
      if (!wireMedia.includes(contentType)) throw new UnsupportedMediaTypeException("Unsupported FHIR Content-Type");
    }
    if (String(req.originalUrl ?? req.url).length > FHIR_REQUEST_POLICY.maxQueryBytes) throw new NotAcceptableException("FHIR query is too large");
    res.type("application/fhir+json");
    if (!String(req.originalUrl ?? req.url).replace(/\?.*$/, "").endsWith("/metadata")) res.setHeader("Cache-Control", "no-store");
    return next.handle().pipe(timeout(FHIR_REQUEST_POLICY.timeoutMs), map((body) => {
      if (Buffer.byteLength(JSON.stringify(body)) > FHIR_REQUEST_POLICY.maxResponseBytes) throw new NotAcceptableException("FHIR response exceeds safety ceiling");
      return body;
    }));
  }
}
