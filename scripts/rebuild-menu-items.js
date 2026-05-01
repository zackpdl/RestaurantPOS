const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const RESTAURANTS = ['The View', 'Tom Yum Goong'];

const TOM_YUM_BASE_ITEMS = [
  { id: 'TYD1', name: 'Thai Iced Tea', price: 45, category: 'drinks' },
  { id: 'TYM1', name: 'Tom Yum Goong', price: 120, category: 'main' },
  { id: 'TYM2', name: 'Pad Thai', price: 95, category: 'main' },
  { id: 'TYI1', name: 'Butter Chicken', price: 160, category: 'indian' },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
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

function readCsvItems(csvPath, restaurant, category, nameHeader, idPrefix) {
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  const expected = `ID,${nameHeader},Price`.toLowerCase();

  if (!header || header.trim().toLowerCase() !== expected) {
    throw new Error(`Unexpected CSV header in ${csvPath}`);
  }

  return rows.map((line, index) => {
    const [id, name, priceText] = parseCsvLine(line);
    const price = Number(priceText);
    if (!id || !name || Number.isNaN(price)) {
      throw new Error(`Invalid row ${index + 2} in ${csvPath}`);
    }
    return {
      restaurant,
      id: `${idPrefix}${id}`,
      name,
      price,
      category,
    };
  });
}

function readTheViewSeed(seedPath) {
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  return data.map((item) => ({
    restaurant: item.restaurant,
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
  }));
}

async function upsertBatches(supabase, rows) {
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('menu_items')
      .upsert(batch, { onConflict: 'restaurant,id' });
    if (error) throw error;
  }
}

async function fetchCounts(supabase, restaurant) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('category')
    .eq('restaurant', restaurant);
  if (error) throw error;

  return data.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const theViewBase = readTheViewSeed(path.resolve(process.cwd(), 'supabase/seed/menu_items.json'));
  const theViewDrinks = readCsvItems(
    path.resolve(process.cwd(), 'drink_menu.csv'),
    'The View',
    'drinks',
    'Drink Name',
    'D-'
  );
  const theViewIndian = readCsvItems(
    path.resolve(process.cwd(), 'indian_food_menu.csv'),
    'The View',
    'indian',
    'Item Name',
    'I-'
  );

  const tomYumBase = TOM_YUM_BASE_ITEMS.map((item) => ({
    restaurant: 'Tom Yum Goong',
    ...item,
  }));
  const tomYumDrinks = readCsvItems(
    path.resolve(process.cwd(), 'drink_menu.csv'),
    'Tom Yum Goong',
    'drinks',
    'Drink Name',
    'D-'
  );
  const tomYumIndian = readCsvItems(
    path.resolve(process.cwd(), 'indian_food_menu.csv'),
    'Tom Yum Goong',
    'indian',
    'Item Name',
    'I-'
  );

  const allRows = [
    ...theViewBase,
    ...theViewDrinks,
    ...theViewIndian,
    ...tomYumBase,
    ...tomYumDrinks,
    ...tomYumIndian,
  ];

  const { error: deleteError } = await supabase
    .from('menu_items')
    .delete()
    .in('restaurant', RESTAURANTS);
  if (deleteError) throw deleteError;

  await upsertBatches(supabase, allRows);

  const summary = {};
  for (const restaurant of RESTAURANTS) {
    summary[restaurant] = await fetchCounts(supabase, restaurant);
  }

  console.log(
    JSON.stringify(
      {
        rebuilt: allRows.length,
        summary,
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
