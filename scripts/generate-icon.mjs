import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const svgPath = path.join('build', 'icon.svg');
const outDir = 'build';

await mkdir(outDir, { recursive: true });
const svg = await readFile(svgPath);

// 生成 1024x1024 主图
await sharp(svg).resize(1024, 1024).png().toFile(path.join(outDir, 'icon.png'));

// 常用尺寸
const sizes = [16, 32, 48, 64, 128, 256, 512];
for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

console.log('Icons generated:');
console.log('  build/icon.png (1024x1024)');
for (const s of sizes) console.log(`  build/icon-${s}.png`);
