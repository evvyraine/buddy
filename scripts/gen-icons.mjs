import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const BRAND = resolve(ROOT, 'src/renderer/src/assets/brand')
const OUT = resolve(ROOT, 'resources')

mkdirSync(OUT, { recursive: true })

const PINK = '#e34c80'
const INK = '#0e0d0c'
const FACE_ASPECT = 1102 / 424

const markSvg = readFileSync(resolve(BRAND, 'logo-mark.svg'), 'utf8')
const colored = (hex) => markSvg.replace(/currentColor/g, hex)

async function faceBuffer(hex, width) {
  return sharp(Buffer.from(colored(hex)), { density: 320 })
    .resize({ width: Math.round(width), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function badge(size) {
  const radius = Math.round(size * 0.225)
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" fill="${PINK}"/></svg>`
  )
  const face = await faceBuffer(INK, size * 0.62)
  return sharp(plate).composite([{ input: face, gravity: 'center' }]).png().toBuffer()
}

async function template(height) {
  return sharp(Buffer.from(colored('#000000')), { density: 320 })
    .resize({ height: Math.round(height) })
    .png()
    .toBuffer()
}

const icon = await badge(1024)
writeFileSync(resolve(OUT, 'icon.png'), icon)

const tray = await badge(32)
writeFileSync(resolve(OUT, 'tray.png'), tray)

writeFileSync(resolve(OUT, 'trayTemplate.png'), await template(18))
writeFileSync(resolve(OUT, 'trayTemplate@2x.png'), await template(36))

// Wide lock-up used in the README and anywhere a full wordmark-free mark helps.
const pillWidth = 720
const pillHeight = Math.round(pillWidth / 2)
const pillPlate = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${pillWidth}" height="${pillHeight}" viewBox="0 0 ${pillWidth} ${pillHeight}">` +
    `<rect width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}" fill="${PINK}"/></svg>`
)
const pillFace = await faceBuffer(INK, pillWidth * 0.66)
writeFileSync(
  resolve(OUT, 'logo.png'),
  await sharp(pillPlate).composite([{ input: pillFace, gravity: 'center' }]).png().toBuffer()
)

console.log('icons written to', OUT, `(face aspect ${FACE_ASPECT.toFixed(2)})`)
