// Render the real exported GLBs with the same model-viewer runtime used by the app.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const errors = [];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#f6f3ed}model-viewer{width:100vw;height:100vh}</style>
<script type="module" src="/viewer.js"></script></head><body>
<model-viewer camera-controls environment-image="neutral" exposure="1" shadow-intensity="1"
camera-orbit="0deg 90deg auto" interaction-prompt="none"></model-viewer></body></html>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
    const file = req.url === '/viewer.js'
      ? path.join(root, 'apps/web/node_modules/@google/model-viewer/dist/model-viewer.min.js')
      : path.join(root, 'outputs/3d-audit', req.url.slice(1));
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless:true, args:['--enable-webgl','--use-angle=swiftshader']});
  const page = await browser.newPage({ viewport:{width:800,height:900}, deviceScaleFactor:1 });
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => customElements.get('model-viewer'));
  const results = [];
  for (const version of process.argv.slice(2).length ? process.argv.slice(2) : ['baseline','after']) {
    await mkdir(`outputs/3d-audit/${version}`, {recursive:true});
    await page.evaluate(async version => {
      const v = document.querySelector('model-viewer');
      await new Promise((resolve,reject) => {
        v.addEventListener('load', resolve, {once:true});
        v.addEventListener('error', () => reject(new Error('Model load failed')), {once:true});
        v.src = `/${version}/model.glb`;
      });
    }, version);
    await page.waitForTimeout(1200); // Let the model-viewer load indicator finish fading.
    for (const [name,theta,phi] of [['front',0,90],['back',180,90],['left',270,90],['right',90,90],['top',0,0],['bottom',0,180]]) {
      await page.evaluate(({theta,phi}) => {
        const v = document.querySelector('model-viewer');
        v.cameraOrbit = `${theta}deg ${phi}deg auto`; v.jumpCameraToGoal();
      }, {theta,phi});
      await page.waitForTimeout(500);
      await page.screenshot({path:`outputs/3d-audit/${version}/render-${name}.png`});
    }
    const before = await page.evaluate(() => document.querySelector('model-viewer').getCameraOrbit().radius);
    await page.mouse.move(400,450); await page.mouse.wheel(0,-160); await page.waitForTimeout(500);
    const after = await page.evaluate(() => document.querySelector('model-viewer').getCameraOrbit().radius);
    const orbitBefore = await page.evaluate(() => document.querySelector('model-viewer').getCameraOrbit().theta);
    await page.mouse.move(400,450); await page.mouse.down(); await page.mouse.move(540,460,{steps:10}); await page.mouse.up();
    await page.waitForTimeout(500);
    const orbitAfter = await page.evaluate(() => document.querySelector('model-viewer').getCameraOrbit().theta);
    await page.setViewportSize({width:390,height:700});
    await page.screenshot({path:`outputs/3d-audit/${version}/viewer-mobile.png`});
    await page.setViewportSize({width:800,height:900});
    results.push({version,loaded:true,zoom:before!==after,rotate:orbitBefore!==orbitAfter,renderedViews:6});
  }
  await writeFile('outputs/3d-audit/viewer-results.json', JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors}));
  if(errors.length || results.some(r=>!r.zoom||!r.rotate)) process.exitCode=1;
} finally { await browser?.close(); server.close(); }
