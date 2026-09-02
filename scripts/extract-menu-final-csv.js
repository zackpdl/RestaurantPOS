#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const dir = "book";
const outCsv = "menu_items_222.csv";
const absDir = path.resolve(process.cwd(), dir);

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const images = fs.readdirSync(absDir)
  .filter(f => f.match(/\.(jpe?g|png)$/i))
  .sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
  });

const bestItems = new Map();

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-final-'));

console.log(`Final extraction attempt from ${images.length} images...`);

for (const file of images) {
  const inputPath = path.join(absDir, file);
  const prePath = path.join(tmpDir, `${file}.pre.png`);
  
  try {
    run('magick', [inputPath, '-resize', '250%', '-colorspace', 'Gray', '-level', '15%,85%', '-sharpen', '0x1', prePath]);
    const outputs = [
      run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '3']),
      run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '6'])
    ];
    
    for (const text of outputs) {
      const lines = text.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        
        const match = line.match(/^(\d{1,3})([^A-Za-z0-9]*)\s*([A-Za-z].*)/);
        if (match) {
          const id = parseInt(match[1]);
          if (id <= 0 || id > 300) continue;
          
          let rest = match[3];
          const priceMatch = rest.match(/(\d{2,5})$/);
          const price = priceMatch ? priceMatch[1] : "";
          
          let name = rest;
          if (price) name = name.substring(0, name.lastIndexOf(price)).trim();
          
          name = name.split(/\.{2,}/)[0].trim();
          name = name.replace(/[^\x20-\x7E]+/g, '').trim();
          
          if (name.length > 2) {
            const existing = bestItems.get(id);
            const score = (price ? 1000 : 0) + name.length;
            if (!existing || score > existing.score) {
              bestItems.set(id, { id, name, price, source: file, score });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

const finalItems = Array.from(bestItems.values()).sort((a, b) => a.id - b.id);
const csv = ["ID,Name,Price,Source"];
finalItems.forEach(i => csv.push(`${i.id},"${i.name.replace(/"/g, '""')}",${i.price},${i.source}`));
fs.writeFileSync(outCsv, csv.join('\n'));

console.log(`Extracted ${finalItems.length} unique items to ${outCsv}`);
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
