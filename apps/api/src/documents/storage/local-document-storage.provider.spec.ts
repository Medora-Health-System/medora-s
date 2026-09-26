import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("LocalDocumentStorageProvider storage boundary", () => {
  const originalStorageDir = process.env.MEDORA_DOCUMENT_STORAGE_DIR;
  let root: string;

  beforeEach(() => {
    jest.resetModules();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "medora-storage-test-"));
    process.env.MEDORA_DOCUMENT_STORAGE_DIR = root;
  });

  afterEach(() => {
    if (originalStorageDir === undefined) delete process.env.MEDORA_DOCUMENT_STORAGE_DIR;
    else process.env.MEDORA_DOCUMENT_STORAGE_DIR = originalStorageDir;
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function provider() {
    const { LocalDocumentStorageProvider } = await import("./local-document-storage.provider");
    return new LocalDocumentStorageProvider();
  }

  const input = (documentId = "doc_123") => ({
    documentId,
    facilityId: "facility_123",
    fileName: "../../patient.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("test"),
  });

  it("stores by validated document identity and returns an opaque key, not a filesystem path", async () => {
    const storage = await provider();
    const saved = await storage.save(input());
    expect(saved.storagePath).toBe("local://doc_123");
    expect(saved.storagePath).not.toContain(root);
    await expect(storage.read(saved.storagePath, "doc_123")).resolves.toMatchObject({
      provider: "local",
      buffer: Buffer.from("test"),
    });
  });

  it("does not use facilityId or fileName to construct the filesystem path", async () => {
    const storage = await provider();
    const saved = await storage.save({
      ...input("doc_safe"),
      facilityId: "../outside",
      fileName: "../../../../outside.pdf",
    });
    expect(saved.storagePath).toBe("local://doc_safe");
    expect(fs.readFileSync(path.join(root, "doc_safe"), "utf8")).toBe("test");
  });

  it("rejects invalid document identifiers before filesystem access", async () => {
    const storage = await provider();
    await expect(storage.save(input("../outside"))).rejects.toThrow("Invalid document storage identifier");
  });

  it("binds reads to both the opaque storage key and expected document id", async () => {
    const storage = await provider();
    const saved = await storage.save(input("doc_a"));
    await expect(storage.read(saved.storagePath, "doc_b")).resolves.toBeNull();
    await expect(storage.read("local://../outside", "doc_a")).resolves.toBeNull();
  });

  it("does not follow a symlink in place of a stored document", async () => {
    const storage = await provider();
    const outside = path.join(os.tmpdir(), `medora-outside-${Date.now()}.txt`);
    fs.writeFileSync(outside, "sensitive");
    fs.symlinkSync(outside, path.join(root, "doc_link"));
    try {
      await expect(storage.read("local://doc_link", "doc_link")).resolves.toBeNull();
      await expect(storage.exists("local://doc_link", "doc_link")).resolves.toBe(false);
      await storage.delete("local://doc_link", "doc_link");
      expect(fs.readFileSync(outside, "utf8")).toBe("sensitive");
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  it("works when the configured root has a symlinked ancestor", async () => {
    const actualParent = fs.mkdtempSync(path.join(os.tmpdir(), "medora-real-parent-"));
    const alias = path.join(os.tmpdir(), `medora-parent-alias-${Date.now()}`);
    fs.symlinkSync(actualParent, alias, "dir");
    process.env.MEDORA_DOCUMENT_STORAGE_DIR = path.join(alias, "documents");
    jest.resetModules();
    try {
      const storage = await provider();
      const saved = await storage.save(input("doc_alias"));
      await expect(storage.read(saved.storagePath, "doc_alias")).resolves.toMatchObject({
        provider: "local",
        buffer: Buffer.from("test"),
      });
    } finally {
      fs.rmSync(alias, { force: true });
      fs.rmSync(actualParent, { recursive: true, force: true });
    }
  });
});
