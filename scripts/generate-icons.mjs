/**
 * Gera todos os ícones PWA e Android Adaptive Icons a partir de resources/icon-master.png
 * utilizando sharp (Apache-2.0).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const masterPath = path.join(root, 'resources', 'icon-master.png');

if (!fs.existsSync(masterPath)) {
  console.error('Arquivo resources/icon-master.png não encontrado.');
  process.exit(1);
}

const androidDensities = [
  { folder: 'mipmap-mdpi', launcher: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
];

async function makeBoldCrop(size) {
  const meta = await sharp(masterPath).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;
  const cropSide = Math.round(Math.min(w, h) * 0.84);
  const left = Math.round((w - cropSide) / 2);
  const top = Math.round((h - cropSide) / 2);
  return sharp(masterPath)
    .extract({ left, top, width: cropSide, height: cropSide })
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 96 });
}

async function run() {
  // 1. Ícones PWA e Apple Touch Icon em public/
  await (await makeBoldCrop(512)).toFile(path.join(root, 'public', 'icon-512.png'));
  await (await makeBoldCrop(192)).toFile(path.join(root, 'public', 'icon-192.png'));
  await (await makeBoldCrop(180)).toFile(path.join(root, 'public', 'apple-touch-icon.png'));

  // 2. Native Android mipmap icons
  const outRoot = path.join(root, 'resources', 'native-icons', 'android');
  for (const d of androidDensities) {
    const dir = path.join(outRoot, d.folder);
    fs.mkdirSync(dir, { recursive: true });

    await (await makeBoldCrop(d.launcher)).toFile(path.join(dir, 'ic_launcher.png'));

    const circleMask = Buffer.from(
      `<svg width="${d.launcher}" height="${d.launcher}"><circle cx="${d.launcher / 2}" cy="${d.launcher / 2}" r="${d.launcher / 2}" fill="#fff"/></svg>`,
    );
    await (await makeBoldCrop(d.launcher))
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png({ quality: 96 })
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Foreground mantém o quadro completo (emblema central já respeita safe-zone de 66%)
    await sharp(masterPath)
      .resize(d.foreground, d.foreground, { fit: 'cover' })
      .png({ quality: 96 })
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('✓ Todos os ícones PWA e Android Adaptive Icons gerados com sucesso.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
