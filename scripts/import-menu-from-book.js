#!/usr/bin/env node
/* eslint-disable no-console */

// Extract menu items from `book/*.jpg` by OCRing per-item patches (much more reliable than whole-page OCR).
//
// Usage:
//   node scripts/import-menu-from-book.js --restaurant "Tom Yum Goong" --dir book
//   node scripts/import-menu-from-book.js --restaurant "Tom Yum Goong" --dir book --limit 2 --dry-run
//
// Output:
//   - `supabase/seed/menu_items.json` (raw extracted rows)
//   - `supabase/seed/menu_items.sql`  (UPSERT into `menu_items`)

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const argv = process.argv.slice(2);
const argValue = (name, fallback) => {
  const idx = argv.indexOf(name);
  if (idx === -1) return fallback;
  const v = argv[idx + 1];
  if (!v || v.startsWith('--')) return fallback;
  return v;
};
const hasFlag = (name) => argv.includes(name);

const restaurant = argValue('--restaurant', 'Tom Yum Goong');
const dir = argValue('--dir', 'book');
const outSql = argValue('--out-sql', path.join('supabase', 'seed', 'menu_items.sql'));
const outJson = argValue('--out-json', path.join('supabase', 'seed', 'menu_items.json'));
const limit = Number(argValue('--limit', '0')) || 0;
const dryRun = hasFlag('--dry-run');

const ROOT = process.cwd();
const absDir = path.resolve(ROOT, dir);

if (!fs.existsSync(absDir)) {
  console.error(`Directory not found: ${absDir}`);
  process.exit(1);
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const normalizeSpaces = (s) => s.replace(/\s+/g, ' ').trim();
const sqlEscape = (s) =>
  String(s)
    .replace(/\\/g, '') // avoid accidental SQL string breaks like \'
    .replace(/'/g, "''");

const listImages = (p) =>
  fs
    .readdirSync(p)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort((a, b) => {
      const na = Number(path.parse(a).name);
      const nb = Number(path.parse(b).name);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });

const identifySize = (imagePath) => {
  const out = run('magick', ['identify', '-format', '%w %h', imagePath]);
  const [w, h] = out.trim().split(/\s+/).map((v) => Number(v));
  if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error('identify failed');
  return { w, h };
};

const preprocessDetect = (inputPath, outputPath) => {
  // Crop away the photo strip, upscale, enhance contrast for detecting item numbers / lines.
  run('magick', [
    inputPath,
    '-gravity',
    'East',
    '-crop',
    '72%x100%+0+0',
    '+repage',
    '-resize',
    '300%',
    '-colorspace',
    'Gray',
    '-auto-level',
    '-sharpen',
    '0x1',
    outputPath,
  ]);
};

const ocrTsv = (imagePath, { psm = 6, whitelist } = {}) => {
  const args = [imagePath, 'stdout', '-l', 'eng', '--psm', String(psm)];
  if (whitelist) args.push('-c', `tessedit_char_whitelist=${whitelist}`);
  args.push('tsv');
  return run('tesseract', args);
};

const parseTsvWords = (tsvText) => {
  const lines = tsvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { page: null, words: [] };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 12) continue;
    rows.push({
      level: Number(cols[0]),
      left: Number(cols[6]),
      top: Number(cols[7]),
      width: Number(cols[8]),
      height: Number(cols[9]),
      conf: Number(cols[10]),
      text: cols[11] ?? '',
    });
  }

  const page = rows.find((r) => r.level === 1) ?? null;
  const words = rows
    .filter((r) => r.level === 5 && r.text)
    .map((r) => ({ ...r, text: normalizeSpaces(r.text) }))
    .filter((r) => r.text);

  return { page, words };
};

const extractItemNumberTokens = (detectWords, detectWidth) => {
  // Item numbers sit on the left of the text area.
  return detectWords
    .filter((w) => w.left < detectWidth * 0.18)
    .map((w) => {
      const m = w.text.match(/^(\d{1,3})[.)]?$/);
      if (!m) return null;
      return {
        id: m[1],
        top: w.top,
        left: w.left,
        height: w.height,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top);
};

const ocrOneLine = (inputPath, { whitelist, psm = 7 } = {}) => {
  const out = run('tesseract', [
    inputPath,
    'stdout',
    '-l',
    'eng',
    '--psm',
    String(psm),
    ...(whitelist ? ['-c', `tessedit_char_whitelist=${whitelist}`] : []),
  ]);
  return normalizeSpaces(out);
};

const parsePrice = (s) => {
  const m = s.match(/\d{2,5}/g);
  if (!m || m.length === 0) return null;
  // prefer last token
  const v = Number(m[m.length - 1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
};

const cleanName = (s) => {
  // Keep printable ASCII and collapse.
  let v = s.replace(/[^\x20-\x7E]+/g, ' ');
  v = v.replace(/^[^A-Za-z]+/, '');
  // Many lines have dotted leaders between name and price/other languages.
  if (v.includes('...')) {
    v = v.split(/\.{3,}/)[0] ?? v;
  }
  v = v.replace(/[.]{2,}/g, ' ');
  v = normalizeSpaces(v);
  // Remove any trailing price digits that OCR accidentally includes.
  v = v.replace(/\s+\d{2,5}\s*$/, '');
  v = normalizeSpaces(v);
  if (v.length < 3) return null;
  if (v.toLowerCase() === 'a') return null;
  return v || null;
};

const cropPatch = (inputPath, { x, y, w, h, threshold }, outputPath) => {
  run('magick', [
    inputPath,
    '-crop',
    `${Math.max(1, Math.round(w))}x${Math.max(1, Math.round(h))}+${Math.max(0, Math.round(x))}+${Math.max(0, Math.round(y))}`,
    '+repage',
    '-resize',
    '350%',
    '-colorspace',
    'Gray',
    '-auto-level',
    '-sharpen',
    '0x1',
    ...(threshold ? ['-threshold', String(threshold)] : []),
    outputPath,
  ]);
};

const images = listImages(absDir);
const take = limit > 0 ? images.slice(0, limit) : images;
if (take.length === 0) {
  console.error(`No images found in: ${absDir}`);
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-menu-patches-'));
const extracted = [];
const seen = new Set();

console.log(`Patch OCR ${take.length} image(s) from ${dir} -> ${restaurant}`);

for (const file of take) {
  const inputPath = path.join(absDir, file);
  const { w: pageW, h: pageH } = identifySize(inputPath);

  // Text area is the right 72% of the page; we detect items there then map Y back to original page.
  const textX = Math.round(pageW * 0.28);
  const textW = pageW - textX;

  const detectPath = path.join(tmpDir, `${path.parse(file).name}.detect.png`);
  preprocessDetect(inputPath, detectPath);

  const detectTsv = parseTsvWords(ocrTsv(detectPath, { psm: 6 }));
  const detectPageW = detectTsv.page?.width ?? 0;
  if (!detectPageW) continue;
  const scale = detectPageW / textW;

  const itemTokens = extractItemNumberTokens(detectTsv.words, detectPageW);
  for (const token of itemTokens) {
    const key = `${restaurant}:${token.id}`;
    if (seen.has(key)) continue;

    const yInText = token.top / scale;
    const y = Math.max(0, Math.min(pageH - 1, yInText));

    // Price patch: rightmost ~22% of page, around this row.
    const priceW = Math.round(pageW * 0.22);
    const priceX = pageW - priceW;
    const patchH = Math.round(pageH * 0.06); // ~1 row band (prices)
    const priceY = Math.max(0, y - Math.round(patchH * 0.2));

    // Name patch: start at text area, end before price column.
    const nameX = textX;
    // Only take the left part of the text area (English name is on the left;
    // the right side contains Thai/other languages and leader dots).
    const nameW = Math.max(50, Math.round(textW * 0.6));
    const nameH = Math.round(pageH * 0.08); // more vertical space improves name OCR
    const nameY = Math.max(0, y - Math.round(nameH * 0.25));

    const pricePatch = path.join(tmpDir, `${path.parse(file).name}.${token.id}.price.png`);
    const namePatch = path.join(tmpDir, `${path.parse(file).name}.${token.id}.name.png`);

    cropPatch(
      inputPath,
      { x: priceX, y: priceY, w: priceW, h: patchH, threshold: '65%' },
      pricePatch
    );
    cropPatch(inputPath, { x: nameX, y: nameY, w: nameW, h: nameH }, namePatch);

    const priceRaw = ocrOneLine(pricePatch, { whitelist: '0123456789', psm: 11 });
    const price = parsePrice(priceRaw);

    // Name OCR: use PSM 6 and keep only the first line.
    let nameRaw = run('tesseract', [namePatch, 'stdout', '-l', 'eng', '--psm', '6']);
    nameRaw = normalizeSpaces(nameRaw.split(/\r?\n/)[0] ?? '');
    nameRaw = nameRaw.replace(/^[^A-Za-z0-9]*\d{1,3}\s*[.)]?\s*/, '');
    const name = cleanName(nameRaw);

    if (!price || !name) continue;
    seen.add(key);

    let category = 'main';
    const lowerName = name.toLowerCase();
    if (
      lowerName.includes('juice') ||
      lowerName.includes('tea') ||
      lowerName.includes('coffee') ||
      lowerName.includes('water') ||
      lowerName.includes('soda') ||
      lowerName.includes('beer') ||
      lowerName.includes('wine') ||
      lowerName.includes('shake') ||
      lowerName.includes('smoothie')
    ) {
      category = 'drinks';
    }

    extracted.push({
      restaurant,
      id: token.id,
      name,
      price,
      category,
      source: file,
    });
  }
}

extracted.sort((a, b) => Number(a.id) - Number(b.id));
console.log(`Extracted ${extracted.length} item(s).`);

ensureDir(path.dirname(path.resolve(ROOT, outSql)));

const sqlLines = [];
sqlLines.push('-- Generated by scripts/import-menu-from-book.js');
sqlLines.push(`-- Restaurant: ${restaurant}`);
sqlLines.push('');
sqlLines.push('insert into menu_items (restaurant, id, name, price, category)');
sqlLines.push('values');
extracted.forEach((item, idx) => {
  sqlLines.push(
    `  ('${sqlEscape(item.restaurant)}', '${sqlEscape(item.id)}', '${sqlEscape(item.name)}', ${item.price}, '${sqlEscape(item.category)}')` +
      (idx === extracted.length - 1 ? '' : ',')
  );
});
sqlLines.push('on conflict (restaurant, id) do update set');
sqlLines.push('  name = excluded.name,');
sqlLines.push('  price = excluded.price,');
sqlLines.push('  category = excluded.category;');
sqlLines.push('');

if (dryRun) {
  console.log(sqlLines.slice(0, 60).join('\n'));
  console.log('---');
  console.log(`Dry run: not writing ${outSql} / ${outJson}`);
  process.exit(0);
}

fs.writeFileSync(path.resolve(ROOT, outSql), sqlLines.join('\n'), 'utf8');
fs.writeFileSync(path.resolve(ROOT, outJson), JSON.stringify(extracted, null, 2), 'utf8');

console.log(`Wrote ${outSql}`);
console.log(`Wrote ${outJson}`);
