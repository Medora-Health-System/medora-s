/**
 * Regenerates raster favicon / PWA icons from public/branding/medora-favicon-source.jpg
 * (official Medora mark — navy + turquoise rounded-square logo).
 * Run: node scripts/generate-brand-icons.mjs (from apps/web)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "public/branding/medora-favicon-source.jpg");
const appDir = path.join(root, "app");

function packIcoFromPng(pngBuffer) {
  const icondir = Buffer.alloc(6);
  icondir.writeUInt16LE(0, 0);
  icondir.writeUInt16LE(1, 2);
  icondir.writeUInt16LE(1, 4);
  const w = 32;
  const h = 32;
  const entry = Buffer.alloc(16);
  entry[0] = w;
  entry[1] = h;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([icondir, entry, pngBuffer]);
}

async function squareLogoPipeline() {
  const meta = await sharp(sourcePath).metadata();
  const size = Math.min(meta.width ?? 0, meta.height ?? 0);
  const left = Math.floor(((meta.width ?? size) - size) / 2);
  const top = Math.floor(((meta.height ?? size) - size) / 2);
  return sharp(sourcePath).extract({ left, top, width: size, height: size });
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source image: ${sourcePath}`);
  process.exit(1);
}

const square = await squareLogoPipeline();

const png16 = await square.clone().resize(16, 16).png().toBuffer();
const png32 = await square.clone().resize(32, 32).png().toBuffer();
const png180 = await square.clone().resize(180, 180).png().toBuffer();
const png192 = await square.clone().resize(192, 192).png().toBuffer();
const png512 = await square.clone().resize(512, 512).png().toBuffer();

const publicDir = path.join(root, "public");
fs.writeFileSync(path.join(publicDir, "favicon.ico"), packIcoFromPng(png32));
fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16);
fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), png180);

fs.mkdirSync(appDir, { recursive: true });
fs.writeFileSync(path.join(appDir, "favicon.ico"), packIcoFromPng(png32));
fs.writeFileSync(path.join(appDir, "icon.png"), png512);
fs.writeFileSync(path.join(appDir, "apple-icon.png"), png180);

console.log(
  "Wrote favicon.ico, favicon-16x16.png, favicon-32x32.png, icon-192.png, icon-512.png, apple-touch-icon.png, app/icon.png, app/apple-icon.png from medora-favicon-source.jpg"
);
