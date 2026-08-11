# D4SEC.1C.5B implementation

`GET /platform/governance-bootstrap` exposes only authoritative availability and fixed scope. `POST` accepts target UUID, reason, and ticket; principal and recent-MFA guards are followed by transaction revalidation. The first-approver procedure is: principal performs session MFA step-up, selects a distinct active user, reviews the fixed persona/capabilities, records a reason and ticket, confirms, and submits once. The newly established independent approver then approves later ordinary requests; the requester still cannot approve their own request.

The web localization provider owns `en`/`fr`, typed keys, persisted selection, document language, stable routes, and Intl formatting. Catalog domains are common, auth, navigation, platform, facilities, staff, security, compliance, billing, catalog, system, and clinical. Canonical API/storage values are never translated. Known error codes map to localized display messages; unknown errors use a generic localized fallback.

No migration, local migration command, production command, seed, production access, deployment, or merge is part of this change.

## Enterprise localization governance
Every new user-facing Medora feature must ship with English and French translations. Platform Admin uses the typed catalog plus its bounded source-literal catalog/bridge so legacy Platform components cannot bypass locale selection; a source scanner enforces catalog coverage. Non-Platform legacy rollout order is: (1) shared authentication/account UI, (2) Facility Admin, (3) Registration, (4) legacy Billing/RCM, (5) ED, (6) Observation, (7) Inpatient, (8) remaining clinical domains, (9) reports/analytics, and (10) patient-facing surfaces where applicable.
