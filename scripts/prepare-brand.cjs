// Deterministic crops/resizes of the supplied logo. No redrawing or replacement artwork.
const fs = require('node:fs');
const path = require('node:path');
const dir = fs.readdirSync('node_modules/.pnpm').find(name => name.startsWith('sharp@'));
const sharp = require(path.resolve('node_modules/.pnpm', dir, 'node_modules/sharp'));
const source = process.argv[2] || 'C:/Users/Admin/Downloads/Logo CraftTrust Gốm Việt Hiện Đại.png';
const out = 'apps/web/public/brand';
async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(source, `${out}/source.png`);
  await sharp(source).extract({ left: 230, top: 170, width: 990, height: 750 }).resize(792).png().toFile(`${out}/full.png`);
  const mark = await sharp(source).extract({ left: 520, top: 170, width: 480, height: 455 }).resize(112, 112, { fit: 'contain', background: '#fff' }).png().toBuffer();
  const words = await sharp(source).extract({ left: 235, top: 648, width: 980, height: 270 }).resize(320, 100, { fit: 'contain', background: '#fff' }).png().toBuffer();
  await sharp({ create: { width: 448, height: 128, channels: 4, background: '#fff' } }).composite([{ input: mark, left: 4, top: 8 }, { input: words, left: 120, top: 14 }]).png().toFile(`${out}/horizontal.png`);
  for (const size of [32, 180, 192, 512]) {
    await sharp(source).extract({ left: 510, top: 160, width: 500, height: 470 }).resize(size, size, { fit: 'contain', background: '#fff' }).png().toFile(`${out}/icon-${size}.png`);
  }
}
main().catch(error => { console.error(error); process.exit(1); });
