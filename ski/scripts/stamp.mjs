// Cache-busting: stamp ?v=<content hash> onto the CSS/JS URLs in index.html and the ES-module imports,
// so iOS Safari (which caches aggressively) never mixes an old app.js with a new index.html or vice versa.
// Run before committing front-end changes:  node ski/scripts/stamp.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [...readdirSync(join(root, 'js')).map(f => `js/${f}`), 'css/ski.css'];
const strip = s => s.replace(/\?v=[A-Za-z0-9]+/g, '');
const h = createHash('sha1');
for (const f of files) h.update(strip(readFileSync(join(root, f), 'utf8')));
const v = h.digest('hex').slice(0, 10);
const stamp = (f, re) => { const p = join(root, f); const s = readFileSync(p, 'utf8'); const o = s.replace(re, (m, a, b) => `${a}?v=${v}${b}`); if (o !== s) writeFileSync(p, o); };
stamp('index.html', /((?:href|src)="(?:css\/ski\.css|js\/app\.js))(?:\?v=[A-Za-z0-9]+)?(")/g);
for (const f of files.filter(f => f.endsWith('.js'))) stamp(f, /(from '\.\/[a-z0-9]+\.js)(?:\?v=[A-Za-z0-9]+)?(')/g);
console.log('stamped', v);
