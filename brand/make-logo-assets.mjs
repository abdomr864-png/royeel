// Cuts the 2026 logo (brand/source/royeel-logo-2026.png) into the files the
// site uses. Run from the project root: node brand/make-logo-assets.mjs
//
// - logo-*.png      true colours, background removed: for bordeaux surfaces
// - mark-*.png      the word and the flourish as one-colour masks (white +
//                   alpha): the site paints them in any colour with CSS mask-image
// - icon / og / e-mail images on the bordeaux background
import sharp from 'sharp'

const SOURCE = 'brand/source/royeel-logo-2026.png'
const OUT = 'public/brand'
const BORDEAUX = { r: 0x5b, g: 0x0b, b: 0x18 }
// Background of the source image, measured in its corners.
const BG = [0x5a, 0x0c, 0x18]

// Parts of the 1197 x 1315 source.
const PARTS = {
  full: { left: 240, top: 20, width: 720, height: 1200 },
  cameo: { left: 240, top: 20, width: 720, height: 862 },
  word: { left: 250, top: 880, width: 670, height: 251 },
  flourish: { left: 300, top: 1131, width: 600, height: 87 },
}
// The tip of the frame's lower ornament reaches into the word's box.
const FRAME_TIP = { left: 560, top: 880, right: 660, bottom: 945 }

const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width

// Colour-to-alpha against the background: exact again when laid on bordeaux.
// The image darkens towards its edges, so only clearly dark parts (the
// swan's beak and eye) count as darker than the background.
function colourPixel(i) {
  let light = 0
  let dark = 0
  for (let c = 0; c < 3; c++) {
    const p = data[i + c]
    const b = BG[c]
    if (p > b) light = Math.max(light, (p - b) / (255 - b))
    else dark = Math.max(dark, (b - p) / b)
  }
  const a = Math.max(light < 0.1 ? 0 : light, dark < 0.4 ? 0 : dark)
  if (a === 0) return [0, 0, 0, 0]
  const rgb = [0, 1, 2].map((c) => Math.round(Math.min(255, Math.max(0, (data[i + c] - BG[c]) / a + BG[c]))))
  return [...rgb, Math.round(a * 255)]
}

// Light parts become opaque: the frame, the swan and the lettering.
function maskPixel(i) {
  const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  const a = Math.min(1, Math.max(0, (l - 45) / (200 - 45)))
  return [255, 255, 255, Math.round(a * 255)]
}

async function cut(part, pixel, skip) {
  const { left, top, width, height } = PARTS[part]
  const out = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = left + x
      const sy = top + y
      if (skip?.(sx, sy)) continue
      out.set(pixel((sy * W + sx) * 3), (y * width + x) * 4)
    }
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer()
}

const inTip = (x, y) => x >= FRAME_TIP.left && x <= FRAME_TIP.right && y >= FRAME_TIP.top && y <= FRAME_TIP.bottom

const files = {
  'logo-full.png': await cut('full', colourPixel),
  'logo-cameo.png': await cut('cameo', colourPixel),
  'mark-word.png': await cut('word', maskPixel, inTip),
  'mark-flourish.png': await cut('flourish', maskPixel),
}

for (const [name, buffer] of Object.entries(files)) {
  await sharp(buffer).toFile(`${OUT}/${name}`)
}

// Square icons: the cameo on bordeaux.
async function onBordeaux(buffer, width, height, fill) {
  const logo = await sharp(buffer)
    .resize({ width: Math.round(width * fill), height: Math.round(height * fill), fit: 'inside' })
    .toBuffer()
  return sharp({ create: { width, height, channels: 4, background: { ...BORDEAUX, alpha: 1 } } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
}

await (await onBordeaux(files['logo-cameo.png'], 512, 512, 0.84)).toFile(`${OUT}/icon.png`)
await (await onBordeaux(files['logo-cameo.png'], 180, 180, 0.8)).toFile(`${OUT}/apple-icon.png`)
await (await onBordeaux(files['logo-cameo.png'], 48, 48, 0.92)).toFile(`${OUT}/favicon-48.png`)
// Link preview on Instagram, WhatsApp and Facebook.
await (await onBordeaux(files['logo-full.png'], 1200, 630, 0.86)).toFile(`${OUT}/og.png`)
// E-mail header (shown at 140 px wide, drawn at twice that).
await (await onBordeaux(files['logo-full.png'], 280, 466, 1)).toFile(`${OUT}/logo-email.png`)

console.log('Logo files written to', OUT)
