/**
 * Regenerates raster icons from public/icons/icon-192.svg (single source of truth).
 * Run: node scripts/generate-brand-icons.mjs (from apps/web)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public/icons/icon-192.svg");
const svg = fs.readFileSync(svgPath);

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

const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png192 = await sharp(svg).resize(192, 192).png().toBuffer();
const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
const png180 = await sharp(svg).resize(180, 180).png().toBuffer();

fs.writeFileSync(path.join(root, "public/favicon.ico"), packIcoFromPng(png32));
fs.writeFileSync(path.join(root, "public/icon-192.png"), png192);
fs.writeFileSync(path.join(root, "public/icon-512.png"), png512);
fs.writeFileSync(path.join(root, "public/apple-touch-icon.png"), png180);

console.log("Wrote favicon.ico, icon-192.png, icon-512.png, apple-touch-icon.png from icon-192.svg");
