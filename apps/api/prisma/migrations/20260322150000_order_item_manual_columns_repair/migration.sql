-- Repair: colonnes saisie manuelle sur OrderItem (bases sans migration 20260322120000 ou drift).
-- Idempotent : sans effet si les colonnes existent déjà.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "manualLabel" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "manualSecondaryText" TEXT;
