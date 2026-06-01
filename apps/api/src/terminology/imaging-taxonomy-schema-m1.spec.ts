import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "../..");
const SCHEMA_PATH = join(REPO_ROOT, "prisma/schema.prisma");
const MIGRATION_PATH = join(
  REPO_ROOT,
  "prisma/migrations/20260902120000_imaging_taxonomy_classifiers/migration.sql"
);

function assertMigrationIsAdditiveOnly(sql: string): void {
  const forbiddenLinePatterns = [
    /^\s*DROP\b/i,
    /^\s*DELETE\b/i,
    /^\s*UPDATE\b/i,
    /^\s*TRUNCATE\b/i,
    /^\s*ALTER\s+TYPE\b/i,
    /^\s*ALTER\s+TABLE\b[^;]*\bRENAME\b/i,
  ];
  const lines = sql.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    for (const pattern of forbiddenLinePatterns) {
      expect(trimmed).not.toMatch(pattern);
    }
  }
}

describe("imaging taxonomy 3C-M1 schema safety", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const migration = readFileSync(MIGRATION_PATH, "utf8");

  it("migration SQL contains only additive operations", () => {
    assertMigrationIsAdditiveOnly(migration);
    expect(migration).toMatch(/ADD COLUMN "lateralityClassifierId"/);
    expect(migration).toMatch(/ADD COLUMN "anatomicSubregionClassifierId"/);
    expect(migration).toMatch(/ADD COLUMN "protocolClassifierId"/);
    expect(migration).toMatch(/CREATE INDEX "CatalogImagingStudy_lateralityClassifierId_idx"/);
    expect(migration).toMatch(/CREATE INDEX "CatalogImagingStudy_anatomicSubregionClassifierId_idx"/);
    expect(migration).toMatch(/CREATE INDEX "CatalogImagingStudy_protocolClassifierId_idx"/);
    expect(migration).toMatch(/ADD CONSTRAINT "CatalogImagingStudy_lateralityClassifierId_fkey"/);
    expect(migration).toMatch(/ADD CONSTRAINT "CatalogImagingStudy_anatomicSubregionClassifierId_fkey"/);
    expect(migration).toMatch(/ADD CONSTRAINT "CatalogImagingStudy_protocolClassifierId_fkey"/);
    expect(migration).toMatch(/ON DELETE SET NULL ON UPDATE NO ACTION/g);
    expect(migration.match(/ON DELETE SET NULL ON UPDATE NO ACTION/g)?.length).toBe(3);
  });

  it("Prisma schema defines three nullable classifier FK columns on CatalogImagingStudy", () => {
    const imagingBlock = schema.slice(
      schema.indexOf("model CatalogImagingStudy"),
      schema.indexOf("model ImagingStudyAlias")
    );
    expect(imagingBlock).toMatch(/lateralityClassifierId\s+String\?/);
    expect(imagingBlock).toMatch(/anatomicSubregionClassifierId\s+String\?/);
    expect(imagingBlock).toMatch(/protocolClassifierId\s+String\?/);
  });

  it("Prisma schema defines three classifier indexes on CatalogImagingStudy", () => {
    const imagingBlock = schema.slice(
      schema.indexOf("model CatalogImagingStudy"),
      schema.indexOf("model ImagingStudyAlias")
    );
    expect(imagingBlock).toMatch(/@@index\(\[lateralityClassifierId\]\)/);
    expect(imagingBlock).toMatch(/@@index\(\[anatomicSubregionClassifierId\]\)/);
    expect(imagingBlock).toMatch(/@@index\(\[protocolClassifierId\]\)/);
  });

  it("Prisma schema defines three TermClassifier relations with SetNull on delete", () => {
    const imagingBlock = schema.slice(
      schema.indexOf("model CatalogImagingStudy"),
      schema.indexOf("model ImagingStudyAlias")
    );
    expect(imagingBlock).toMatch(
      /lateralityClassifier\s+TermClassifier\?\s+@relation\("ImagingLateralityClassifier"[\s\S]*onDelete: SetNull, onUpdate: NoAction/
    );
    expect(imagingBlock).toMatch(
      /anatomicSubregionClassifier\s+TermClassifier\?\s+@relation\("ImagingAnatomicSubregionClassifier"[\s\S]*onDelete: SetNull, onUpdate: NoAction/
    );
    expect(imagingBlock).toMatch(
      /protocolClassifier\s+TermClassifier\?\s+@relation\("ImagingProtocolClassifier"[\s\S]*onDelete: SetNull, onUpdate: NoAction/
    );

    const classifierBlock = schema.slice(
      schema.indexOf("model TermClassifier"),
      schema.indexOf("model TermClassifierLabel")
    );
    expect(classifierBlock).toMatch(/imagingLaterality\s+CatalogImagingStudy\[\]\s+@relation\("ImagingLateralityClassifier"\)/);
    expect(classifierBlock).toMatch(
      /imagingAnatomicSubregion\s+CatalogImagingStudy\[\]\s+@relation\("ImagingAnatomicSubregionClassifier"\)/
    );
    expect(classifierBlock).toMatch(/imagingProtocol\s+CatalogImagingStudy\[\]\s+@relation\("ImagingProtocolClassifier"\)/);
  });
});
