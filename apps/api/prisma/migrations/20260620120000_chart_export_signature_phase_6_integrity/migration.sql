-- Phase 6 — Chart export chain-of-custody hardening (additive only).
--
-- Adds:
--   * EncounterChartExport.manifestSignature (nullable text)
--       HMAC-SHA256 over manifestHash, formatted as "<sigVersion>:<hex>".
--       Nullable so pre-Phase-6 snapshots remain readable; new snapshots
--       require it in production (enforced in service layer).
--   * AuditAction.RECORD_EXPORT_INTEGRITY_FAILURE
--       Critical audit emitted when stored hash and/or HMAC signature
--       fails verification at retrieval time. PHI-safe metadata only.
--
-- No destructive changes. No backfill required.

ALTER TABLE "EncounterChartExport"
  ADD COLUMN "manifestSignature" TEXT;

ALTER TYPE "AuditAction" ADD VALUE 'RECORD_EXPORT_INTEGRITY_FAILURE';
