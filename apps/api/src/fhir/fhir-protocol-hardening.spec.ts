import { BadRequestException } from "@nestjs/common";
import { fhirSearchParameterType } from "./fhir.controller";
import { decorateFhirReadResource } from "./fhir-media.interceptor";
import { decodeFhirCursor, encodeFhirCursor, searchBundle } from "./fhir-search";

describe("MEDORA.RD.P0.3D FHIR protocol hardening", () => {
  const previousCursorKey = process.env.FHIR_CURSOR_SIGNING_KEY;

  beforeAll(() => {
    process.env.FHIR_CURSOR_SIGNING_KEY = "p03d-test-cursor-signing-key-32-bytes";
  });

  afterAll(() => {
    if (previousCursorKey === undefined) delete process.env.FHIR_CURSOR_SIGNING_KEY;
    else process.env.FHIR_CURSOR_SIGNING_KEY = previousCursorKey;
  });

  test("opaque signed cursors round-trip, bind to resource type, and reject tampering", () => {
    const cursor = encodeFhirCursor("Patient", "00000000-0000-4000-8000-000000000001");
    expect(cursor).toMatch(/^v1\./);
    expect(cursor).not.toContain("00000000-0000-4000-8000-000000000001");
    expect(decodeFhirCursor(cursor, "Patient")).toBe("00000000-0000-4000-8000-000000000001");
    expect(() => decodeFhirCursor(cursor, "Encounter")).toThrow(BadRequestException);
    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith("a") ? "b" : "a"}`;
    expect(() => decodeFhirCursor(tampered, "Patient")).toThrow(BadRequestException);
  });

  test("searchset bundles emit absolute self/fullUrl links and opaque continuation cursors", () => {
    const bundle: any = searchBundle(
      "https://fhir.example.test/fhir",
      "Patient",
      { family: "Smith", _count: "1" },
      [{ resourceType: "Patient", id: "00000000-0000-4000-8000-000000000001" }],
      true,
    );
    expect(bundle).toMatchObject({ resourceType: "Bundle", type: "searchset" });
    expect(bundle.id).toMatch(/^[a-f0-9]{32}$/);
    expect(bundle.timestamp).toBeTruthy();
    expect(bundle.link.find((link: any) => link.relation === "self").url).toBe("https://fhir.example.test/fhir/Patient?family=Smith&_count=1");
    expect(bundle.entry[0]).toMatchObject({ fullUrl: "https://fhir.example.test/fhir/Patient/00000000-0000-4000-8000-000000000001", search: { mode: "match" } });
    const next = new URL(bundle.link.find((link: any) => link.relation === "next").url);
    const cursor = next.searchParams.get("_cursor")!;
    expect(cursor).not.toContain("00000000-0000-4000-8000-000000000001");
    expect(decodeFhirCursor(cursor, "Patient")).toBe("00000000-0000-4000-8000-000000000001");
  });

  test("instance reads receive deterministic representation version metadata and weak ETags", () => {
    const source = { resourceType: "Patient", id: "p-1", active: true, name: [{ family: "Smith" }] };
    const first: any = decorateFhirReadResource(source);
    const second: any = decorateFhirReadResource(source);
    expect(first.etag).toMatch(/^W\/"[a-f0-9]{32}"$/);
    expect(first.body.meta.versionId).toHaveLength(32);
    expect(second.etag).toBe(first.etag);
    expect(decorateFhirReadResource({ resourceType: "Bundle", type: "searchset" }).etag).toBeUndefined();
  });

  test("CapabilityStatement search parameter types reflect actual protocol semantics", () => {
    expect(fhirSearchParameterType("patient")).toBe("reference");
    expect(fhirSearchParameterType("date")).toBe("date");
    expect(fhirSearchParameterType("family")).toBe("string");
    expect(fhirSearchParameterType("_count")).toBe("number");
    expect(fhirSearchParameterType("status")).toBe("token");
    expect(fhirSearchParameterType("identifier")).toBe("token");
  });
});
