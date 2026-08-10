-- D4SEC.1C.4A: assurance belongs to an AuthSession, never to the user globally.
ALTER TABLE "AuthSession"
  ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "mfaMethod" TEXT;

CREATE INDEX "AuthSession_userId_mfaVerifiedAt_idx"
  ON "AuthSession"("userId", "mfaVerifiedAt");
