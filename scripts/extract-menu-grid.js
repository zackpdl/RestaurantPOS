#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const dir = "book";
const outCsv = "menu_items_222.csv";
const outJson = "menu_items_progress.json";
const absDir = path.resolve(process.cwd(), dir);

const file = process.argv[2];
if (!file) {
  console.error("Please provide a filename.");
  process.exit(1);
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const parseTsv = (tsvText) => {
  const lines = tsvText.split('\n').filter(Boolean);
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

let bestItemsMap = new Map();
if (fs.existsSync(outJson)) {
  const data = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  Object.keys(data).forEach(k => bestItemsMap.set(parseInt(k), data[k]));
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'menu-grid-single-'));

const inputPath = path.join(absDir, file);
const prePath = path.join(tmpDir, `${file}.pre.png`);

console.log(`Processing ${file}...`);
try {
  run('magick', [inputPath, '-resize', '250%', '-colorspace', 'Gray', '-sharpen', '0x1', prePath]);
  const tsvText = run('tesseract', [prePath, 'stdout', '-l', 'eng', '--psm', '3', 'tsv']);
  const words = parseTsv(tsvText);
  
  const idTokens = words.filter(w => w.text.match(/^\d{1,3}[.)]?$/));
  
  for (const token of idTokens) {
    const idStr = token.text.replace(/[.)]/g, '');
    const id = parseInt(idStr);
    if (id <= 0 || id > 300) continue;

    const nextIdOnLine = idTokens.find(other => 
      other !== token && 
      Math.abs(other.top - token.top) < 35 && 
      other.left > token.left
    );

    const lineWords = words.filter(w => 
      Math.abs(w.top - token.top) < 35 && 
      w.left > token.left &&
      (!nextIdOnLine || w.left < nextIdOnLine.left)
    ).sort((a, b) => a.left - b.left);

    if (lineWords.length === 0) continue;

    let nameWords = [];
    let price = "";

    for (const w of lineWords) {
      if (w.text.match(/^\d{2,4}$/) && w.left > token.left + 50) {
        price = w.text;
      } else if (w.text.match(/^[A-Za-z\-/( ),.+&]+$/)) {
        nameWords.push(w.text);
      } else if (nameWords.length > 2) {
        break;
      }
    }

    let name = nameWords.join(' ').replace(/\.{2,}/g, '').trim();
    if (price && name.endsWith(price)) {
      name = name.substring(0, name.length - price.length).trim();
    }

    if (name.length < 3) continue;

    const score = (price ? 1000 : 0) + name.length;
    const existing = bestItemsMap.get(id);
    if (!existing || score > existing.score) {
      bestItemsMap.set(id, { id, name, price, source: file, score });
    }
  }
  
  const progressData = {};
  bestItemsMap.forEach((v, k) => progressData[k] = v);
  fs.writeFileSync(outJson, JSON.stringify(progressData, null, 2));
  
  // Also update CSV
  const finalItems = Array.from(bestItemsMap.values()).sort((a, b) => a.id - b.id);
  const csv = ["ID,Name,Price,Source"];
  finalItems.forEach(i => csv.push(`${i.id},"${i.name.replace(/"/g, '""')}",${i.price},${i.source}`));
  fs.writeFileSync(outCsv, csv.join('\n'));
  
} catch (e) {
  console.error(`Error processing ${file}: ${e.message}`);
} finally {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
}
