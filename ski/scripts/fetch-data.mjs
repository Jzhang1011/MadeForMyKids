#!/usr/bin/env node
// Backup snapshot (GitHub Action): writes ski/data/latest.json, intel.json, cameras.json — the
// fallback the page uses when the ski-data Worker (/ski/api/*) is unreachable.
// Never invents data and never overwrites good data with nothing: each source is merged with the
// previous file (last good value + its own fetchedAt kept, failure recorded). Exits 1 if any source
// failed, so the workflow run goes red and GitHub emails the repo owner.
//   node ski/scripts/fetch-data.mjs              all sources
//   node ski/scripts/fetch-data.mjs --intel-only resort intel only
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, runSources, fromFiles, toLatest, toIntel, toCameras } from './collect.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = async f => { try { return JSON.parse(await readFile(join(dataDir, f), 'utf8')); } catch { return null; } };
const cfg = await read('resorts.json');
const prev = fromFiles(await read('latest.json'), await read('intel.json'), await read('cameras.json'));

const names = process.argv.includes('--intel-only') ? ['intel'] : SOURCES;
const { rec, failures } = await runSources(names, cfg, prev);
const all = { ...prev, ...rec };

if (rec.intel) await writeFile(join(dataDir, 'intel.json'), JSON.stringify(toIntel(all.intel, 'github-action')));
if (names.length > 1) {
  await writeFile(join(dataDir, 'latest.json'), JSON.stringify(toLatest(all, 'github-action')));
  if (rec.camsall?.status === 'ok') await writeFile(join(dataDir, 'cameras.json'), JSON.stringify(toCameras(all.camsall, cfg, 'github-action')));
}
for (const [k, v] of Object.entries(rec)) console.log(`${k.padEnd(8)} ${v.status.padEnd(6)} fetchedAt=${v.fetchedAt}${v.error ? ` error=${v.error}` : ''}`);
if (failures.length) { console.error(`FAILED sources:\n  ${failures.join('\n  ')}`); process.exitCode = 1; }
