import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("LocalDocumentStorageProvider path containment", () => {
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

  it("stores and reads a document inside the configured root", async () => {
    const storage = await provider();
    const saved = await storage.save({
      facilityId: "facility_123",
      fileName: "packet.pdf",
      buffer: Buffer.from("test"),
    } as any);
    expect(path.resolve(saved.storagePath).startsWith(path.resolve(root) + path.sep)).toBe(true);
    await expect(storage.read(saved.storagePath)).resolves.toMatchObject({ provider: "local" });
  });

  it("rejects a traversal facility identifier", async () => {
    const storage = await provider();
    await expect(storage.save({
      facilityId: "../outside",
      fileName: "packet.pdf",
      buffer: Buffer.from("test"),
    } as any)).rejects.toThrow("Invalid facility storage identifier");
  });

  it("does not read, probe, or delete paths outside the configured root", async () => {
    const storage = await provider();
    const outside = path.join(os.tmpdir(), `medora-outside-${Date.now()}.txt`);
    fs.writeFileSync(outside, "sensitive");
    try {
      await expect(storage.read(outside)).resolves.toBeNull();
      await expect(storage.exists(outside)).resolves.toBe(false);
      await storage.delete(outside);
      expect(fs.existsSync(outside)).toBe(true);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });
});
