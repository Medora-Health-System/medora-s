const fs = require("node:fs");
const path = require("node:path");

const apiRoot = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(apiRoot, "railway.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(apiRoot, "package.json"), "utf8"));
const expectedMigrationCommand = "pnpm --filter @medora/api migrate:deploy";

if (config?.deploy?.preDeployCommand !== expectedMigrationCommand) {
  throw new Error(`Railway preDeployCommand must be exactly: ${expectedMigrationCommand}`);
}
if (pkg?.scripts?.["migrate:deploy"] !== "prisma migrate deploy") {
  throw new Error("@medora/api migrate:deploy must remain prisma migrate deploy");
}
if (pkg?.scripts?.start !== "node dist/main.js") {
  throw new Error("API runtime start must remain migration-free; migrations belong in Railway pre-deploy");
}
if (config?.deploy?.healthcheckPath !== "/health/ready") {
  throw new Error("Railway API healthcheck must use /health/ready");
}
console.log("Railway deployment contract OK: migrations run before deploy; runtime start remains migration-free.");
