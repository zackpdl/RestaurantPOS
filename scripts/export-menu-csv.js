#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dir = "book";
const outCsv = "menu_items_all.csv";

const ROOT = process.cwd();
const absDir = path.resolve(ROOT, dir);

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const listImages = (p) =>
  fs.readdirSync(p)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort((a, b) => {
      const na = Number(path.parse(a).name);
      const nb = Number(path.parse(b).name);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });

const images = listImages(absDir);
const extracted = [];

console.log(`Extracting from ${images.length} images...`);

for (const file of images) {
  const inputPath = path.join(absDir, file);
  try {
    const text = run('tesseract', [inputPath, 'stdout', '-l', 'eng', '--psm', '3']);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = line.match(/^(\d{1,3})[^\s]*\s*(.*)/);
      if (idMatch) {
        const id = idMatch[1];
        let name = idMatch[2].trim();
        let price = "";

        // Check for price at end of current line
        const endPrice = name.match(/(\d{2,5})$/);
        if (endPrice) {
          price = endPrice[1];
          name = name.substring(0, name.lastIndexOf(price)).trim();
        } else {
          // Look ahead up to 3 lines for a price
          for (let j = 1; j <= 3 && i + j < lines.length; j++) {
            const nextLine = lines[i + j];
            // If next line is another ID, stop
            if (nextLine.match(/^\d{1,3}[^\s]*\s*/)) break;
            
            const nextPrice = nextLine.match(/(\d{2,5})$/);
            if (nextPrice) {
              price = nextPrice[1];
              break;
            }
          }
        }

        // Clean name
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

const csvLines = ["ID,Name,Price,Source"];
extracted.forEach(item => {
  csvLines.push(`${item.id},"${item.name.replace(/"/g, '""')}",${item.price},${item.source}`);
});

fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');
console.log(`Extracted ${extracted.length} items to ${outCsv}`);
