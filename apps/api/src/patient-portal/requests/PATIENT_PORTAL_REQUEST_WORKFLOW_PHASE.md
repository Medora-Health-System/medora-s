# Medora Patient — Request Workflows

This phase adds patient-originated service requests without allowing patient portal calls to mutate authoritative scheduling or medication records.

## Supported request types
- `APPOINTMENT_NEW`
- `APPOINTMENT_CHANGE`
- `APPOINTMENT_CANCEL`
- `MEDICATION_REFILL`

## Security invariants
- patient identity and facility scope come only from `PatientPortalAuthGuard` + `PatientPortalFacilityGuard`
- patient payloads cannot provide `patientId`, `facilityId`, staff user IDs, request status, or resolution state
- appointment references must match the server-derived patient and facility
- medication references must be existing `MEDICATION` / `PHARMACY_DISPENSE` order items for that patient and facility
- request writes are transactionally audited in `PatientPortalAuditLog`
- free-text request reasons are not copied into audit metadata
- staff queue access remains staff JWT + `RolesGuard`
- only `PROVIDER` may change request decision status in V1
- decision updates only change `PatientPortalServiceRequest`; they never update `Appointment`, `Order`, or `OrderItem`
- terminal/backward request-state transitions are rejected

## Important semantic boundary
`ACCEPTED` means the provider accepted the portal request for processing. It does not mean an appointment was rescheduled, an appointment was cancelled, or a prescription/refill was issued. Those authoritative operations remain separate existing Medora workflows.

The API response includes `authoritativeRecordChanged: false` on staff decisions and a patient-facing notice stating that the request itself does not alter authoritative records.
