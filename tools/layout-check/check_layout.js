// Layout stress test for any page on the site.
//
// For every page in pages.json, at each width, in each state (default view, every
// slider at its minimum, every slider at its maximum, each extra URL hash, and a click
// on each button matched by clickEach), it fails when:
//   - text inside a chart (SVG) overlaps other text, or crosses the edge of a filled
//     shape such as a bar (text wholly inside a shape, like a value in a bar, passes),
//   - chart text runs past the edge of its chart,
//   - the page scrolls sideways,
//   - the browser logs a console error or a script error.
//
// Pages come from pages.json: listed under "pages", and, with "discover", every HTML
// page found under --root. Discovery checks all top-level pages and, for any group of
// generated pages larger than groupLimit (storm pages, blog posts), a sample: the
// first, the last and the largest file, plus one that rotates daily, so pages added
// later get checked and every generated page gets a turn over time.
//
// Usage: serve the site's root directory, then
//   node check_layout.js [--root DIR] [--base http://127.0.0.1:8765] [--shots DIR]
// CHROMIUM_PATH points Playwright at a specific Chromium build. The same script runs
// in each THB site repository; thb-empire holds the reference copy.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const BASE = opt('--base', 'http://127.0.0.1:8765');
const SHOTS = opt('--shots', null);
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'), 'utf8'));
const WIDTHS = CONFIG.widths || [1360, 768, 390];
const ROOT = opt('--root', '.');

// Every page to check: discovered pages, with entries listed in pages.json taking
// precedence (their hashes and clickEach), and listed pages added if not found.
function pageList() {
  const listed = CONFIG.pages || [];
  const d = CONFIG.discover;
  if (!d) return listed;
  const skip = new Set(['node_modules', ...(d.exclude || [])]);
  const found = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || skip.has(e.name) || skip.has(rel + e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, rel + e.name + '/');
      else if (e.name === 'index.html') found.push({ path: '/' + rel, size: fs.statSync(full).size });
      else if (e.name.endsWith('.html') && e.name !== '404.html') found.push({ path: '/' + rel + e.name, size: fs.statSync(full).size });
    }
  })(path.resolve(ROOT), '');
  // group generated pages by their first path segment and depth; top-level pages stay whole
  const groups = {};
  for (const f of found) {
    const segs = f.path.split('/').filter(Boolean);
    const key = segs.length <= 1 ? 'top' : segs[0] + '/' + segs.length;
    (groups[key] = groups[key] || []).push(f);
  }
  const limit = d.groupLimit || 30, chosen = new Set();
  for (const [key, g] of Object.entries(groups)) {
    g.sort((a, b) => a.path.localeCompare(b.path));
    if (key === 'top' || g.length <= limit) { g.forEach(f => chosen.add(f.path)); continue; }
    const largest = g.reduce((a, b) => (b.size > a.size ? b : a));
    // plus one page that changes each day, so over time every generated page gets a turn
    const rotating = g[Math.floor(Date.now() / 86400000) % g.length];
    [g[0], g[g.length - 1], largest, rotating].forEach(f => chosen.add(f.path));
  }
  const byPath = Object.fromEntries(listed.map(p => [p.path, p]));
  listed.forEach(p => chosen.add(p.path));
  return [...chosen].sort().map(p => byPath[p] || Object.assign({ path: p }, CONFIG.defaults || {}));
}
const PAGES = pageList();

// Collisions among chart text, filled shapes and chart edges, measured in the page.
function collisions() {
  const out = [];
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  // a label drawn wholly inside a shape (a value inside a bar, text in a table cell) is deliberate
  const inside = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
  const same = (a, b) => Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5;
  const solid = el => {
    const cs = getComputedStyle(el);
    const fill = cs.fill;
    if (!fill || fill === 'none' || fill === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(fill)) return false;
    return parseFloat(cs.fillOpacity || '1') > 0 && parseFloat(cs.opacity || '1') > 0;
  };
  document.querySelectorAll('svg').forEach((svg, n) => {
    if (!visible(svg) || svg.closest('[aria-hidden="true"]')) return;
    const box = svg.getBoundingClientRect();
    const name = svg.getAttribute('aria-label') || svg.parentElement.id || ('svg #' + n);
    const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && visible(t))
      .map(t => ({ s: t.textContent.trim(), r: t.getBoundingClientRect() }));
    const shapes = [...svg.querySelectorAll('rect, circle, ellipse, polygon')].filter(el => visible(el) && solid(el))
      .map(el => el.getBoundingClientRect());
    texts.forEach((t, i) => {
      if (t.r.left < box.left - 0.5 || t.r.right > box.right + 0.5 || t.r.top < box.top - 0.5 || t.r.bottom > box.bottom + 0.5)
        out.push(`${name}: "${t.s}" runs past the chart edge`);
      // the same text drawn twice in one spot is a halo or outline effect, not a collision
      texts.slice(i + 1).forEach(u => { if (hit(t.r, u.r) && !(u.s === t.s && same(t.r, u.r))) out.push(`${name}: "${t.s}" overlaps "${u.s}"`); });
      shapes.forEach(r => { if (hit(t.r, r) && !inside(t.r, r)) out.push(`${name}: "${t.s}" crosses the edge of a filled shape`); });
    });
  });
  const sw = document.documentElement.scrollWidth;
  if (sw > window.innerWidth + 1) out.push(`page scrolls sideways (${sw}px wide at ${window.innerWidth}px)`);
  return out;
}

async function setRanges(page, which) {
  return page.$$eval('input[type=range]', (els, m) => {
    els.forEach(el => { el.value = el[m]; el.dispatchEvent(new Event('input', { bubbles: true })); });
    return els.length;
  }, which);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const failures = []; let states = 0;
  for (const pg of PAGES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      // "Failed to load resource" covers images and fonts from other hosts; script errors still count
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
      // scripts named in pages.json "routes" come from the local npm copy, so the check never depends on a CDN
      for (const [url, mod] of Object.entries(CONFIG.routes || {}))
        await page.route(url, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(require.resolve(mod)) }));
      page.on('pageerror', e => errors.push(e.message));
      const open = async (hash = '') => {
        await page.goto(BASE + pg.path + hash, { waitUntil: 'load' });
        await page.waitForTimeout(pg.settleMs || 300);
      };
      const check = async label => {
        states++;
        const found = (await page.evaluate(collisions)).concat(errors.splice(0).map(e => 'console error: ' + e));
        found.forEach(f => failures.push(`${pg.path} @${width}px [${label}] ${f}`));
        if (SHOTS && found.length) {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: path.join(SHOTS, `${pg.path.replace(/\W+/g, '_')}-${width}-${label.replace(/\W+/g, '_')}.png`), fullPage: true });
        }
      };
      await open(); await check('default');
      for (const m of ['min', 'max']) {
        await open();
        if (await setRanges(page, m)) { await page.waitForTimeout(250); await check('all sliders ' + m); }
      }
      for (const [label, hash] of Object.entries(pg.hashes || {})) {
        await open('#' + encodeURIComponent(JSON.stringify(hash))); await check(label);
      }
      if (pg.clickEach) {
        await open();
        const n = await page.locator(pg.clickEach).count();
        for (let i = 0; i < n; i++) {
          const btn = page.locator(pg.clickEach).nth(i);
          const label = 'click ' + (await btn.textContent()).trim();
          await btn.click(); await page.waitForTimeout(250); await check(label);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  if (failures.length) {
    console.log(failures.join('\n'));
    console.log(`\nFAILED: ${failures.length} layout problem(s) across ${states} page states`);
    process.exit(1);
  }
  console.log(`PASSED: ${PAGES.length} pages, ${states} page states, no collisions, overflow or console errors`);
})().catch(e => { console.error(e); process.exit(2); });
