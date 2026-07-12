import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'apps/web/assets/icon.png')
const res = path.join(root, 'apps/web/android/app/src/main/res')

const launcher = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

const foreground = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
}

async function writeIcon(folder, name, size) {
  const dir = path.join(res, folder)
  fs.mkdirSync(dir, { recursive: true })
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(dir, `${name}.png`))
}

for (const [folder, size] of Object.entries(launcher)) {
  await writeIcon(folder, 'ic_launcher', size)
  await writeIcon(folder, 'ic_launcher_round', size)
}

for (const [folder, size] of Object.entries(foreground)) {
  await writeIcon(folder, 'ic_launcher_foreground', size)
}

console.log('Android launcher icons generated.')
