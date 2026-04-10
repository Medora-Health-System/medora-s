-- CreateEnum
CREATE TYPE "MsppRoleCode" AS ENUM ('MSPP_MINISTRE', 'MSPP_EPIDEMIOLOGIE', 'MSPP_VALIDATOR_DEPT', 'MSPP_VALIDATOR_CENTRAL');

-- CreateTable
CREATE TABLE "MsppUserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MsppRoleCode" NOT NULL,
    "geoDepartmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsppUserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MsppUserRoleAssignment_userId_idx" ON "MsppUserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "MsppUserRoleAssignment_geoDepartmentId_idx" ON "MsppUserRoleAssignment"("geoDepartmentId");

-- CreateIndex
CREATE INDEX "MsppUserRoleAssignment_userId_role_idx" ON "MsppUserRoleAssignment"("userId", "role");

-- AddForeignKey
ALTER TABLE "MsppUserRoleAssignment" ADD CONSTRAINT "MsppUserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
