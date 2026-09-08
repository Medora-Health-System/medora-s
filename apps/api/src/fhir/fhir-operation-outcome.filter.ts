import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

const CODES: Record<number, string> = { 400: "invalid", 401: "login", 403: "forbidden", 404: "not-found", 405: "not-supported", 409: "conflict", 412: "conflict", 413: "too-costly", 422: "invalid", 429: "throttled" };

@Catch()
export class FhirOperationOutcomeFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<{ requestId?: string; method?: string; url?: string }>();
    const res = http.getResponse();
    let status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === 404 && req.method !== "GET") status = 405;
    const safeDiagnostics = status >= 500 ? "Internal server error" : this.safeMessage(error, status);
    res.status(status).type("application/fhir+json").send({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: CODES[status] ?? "exception", diagnostics: safeDiagnostics, ...(req.requestId ? { details: { text: `request-id: ${req.requestId}` } } : {}) }],
    });
  }

  private safeMessage(error: unknown, status: number): string {
    if (!(error instanceof HttpException)) return "Request failed";
    if (status === 401) return "Authentication required";
    if (status === 403) return "Access denied";
    if (status === 404) return "Resource not found";
    if (status === 405) return "FHIR interaction is not supported";
    if (status === 429) return "Rate limit exceeded";
    const value = error.getResponse();
    const message = typeof value === "string" ? value : typeof value === "object" && value && "message" in value ? (value as { message?: unknown }).message : undefined;
    return typeof message === "string" && message.length <= 160 ? message : "Invalid FHIR request";
  }
}
