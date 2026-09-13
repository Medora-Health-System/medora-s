import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

const CODES: Record<number, string> = {
  400: "invalid",
  401: "login",
  403: "forbidden",
  404: "not-found",
  405: "not-supported",
  406: "not-supported",
  409: "conflict",
  412: "conflict",
  413: "too-costly",
  414: "too-costly",
  415: "not-supported",
  422: "invalid",
  429: "throttled",
  500: "exception",
  503: "transient",
};

const SAFE_DIAGNOSTICS: Record<number, string> = {
  400: "Invalid FHIR request",
  401: "Authentication required",
  403: "Access denied",
  404: "Resource not found",
  405: "FHIR interaction is not supported",
  406: "Requested response media type is not supported",
  409: "FHIR request conflicts with current state",
  412: "FHIR precondition failed",
  413: "FHIR payload is too large",
  414: "FHIR request URI is too large",
  415: "FHIR request media type is not supported",
  422: "FHIR resource is semantically invalid",
  429: "Rate limit exceeded",
  500: "Internal server error",
  503: "FHIR service is temporarily unavailable",
};

@Catch()
export class FhirOperationOutcomeFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<{ requestId?: string; method?: string; url?: string }>();
    const res = http.getResponse();
    let status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === 404 && !["GET", "HEAD"].includes(req.method ?? "")) status = 405;
    const safeDiagnostics = status >= 500 ? (SAFE_DIAGNOSTICS[status] ?? "Internal server error") : (SAFE_DIAGNOSTICS[status] ?? "FHIR request failed");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Accept");
    if (status === 405) res.setHeader("Allow", "GET, HEAD");
    res.status(status).type("application/fhir+json").send({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: CODES[status] ?? "exception", diagnostics: safeDiagnostics, ...(req.requestId ? { details: { text: `request-id: ${req.requestId}` } } : {}) }],
    });
  }
}
