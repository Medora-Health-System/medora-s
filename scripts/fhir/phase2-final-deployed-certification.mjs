import crypto from "node:crypto";

const required = ["FHIR_CERT_BASE_URL", "FHIR_CERT_CLIENT_ID", "FHIR_CERT_KEY_ID", "FHIR_CERT_CLIENT_SECRET", "FHIR_CERT_FACILITY_ID"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);

const baseUrl = process.env.FHIR_CERT_BASE_URL.replace(/\/$/, "");
const tokenUrl = `${baseUrl}/auth/token`;
const clientId = process.env.FHIR_CERT_CLIENT_ID;
const keyId = process.env.FHIR_CERT_KEY_ID;
const clientSecret = process.env.FHIR_CERT_CLIENT_SECRET;
const facilityId = process.env.FHIR_CERT_FACILITY_ID;
const wrongFacilityId = crypto.randomUUID();
const evidence = [];

async function json(response) { try { return await response.json(); } catch { return null; } }
function record(check, resource, status) { evidence.push({ check, resource, status }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function token(scope, targetFacilityId = facilityId) {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, keyId, clientSecret, facilityId: targetFacilityId, scope }),
  });
  const body = await json(response);
  return { response, body, accessToken: body?.access_token };
}

async function get(path, accessToken, headers = {}) {
  const target = path.startsWith("http") ? path : `${baseUrl}/${path.replace(/^\//, "")}`;
  assert(target === baseUrl || target.startsWith(`${baseUrl}/`), "Refusing to follow URL outside configured FHIR base URL");
  const response = await fetch(target, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/fhir+json", ...headers } });
  return { response, body: await json(response) };
}

async function certifyResource(resource, readScope, searchScope) {
  const searchToken = await token(searchScope);
  assert(searchToken.response.ok && searchToken.accessToken, `${resource}: search token issuance failed`);
  record("search-token", resource, searchToken.response.status);

  const search = await get(`${resource}?_count=1`, searchToken.accessToken);
  assert(search.response.ok, `${resource}: search failed with ${search.response.status}`);
  assert(search.body?.resourceType === "Bundle" && search.body?.type === "searchset", `${resource}: search did not return Bundle/searchset`);
  const first = search.body?.entry?.[0]?.resource;
  assert(first?.resourceType === resource && first?.id, `${resource}: deployed certification requires at least one governed test resource`);
  record("search", resource, search.response.status);

  const readToken = await token(readScope);
  assert(readToken.response.ok && readToken.accessToken, `${resource}: read token issuance failed`);
  const read = await get(`${resource}/${encodeURIComponent(first.id)}`, readToken.accessToken);
  assert(read.response.ok && read.body?.resourceType === resource && read.body?.id === first.id, `${resource}: direct read failed`);
  record("read", resource, read.response.status);

  const readCannotSearch = await get(`${resource}?_count=1`, readToken.accessToken);
  assert(readCannotSearch.response.status === 403, `${resource}: read-only token unexpectedly allowed search`);
  record("read-token-search-denied", resource, readCannotSearch.response.status);

  const searchCannotRead = await get(`${resource}/${encodeURIComponent(first.id)}`, searchToken.accessToken);
  assert(searchCannotRead.response.status === 403, `${resource}: search-only token unexpectedly allowed direct read`);
  record("search-token-read-denied", resource, searchCannotRead.response.status);

  const conflict = await get(`${resource}?_count=1`, searchToken.accessToken, { "x-facility-id": wrongFacilityId });
  assert([401, 403].includes(conflict.response.status), `${resource}: conflicting facility header was not rejected`);
  record("conflicting-facility-denied", resource, conflict.response.status);
}

const wrongFacility = await token("documentReference.search", wrongFacilityId);
assert([401, 403].includes(wrongFacility.response.status), "Wrong-facility token request was not rejected");
record("wrong-facility-token-denied", "DocumentReference", wrongFacility.response.status);

const ungranted = await token("documentReference.write");
assert(ungranted.response.status === 403, "Ungrantable write scope was not rejected");
record("ungranted-write-scope-denied", "DocumentReference", ungranted.response.status);

await certifyResource("DocumentReference", "documentReference.read", "documentReference.search");
await certifyResource("Provenance", "provenance.read", "provenance.search");

const docToken = await token("documentReference.search");
assert(docToken.response.ok && docToken.accessToken, "DocumentReference token issuance failed for cross-resource test");
const docToProv = await get("Provenance?_count=1", docToken.accessToken);
assert(docToProv.response.status === 403, "DocumentReference scope unexpectedly allowed Provenance search");
record("cross-resource-scope-denied", "DocumentReference->Provenance", docToProv.response.status);

const provToken = await token("provenance.search");
assert(provToken.response.ok && provToken.accessToken, "Provenance token issuance failed for cross-resource test");
const provToDoc = await get("DocumentReference?_count=1", provToken.accessToken);
assert(provToDoc.response.status === 403, "Provenance scope unexpectedly allowed DocumentReference search");
record("cross-resource-scope-denied", "Provenance->DocumentReference", provToDoc.response.status);

console.log(JSON.stringify({ certification: "FHIR Phase 2 final deployed certification", outcome: "PASS", facilityIsolation: true, exactScopeIsolation: true, auditInspectionRequired: true, evidence }, null, 2));
