-- Phase 7: delegated corporate country administration scope.
-- No user receives delegated geography by default.
CREATE TABLE "PlatformCountryScopeGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "grantedByUserId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantReason" TEXT NOT NULL,
  "ticketReference" TEXT,
  "revokedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokeReason" TEXT,
  CONSTRAINT "PlatformCountryScopeGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformCountryScopeGrant_userId_isActive_idx" ON "PlatformCountryScopeGrant"("userId","isActive");
CREATE INDEX "PlatformCountryScopeGrant_countryCode_isActive_idx" ON "PlatformCountryScopeGrant"("countryCode","isActive");
CREATE INDEX "PlatformCountryScopeGrant_grantedByUserId_idx" ON "PlatformCountryScopeGrant"("grantedByUserId");
CREATE INDEX "PlatformCountryScopeGrant_revokedByUserId_idx" ON "PlatformCountryScopeGrant"("revokedByUserId");
CREATE UNIQUE INDEX "PlatformCountryScopeGrant_one_active_country_per_user" ON "PlatformCountryScopeGrant"("userId","countryCode") WHERE "isActive" = true;
ALTER TABLE "PlatformCountryScopeGrant" ADD CONSTRAINT "PlatformCountryScopeGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCountryScopeGrant" ADD CONSTRAINT "PlatformCountryScopeGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCountryScopeGrant" ADD CONSTRAINT "PlatformCountryScopeGrant_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
