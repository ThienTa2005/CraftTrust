import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'Mobile_Very_Small', width: 320, height: 568 },
  { name: 'Android_Small', width: 360, height: 800 },
  { name: 'iPhone_Common', width: 375, height: 812 },
  { name: 'Mobile_Standard', width: 390, height: 844 },
  { name: 'Mobile_Large_412', width: 412, height: 915 },
  { name: 'Mobile_Large_430', width: 430, height: 932 },
  { name: 'Tablet_768', width: 768, height: 1024 },
  { name: 'Laptop_1024', width: 1024, height: 768 },
  { name: 'Desktop_1440', width: 1440, height: 900 },
  { name: 'Desktop_Large_1920', width: 1920, height: 1080 },
];

const ROUTES = [
  '/',
  '/marketplace',
  '/products/moon-glaze-tea-set',
  '/cart',
  '/checkout',
  '/orders',
  '/passport/HCT-VN-BT-001',
  '/villages',
  '/map',
  '/assistant',
  '/auth',
  '/admin',
  '/seller',
];

async function run() {
  await fs.mkdir('outputs/responsive-tests', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set cookie for Vietnamese by default
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' }
  ]);

  const results = [];
  let totalOverflows = 0;

  console.log(`Starting comprehensive responsive testing across ${VIEWPORTS.length} viewports and ${ROUTES.length} routes...`);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    for (const route of ROUTES) {
      try {
        await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(400); // Allow render settle

        const check = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth;
          const scrollW = document.documentElement.scrollWidth;
          const bodyScrollW = document.body ? document.body.scrollWidth : 0;
          const isOverflowing = scrollW > docW + 1 || bodyScrollW > docW + 1;

          // Find specific elements causing overflow
          const overflowingElements = [];
          const all = document.querySelectorAll('body *');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.right > docW + 2 && window.getComputedStyle(el).position !== 'absolute') {
              overflowingElements.push({
                tag: el.tagName,
                className: el.className?.toString?.().slice(0, 50) || '',
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
              if (overflowingElements.length >= 5) break;
            }
          }

          return {
            docW,
            scrollW,
            isOverflowing,
            overflowingElements,
          };
        });

        const status = check.isOverflowing ? 'FAILED (Overflow)' : 'PASSED';
        if (check.isOverflowing) {
          totalOverflows++;
          console.warn(`  ❌ ${route}: ${status} (docW=${check.docW}, scrollW=${check.scrollW})`);
          if (check.overflowingElements.length > 0) {
            console.warn(`     Culprits:`, check.overflowingElements);
          }
        } else {
          console.log(`  ✅ ${route}: ${status}`);
        }

        results.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          route,
          ...check,
        });
      } catch (err) {
        console.error(`  ⚠️ ${route}: Error ${err.message}`);
        results.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          route,
          error: err.message,
        });
      }
    }
  }

  await fs.writeFile('outputs/responsive-report.json', JSON.stringify(results, null, 2));
  console.log(`\n========================================`);
  console.log(`Test completed. Total checks: ${results.length}, Overflows: ${totalOverflows}`);
  console.log(`Report written to outputs/responsive-report.json`);
  console.log(`========================================\n`);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
