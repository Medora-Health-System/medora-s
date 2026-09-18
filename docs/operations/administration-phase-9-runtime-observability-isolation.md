# Administration Phase 9 — API/runtime observability isolation

Phase 9 continues the enterprise backend program after authentication/session hardening. This gate audits the Administration operational surfaces called out for production certification: Export Monitoring, System Health, Backup & Recovery, ROI monitoring, and the facility ROI workflow.

## Findings repaired

### MON-9.1 — Export Monitoring failure summary crossed facility boundaries

`AdminExportMonitoringService` correctly scoped manual billing and ED-report evidence by facility, but its 48-hour automated-export failure query omitted `facilityId`. A platform operator viewing Facility A could therefore see a failure count influenced by Facility B.

The query now requires the selected facility.

### MON-9.2 — Export Monitoring admitted null-facility automation rows into facility history

The recent-export query used an OR predicate that admitted `facilityId = null` automation audit rows into every selected facility. Even when the row contained no direct patient payload, that made tenant operational evidence non-deterministic and could produce cross-facility monitoring/download context.

The history now requires exact `facilityId`.

### HEALTH-9.1 — System Health admitted global automation failures into facility health

`SystemHealthService` used the same null-facility OR behavior for recent external-billing failures. Facility A health could therefore be degraded by unscoped/global audit evidence.

System-health export evidence now requires exact `facilityId`.

Regression tests lock both services so facility monitoring queries cannot silently regain a global/null-facility fallback.

## Surfaces reviewed

### ROI / chart disclosure

The facility ROI controller is ADMIN-only behind JWT + RolesGuard. Service reads and transitions use `facilityId`; creation validates patient and optional encounter in the facility; fulfillment validates snapshots by facility and patient and checks encounter consistency; fulfilled document reads use the linked immutable chart-export snapshot; lifecycle and disclosure reads are audited.

Platform ROI monitoring is restricted to platform operators and returns aggregate counts rather than patient identifiers.

These controls are retained. Mutation race/concurrency hardening belongs to Phase 10, where state transitions across ROI and clinical mutations will be reviewed transactionally.

### Backup & Recovery

The current Backup Readiness surface is a configuration/readiness assertion layer. It checks production mode, configured database URL, declared backup/retention policy, restore-drill recency, alerts, and automation configuration.

It is **not** evidence that a backup exists, is encrypted, is restorable, or meets an RPO/RTO. Phase 12 must replace/augment declaration-only readiness with provider/backup-job/restore evidence before this surface can be treated as disaster-recovery certification.

### System Health

The service actively probes database reachability and combines runtime HTTP 5xx metrics, facility audit evidence, security-secret configuration probes, alerting configuration, chart-export integrity failures, and backup readiness.

Phase 9 fixes facility contamination in export health evidence. Phase 12 will expand dependency/degraded-mode semantics so a healthy API process cannot be confused with healthy hospital operations.

## Deliberate boundaries

- No Application Modules behavior is changed.
- No internal Medora billing behavior is changed.
- No clinical rule semantics are changed.
- No ROI state-machine semantics are changed in this phase.
- No backup capability is invented from environment flags.

The remaining program continues with Phase 10 clinical mutation/data integrity, Phase 11 PHI/document/storage security, Phase 12 operational resilience/backup/recovery, and Phase 13 repository-wide certification.
