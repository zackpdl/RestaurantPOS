const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_RESTAURANT = 'The View';
const DEFAULT_CATEGORY = 'drinks';
const DEFAULT_NAME_HEADER = 'Drink Name';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

function normalizeHeader(headerLine) {
  return parseCsvLine(headerLine)
    .slice(0, 3)
    .map((field) => field.trim().toLowerCase())
    .join(',');
}

function readMenuCsv(csvPath, restaurant, category, nameHeader, idPrefix, compactIdSpaces) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;

  const expectedHeader = `id,${nameHeader.toLowerCase()},price`;
  if (!header || normalizeHeader(header) !== expectedHeader) {
    throw new Error(`Unexpected CSV header in ${csvPath}`);
  }

  return rows.map((line, index) => {
    const [rawId, name, priceText] = parseCsvLine(line);
    const id = compactIdSpaces ? rawId.replace(/\s+/g, '') : rawId;
    const price = Number(priceText);

    if (!id || !name || Number.isNaN(price)) {
      throw new Error(`Invalid row ${index + 2}: ${line}`);
    }

    return {
      restaurant,
      id: `${idPrefix || ''}${id}`,
      name,
      price,
      category,
    };
  });
}

async function upsertMenuItems(client, items) {
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await client
      .from('menu_items')
      .upsert(batch, { onConflict: 'restaurant,id' });

    if (error) {
      throw error;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const restaurant = args.restaurant || DEFAULT_RESTAURANT;
  const category = args.category || DEFAULT_CATEGORY;
  const nameHeader = args['name-header'] || DEFAULT_NAME_HEADER;
  const idPrefix = args['id-prefix'] || '';
  const compactIdSpaces = Boolean(args['compact-id-spaces']);
  const csvPath = path.resolve(process.cwd(), args.csv || 'drink_menu.csv');
  const envPath = path.resolve(process.cwd(), '.env');

  loadEnvFile(envPath);

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in .env');
  }

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const items = readMenuCsv(
    csvPath,
    restaurant,
    category,
    nameHeader,
    idPrefix,
    compactIdSpaces
  );
  await upsertMenuItems(supabase, items);

  const { count, error } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant', restaurant)
    .eq('category', category);

  if (error) {
    throw error;
  }

  console.log(
    JSON.stringify(
      {
        imported: items.length,
        restaurant,
        category,
        categoryCount: count,
        idPrefix,
        sampleIds: items.slice(0, 5).map((item) => item.id),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
