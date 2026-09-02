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
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-greedy-'));

console.log(`Greedy extraction (broad) from ${images.length} images...`);

for (const file of images) {
  const inputPath = path.join(absDir, file);
  const prePath = path.join(tmpDir, `${file}.pre.png`);
  
  try {
    // High-quality preprocessing
    run('magick', [inputPath, '-resize', '300%', '-colorspace', 'Gray', '-level', '10%,90%', '-sharpen', '0x1', prePath]);
    
    // PSM 3 (Auto) for multi-line layout
    const text = run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '3']);
    const lines = text.split('\n');
    
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      
      // Greedily find ID anywhere in the start of the line (first 15 chars)
      const startOfLine = line.substring(0, 15);
      const idMatch = startOfLine.match(/(\d{1,3})/);
      
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (id <= 0 || id > 300) continue;
        
        // Everything after the ID is potential name/price
        let rest = line.substring(line.indexOf(idMatch[1]) + idMatch[1].length).trim();
        
        // Find prices (2-4 digits)
        const prices = rest.match(/\b(\d{2,4})\b/g);
        let price = "";
        if (prices) {
          // Take the one that is at the end or separated by dots
          price = prices[prices.length - 1];
        }
        
        // Clean name
        let name = rest.replace(/^[^A-Za-z]+/, '');
        if (price) {
          const priceIdx = name.lastIndexOf(price);
          if (priceIdx !== -1) name = name.substring(0, priceIdx).trim();
        }
        
        // Strip leader dots, foreign text, and noise
        name = name.split(/\.{2,}/)[0].trim();
        name = name.split(/\s{3,}/)[0].trim();
        name = name.replace(/[^\x20-\x7E]+/g, '').trim();
        
        if (name.length > 2) {
          const score = (price ? 1000 : 0) + name.length;
          const existing = bestItems.get(id);
          if (!existing || score > existing.score) {
            bestItems.set(id, { id, name, price, source: file, score });
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
