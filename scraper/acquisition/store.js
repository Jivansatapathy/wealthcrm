// Tiny JSON-file persistence behind a get/save interface so Postgres can replace it later.
// Writes are atomic (temp file + rename). Everything under the data dir may contain personal data: keep it git-ignored.
import fs from 'node:fs';
import path from 'node:path';

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const cache = new Map();
  const file = (name) => path.join(dir, `${name}.json`);

  /** Returns the live (mutable) collection. Call save(name) after mutating it. */
  function get(name, fallback) {
    if (!cache.has(name)) {
      let v;
      try { v = JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { v = undefined; }
      cache.set(name, v === undefined ? structuredClone(fallback) : v);
    }
    return cache.get(name);
  }

  function save(name) {
    if (!cache.has(name)) return; // never loaded, so nothing has changed
    const tmp = `${file(name)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache.get(name)));
    fs.renameSync(tmp, file(name));
  }

  function set(name, value) {
    cache.set(name, value);
    save(name);
  }

  return { dir, get, save, set };
}
