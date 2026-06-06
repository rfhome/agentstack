/**
 * Generates PWA icons for the manifest.
 * Run once: node scripts/generate-icons.js
 *
 * Outputs:
 *   public/icon-192.png          — "any" purpose (full bleed, sharp corners ok)
 *   public/icon-512.png          — "any" purpose
 *   public/icon-192-maskable.png — "maskable" purpose (content inside 80% safe zone)
 *   public/icon-512-maskable.png — "maskable" purpose
 *
 * Maskable icons: Android adaptive icons crop the outer 20% on all sides.
 * Safe zone = center 80% = 410×410 px on a 512 canvas.
 * We shrink the inner card and bolt so nothing gets clipped.
 */

const sharp = require("sharp");
const path = require("path");

// Standard icon — content fills most of the canvas with rounded corners
const svgAny = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#09090b"/>
  <rect x="56" y="56" width="400" height="400" rx="72" fill="#18181b"/>
  <polygon points="296,96 192,276 252,276 216,416 320,236 260,236" fill="white"/>
</svg>`.trim();

// Maskable icon — all content comfortably inside the 80% safe zone (±51px margin)
// We use a solid background that fills the full canvas (no rounded rect — Android masks it).
const svgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Full-bleed background — Android clips this to its shape, never cut off -->
  <rect width="512" height="512" fill="#18181b"/>
  <!-- Lightning bolt scaled down to stay well inside the 80% safe zone (center 410px) -->
  <!-- Original bolt scaled ~75% and centered: shift by ~64px each axis -->
  <polygon
    points="284,128 196,284 248,284 218,384 316,228 264,228"
    fill="white"
  />
</svg>`.trim();

const anyBuf = Buffer.from(svgAny);
const maskableBuf = Buffer.from(svgMaskable);

async function run() {
  const outDir = path.join(__dirname, "..", "public");

  await sharp(anyBuf).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  console.log("✓ public/icon-192.png");

  await sharp(anyBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  console.log("✓ public/icon-512.png");

  await sharp(maskableBuf).resize(192, 192).png().toFile(path.join(outDir, "icon-192-maskable.png"));
  console.log("✓ public/icon-192-maskable.png");

  await sharp(maskableBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512-maskable.png"));
  console.log("✓ public/icon-512-maskable.png");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
