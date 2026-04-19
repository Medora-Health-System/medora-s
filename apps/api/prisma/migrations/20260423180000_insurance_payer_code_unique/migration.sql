-- Unique optional code for idempotent catalog upserts (PostgreSQL allows multiple NULL codes).
CREATE UNIQUE INDEX "InsurancePayer_code_key" ON "InsurancePayer"("code");
