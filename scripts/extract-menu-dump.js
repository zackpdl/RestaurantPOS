#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const dir = "book";
const outCsv = "menu_items_full_dump.csv";
const absDir = path.resolve(process.cwd(), dir);

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const images = fs.readdirSync(absDir)
  .filter(f => f.match(/\.(jpe?g|png)$/i))
  .sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
  });

const extracted = [];
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-dump-'));

console.log(`Upscaled full dump extraction from ${images.length} images...`);

for (const file of images) {
  const inputPath = path.join(absDir, file);
  const prePath = path.join(tmpDir, `${file}.pre.png`);
  try {
    // Upscale 2x and sharpen
    run('magick', [inputPath, '-resize', '200%', '-colorspace', 'Gray', '-sharpen', '0x1', prePath]);
    const text = run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '3']);
    const lines = text.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      
      const match = cleanLine.match(/^(\d{1,3})([^A-Za-z0-9]*)\s*([A-Za-z].*)/);
      if (match) {
        const id = match[1];
        let name = match[3];
        
        const priceMatch = name.match(/(\d{2,5})$/);
        const price = priceMatch ? priceMatch[1] : "";
        if (price) name = name.substring(0, name.lastIndexOf(price)).trim();
        
        name = name.split(/\.{2,}/)[0].trim();
        name = name.replace(/[^\x20-\x7E]+/g, '').trim();
        
        if (name.length > 2) {
          extracted.push({ id, name, price, source: file });
        }
      }
    }
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

const csv = ["ID,Name,Price,Source"];
extracted.forEach(i => csv.push(`${i.id},"${i.name.replace(/"/g, '""')}",${i.price},${i.source}`));
fs.writeFileSync(outCsv, csv.join('\n'));

console.log(`Extracted ${extracted.length} raw items to ${outCsv}`);
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
