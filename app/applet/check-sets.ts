import * as fs from 'fs';
async function run() {
  const res = await fetch('https://api.scryfall.com/sets');
  const data = await res.json();
  const sets = data.data.filter((s: any) => s.name.match(/hobbit|star trek|teenage mutant|marvel/i) || s.released_at.startsWith('2026') || s.released_at.startsWith('2025'));
  console.log(JSON.stringify(sets.map((s: any) => ({code: s.code, name: s.name, released_at: s.released_at, set_type: s.set_type})), null, 2));
}
run();
