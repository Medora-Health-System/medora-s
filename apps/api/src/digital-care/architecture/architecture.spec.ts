import * as fs from "node:fs";
import * as path from "node:path";

const DIGITAL_CARE_ROOT = path.resolve(__dirname, "..");
const API_SRC_ROOT = path.resolve(DIGITAL_CARE_ROOT, "..");

function listTypeScriptFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function importsFrom(source: string): string[] {
  const imports: string[] = [];
  const expression = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function relative(file: string): string {
  return path.relative(API_SRC_ROOT, file).replaceAll(path.sep, "/");
}

describe("Digital Care architecture", () => {
  const digitalCareFiles = listTypeScriptFiles(DIGITAL_CARE_ROOT).filter(
    (file) => !file.endsWith("architecture.spec.ts"),
  );

  it("keeps domain and contracts independent from transport and persistence frameworks", () => {
    const protectedFiles = digitalCareFiles.filter((file) => {
      const name = relative(file);
      return name.startsWith("digital-care/domain/") || name.startsWith("digital-care/contracts/");
    });

    const forbidden = [
      "@nestjs/common",
      "@nestjs/graphql",
      "express",
      "socket.io",
      "@prisma/client",
      "../prisma",
      "../../prisma",
    ];

    const violations = protectedFiles.flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      return importsFrom(source)
        .filter((specifier) => forbidden.some((token) => specifier.includes(token)))
        .map((specifier) => `${relative(file)} -> ${specifier}`);
    });

    expect(violations).toEqual([]);
  });

  it("prevents Digital Care from importing other domains' internals", () => {
    const forbiddenSegments = [
      "/repository",
      "/repositories",
      "/controller",
      "/controllers",
      "/service",
      "/services",
      "/prisma",
      "/persistence",
    ];

    // Module, staff, and patient-runtime files are composition adapters over existing
    // facility-scoped services. Domain/contracts remain isolated by the test above.
    const compositionFiles = new Set(["digital-care/digital-care.module.ts"]);
    const violations = digitalCareFiles.flatMap((file) => {
      const name = relative(file);
      if (compositionFiles.has(name)) return [];
      if (name.startsWith("digital-care/staff/") || name.startsWith("digital-care/runtime/")) return [];
      const source = fs.readFileSync(file, "utf8");
      return importsFrom(source)
        .filter((specifier) => specifier.startsWith("../") || specifier.startsWith("../../"))
        .filter((specifier) => forbiddenSegments.some((segment) => specifier.includes(segment)))
        .map((specifier) => `${name} -> ${specifier}`);
    });

    expect(violations).toEqual([]);
  });

  it("prevents modules outside Digital Care from deep-importing Digital Care internals", () => {
    const allApiFiles = listTypeScriptFiles(API_SRC_ROOT).filter(
      (file) => !file.startsWith(DIGITAL_CARE_ROOT),
    );

    const allowedExternalImports = new Set([
      "./digital-care/digital-care.module",
      "./digital-care/contracts/digital-care.contract",
    ]);

    const violations = allApiFiles.flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      return importsFrom(source)
        .filter((specifier) => specifier.includes("digital-care/"))
        .filter((specifier) => !allowedExternalImports.has(specifier))
        .map((specifier) => `${relative(file)} -> ${specifier}`);
    });

    expect(violations).toEqual([]);
  });
});
