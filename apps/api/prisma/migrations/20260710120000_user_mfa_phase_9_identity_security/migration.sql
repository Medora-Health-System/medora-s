-- Phase 9 — Identity Security & MFA Hardening
--
-- Additive only. No destructive changes. Preserves all existing auth flow.
--
-- Adds TOTP-based MFA (RFC 6238) state to User:
--   * mfaEnabled            : whether MFA is active (after enrollment confirmation)
--   * mfaSecretEncrypted    : AES-256-GCM ciphertext of the base32 TOTP secret
--                             (format "v1:<base64Iv>:<base64Ciphertext>:<base64AuthTag>").
--                             Pending enrollment also stores here with mfaEnabled=false.
--   * mfaEnabledAt          : timestamp at which mfaEnabled flipped to true.
--   * mfaRecoveryCodesHash  : JSON array [{ hash, usedAt }]; argon2 hashes, single-use.
--   * mfaLastVerifiedAt     : last successful TOTP/recovery verification timestamp.
--   * mfaLastUsedStep       : RFC 6238 step counter (epoch / 30s) of last accepted code,
--                             used to prevent replay within the same TOTP step window.

ALTER TABLE "User"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
  ADD COLUMN "mfaRecoveryCodesHash" JSONB,
  ADD COLUMN "mfaLastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "mfaLastUsedStep" BIGINT;

-- Audit actions for MFA lifecycle. PHI-safe metadata only (no secrets, no codes, no PHI).
ALTER TYPE "AuditAction" ADD VALUE 'MFA_ENROLLMENT_INIT';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_LOGIN_CHALLENGE_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_LOGIN_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_LOGIN_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_CODE_USED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RECOVERY_CODES_REGENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RESET_BY_ADMIN';
