/**
 * One-time data export: Firestore -> Supabase. Idempotent (upserts by PK), so
 * safe to re-run to refresh the test DB and again at cutover.
 *
 * Reads Firestore with the public web config (same as the live app) and writes
 * to Supabase with the SERVICE ROLE key (bypasses RLS — never ship this key).
 *
 * Run:
 *   1. cp .env.example .env.local  and fill in VITE_SUPABASE_URL +
 *      SUPABASE_SERVICE_ROLE_KEY  (Supabase dashboard -> Settings -> API)
 *   2. Apply supabase/schema.sql in the Supabase SQL editor
 *   3. npx tsx scripts/migrate-to-supabase.ts
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { CardModel } from '../src/api/fetch/card/cardModel';
import { AttributeModel } from '../src/api/fetch/attributes/attributesModel';
import { cardToRow } from '../src/api/fetch/card/cardRow';

// --- minimal .env.local loader (no dotenv dependency) -----------------------
function loadEnv(file = '.env.local') {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* fall back to real env vars */
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

// Same public Firebase config the live app uses (read-only source of truth).
const firebase = initializeApp({
  apiKey: 'AIzaSyAvolx_iWjJjYVgi4cf9q1fgOs-_lQiE8g',
  authDomain: 'polardex-prod.firebaseapp.com',
  projectId: 'polardex-prod',
  storageBucket: 'polardex-prod.firebasestorage.app',
  messagingSenderId: '475965315646',
  appId: '1:475965315646:web:60a279d7e747c2575d4f6f',
});
const firestore = getFirestore(firebase);
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function chunkedUpsert(table: string, rows: Record<string, unknown>[]) {
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    const chunk = rows.slice(i, i + SIZE);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    console.info(`  ${table}: ${Math.min(i + SIZE, rows.length)}/${rows.length}`);
  }
}

async function main() {
  // 1. cards collection — pokemonData is denormalized onto each card row.
  const cardsSnap = await getDocs(collection(firestore, 'cards'));
  const cards: CardModel[] = [];
  cardsSnap.forEach((d) => {
    if (d.id === 'data') return; // skip the legacy single-doc if still present
    const c = d.data() as CardModel;
    // Normalize the legacy status value to satisfy the check constraint.
    if ((c.status as unknown) === 'wanted') c.status = 'wishlist';
    cards.push(c);
  });

  // 2. attributes/data map (UI dropdown options) ------------------------------
  const attrSnap = await getDoc(doc(firestore, 'attributes', 'data'));
  const attrMap = (attrSnap.data() ?? {}) as Record<string, AttributeModel>;
  const attrRows = Object.values(attrMap).map((a) => ({
    id: a.id,
    type: a.type ?? null,
    name: a.name ?? null,
    meta: a.meta ?? null,
  }));

  // Migration copies data faithfully — it does NOT clean dirty values
  // (empty-string rarities, legacy codes). Clean those in-app after cutover.
  console.info(`Migrating ${attrRows.length} attributes, ${cards.length} cards`);
  await chunkedUpsert('attributes', attrRows);
  await chunkedUpsert(
    'cards',
    cards.map((c) => ({
      ...cardToRow(c),
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    })),
  );

  console.info('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
