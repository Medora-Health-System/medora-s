# Inpatient Overview chart foundation certification

## Scope certified

* Purpose-built inpatient clinical Overview is the sole primary Overview content.
* Provider composition/governance workbench is not mounted in Overview.
* RN Admission and Assessment are the first workflow entries after Overview.
* Admission selection mounts the existing chartable admission shell and retains versioned persistence.
* Overview consumes read-only authoritative synthesis and linked clinical documentation projections.
* Patient/safety header remains authoritative and shared across roles.
* ED and Observation routes and presentations are unchanged; inpatient synthesis remains type-gated.
* EN/FR label catalogues remain paired and authored clinical content remains untranslated.

## Evidence and limitations

Automated evidence covers pure projection behavior, role navigation, inpatient/ED/Observation route classification, authoritative domain-state handling, localization parity, and absence of the legacy Overview composition mount. Build/test commands and their exact outcomes are recorded in the PR/final report.

Residual clinical limitations are intentionally disclosed in the audit: certified structured device projection is absent; legacy result text cannot safely yield invented units/reference ranges; and the compact nursing module does not yet expose admission RN attribution. These gaps require domain-specific follow-up and do not justify duplicate persistence.

## Data operations

* Prisma schema changed: **NO**
* Migration required: **NO**
* Seed required: **NO**
* Production accessed: **NO**
* Deployment performed: **NO**
* Merge performed: **NO**
