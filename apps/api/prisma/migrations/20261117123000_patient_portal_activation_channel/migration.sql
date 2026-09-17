-- Channel distinguishes 15-minute staff codes from 24-hour email invitations.
-- Same PatientPortalActivation authority: hash-only secret, one-time, Patient+Facility scoped.
ALTER TABLE "PatientPortalActivation"
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'MANUAL_CODE';

ALTER TABLE "PatientPortalActivation"
  ADD CONSTRAINT "PatientPortalActivation_channel_check"
  CHECK ("channel" IN ('MANUAL_CODE', 'EMAIL_INVITATION'));
