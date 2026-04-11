-- AlterTable
ALTER TABLE "MsppUserRoleAssignment" ADD COLUMN "allGeoDepartments" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MsppUserRoleAssignment_userId_role_allGeoDepartments_idx" ON "MsppUserRoleAssignment"("userId", "role", "allGeoDepartments");
