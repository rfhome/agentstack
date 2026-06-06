/**
 * Generates PWA icons for the manifest.
 * Run once: node scripts/generate-icons.js
 * Output: public/icon-192.png, public/icon-512.png
 */

const sharp = require("sharp");
const path = require("path");

// Dark zinc-900 background (#18181b) with a white lightning bolt
// The bolt is the same ⚡ motif used in the log page's "Get Workout" button
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Background with rounded corners (maskable safe zone: inner 80%) -->
  <rect width="512" height="512" fill="#09090b"/>

  <!-- Subtle inner card -->
  <rect x="56" y="56" width="400" height="400" rx="72" fill="#18181b"/>

  <!-- Lightning bolt path (centered, white) -->
  <!-- Simplified bold bolt: top-right triangle to mid, then bottom-left sweep -->
  <polygon
    points="296,96 192,276 252,276 216,416 320,236 260,236"
    fill="white"
  />
</svg>
`.trim();

const svgBuf = Buffer.from(svg);

async function run() {
  const outDir = path.join(__dirname, "..", "public");

  await sharp(svgBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, "icon-192.png"));
  console.log("✓ public/icon-192.png");

  await sharp(svgBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, "icon-512.png"));
  console.log("✓ public/icon-512.png");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
