import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const origin = process.argv[2] || 'http://127.0.0.1:3100';
const stage = process.argv[3] || 'before';
const out = `outputs/upgrade/${stage}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const report = [];
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ['/', '/products/moon-glaze-tea-set', '/auth', '/admin', '/seller']) {
    try {
      await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: `${out}/${route.replaceAll('/', '-') || 'home'}-${width}.png`, fullPage: true });
      const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth+1 || r.left < -1) && getComputedStyle(e).position !== 'absolute'; }).slice(0,15).map(e => e.tagName+'.'+e.className) }));
      report.push({route, width, ...overflow});
    } catch (error) { report.push({ route, width, error: error.message }); }
  }
}
await fs.writeFile(`${out}/audit.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await browser.close();
