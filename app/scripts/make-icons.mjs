// Renders PNG icons from public/favicon.svg
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url));
const out = (f) => new URL('../public/' + f, import.meta.url).pathname;
await sharp(svg, { density: 300 }).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile(out('icon-512.png'));
// maskable: full-bleed background, artwork scaled into safe zone (80%)
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#f5efe3' } })
  .composite([{ input: inner, left: 56, top: 56 }]).png().toFile(out('icon-maskable-512.png'));
const apple = await sharp(svg, { density: 300 }).resize(160, 160).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: '#f5efe3' } })
  .composite([{ input: apple, left: 10, top: 10 }]).png().toFile(out('apple-touch-icon.png'));
console.log('icons ok');
