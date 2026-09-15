import { classifyDiagnosticDeliveryResponse } from "./diagnostic-outbound-delivery.policy";

describe("diagnostic outbound delivery policy", () => {
  it("acknowledges successful partner responses", () => {
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 1, statusCode: 201 })).toEqual({ state: "acknowledged" });
  });

  it("retries transient failures with bounded exponential backoff", () => {
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 1, statusCode: 503 })).toEqual({
      state: "retryable_failure",
      retryAfterSeconds: 30,
    });
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 4, networkFailure: true })).toEqual({
      state: "retryable_failure",
      retryAfterSeconds: 240,
    });
  });

  it("dead-letters a transient failure after the bounded attempt limit", () => {
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 5, statusCode: 429 })).toEqual({ state: "dead_lettered" });
  });

  it("does not retry permanent partner rejection", () => {
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 1, statusCode: 400 })).toEqual({ state: "permanent_failure" });
    expect(classifyDiagnosticDeliveryResponse({ attemptNumber: 1, statusCode: 401 })).toEqual({ state: "permanent_failure" });
  });
});
