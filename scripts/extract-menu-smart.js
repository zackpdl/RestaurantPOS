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

const parseTsv = (tsvText) => {
  const lines = tsvText.split(/\n/).filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 12) continue;
    rows.push({
      level: parseInt(cols[0]),
      left: parseInt(cols[6]),
      top: parseInt(cols[7]),
      width: parseInt(cols[8]),
      height: parseInt(cols[9]),
      conf: parseInt(cols[10]),
      text: (cols[11] || '').trim(),
    });
  }
  return rows.filter(r => r.level === 5 && r.text);
};

const images = fs.readdirSync(absDir)
  .filter(f => f.match(/\.(jpe?g|png)$/i))
  .sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
  });

// Map of ID -> best candidate
const bestCandidates = new Map();

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-222-'));

console.log(`Targeted extraction from ${images.length} images...`);

for (const file of images) {
  const inputPath = path.join(absDir, file);
  const prePath = path.join(tmpDir, `${file}.pre.png`);
  
  try {
    run('magick', [inputPath, '-colorspace', 'Gray', '-level', '20%,80%', '-sharpen', '0x1', prePath]);
    const tsvText = run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '3', 'tsv']);
    const words = parseTsv(tsvText);
    
    // Find tokens that look like IDs (start of a line)
    const idTokens = words.filter(w => w.text.match(/^\d{1,3}[.)]?$/) && w.left < 450);
    
    for (const token of idTokens) {
      const id = parseInt(token.text.replace(/[.)]/g, ''));
      if (id <= 0 || id > 300) continue;

      const lineWords = words.filter(w => Math.abs(w.top - token.top) < 30 && w.left > token.left)
                           .sort((a, b) => a.left - b.left);
      
      let nameWords = [];
      for (const w of lineWords) {
        if (w.left > 780) break;
        // Basic English check
        if (w.text.match(/^[A-Za-z0-9\-/( ),.+&]+$/)) {
          nameWords.push(w.text);
        } else if (nameWords.length > 2) {
          break;
        }
      }
      
      let name = nameWords.join(' ').replace(/\.{2,}/g, '').trim();
      if (name.length < 4) continue;
      
      // Clean up common OCR noise
      name = name.replace(/^[A-Za-z\s]+\d{1,3}\.?\s*/, ''); // Remove things like "Se 191." if they stayed in
      if (name.length < 3) continue;

      let price = "";
      const priceCand = words.filter(w => Math.abs(w.top - token.top) < 60 && w.left > 600 && w.text.match(/^\d{2,5}$/));
      if (priceCand.length > 0) {
        priceCand.sort((a, b) => b.left - a.left);
        price = priceCand[0].text;
      }

      // Quality score: longer name + has price is better
      const score = name.length + (price ? 10 : 0);
      
      if (!bestCandidates.has(id) || bestCandidates.get(id).score < score) {
        bestCandidates.set(id, { id, name, price, source: file, score });
      }
    }
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
}

const finalItems = Array.from(bestCandidates.values()).sort((a, b) => a.id - b.id);

const csv = ["ID,Name,Price,Source"];
finalItems.forEach(i => csv.push(`${i.id},"${i.name.replace(/"/g, '""')}",${i.price},${i.source}`));
fs.writeFileSync(outCsv, csv.join('\n'));

console.log(`Extracted ${finalItems.length} unique items to ${outCsv}`);
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
