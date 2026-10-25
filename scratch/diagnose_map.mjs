import { chromium } from "@playwright/test";

async function diagnoseMap(url) {
  console.log(`\n=== DIAGNOSING MAP: ${url} ===`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  const page = await context.newPage();

  const failedRequests = [];
  const tileRequests = [];

  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText,
      resourceType: req.resourceType(),
    });
  });

  page.on("response", (res) => {
    if (res.url().includes("tile") || res.url().includes("openstreetmap")) {
      tileRequests.push({
        url: res.url(),
        status: res.status(),
        statusText: res.statusText(),
        contentType: res.headers()["content-type"],
        contentLength: res.headers()["content-length"],
        timing: res.request().timing(),
      });
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn") {
      console.log(`[Browser ${msg.type()}]`, msg.text());
    }
  });

  try {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`DOM Content Loaded in ${Date.now() - startTime}ms`);

    // Wait a bit for Leaflet to initialize and tiles to load
    await page.waitForTimeout(6000);

    const mapDiagnostics = await page.evaluate(() => {
      const viewportPanel = document.querySelector(".craft-map-viewport-panel");
      const mapContainer = viewportPanel ? viewportPanel.querySelector("div") : null;
      const leafletContainer = document.querySelector(".leaflet-container");
      const tiles = Array.from(document.querySelectorAll(".leaflet-tile"));

      return {
        viewportPanel: viewportPanel ? {
          offsetWidth: viewportPanel.offsetWidth,
          offsetHeight: viewportPanel.offsetHeight,
          clientWidth: viewportPanel.clientWidth,
          clientHeight: viewportPanel.clientHeight,
        } : null,
        mapContainer: mapContainer ? {
          offsetWidth: mapContainer.offsetWidth,
          offsetHeight: mapContainer.offsetHeight,
          className: mapContainer.className,
        } : null,
        hasLeafletContainer: !!leafletContainer,
        tilesCount: tiles.length,
        tilesInfo: tiles.slice(0, 6).map(t => ({
          src: t.src,
          complete: t.complete,
          naturalWidth: t.naturalWidth,
          naturalHeight: t.naturalHeight,
        })),
        loadedTilesCount: tiles.filter(t => t.complete && t.naturalWidth > 0).length,
        brokenTilesCount: tiles.filter(t => t.complete && t.naturalWidth === 0).length,
        loadingTilesCount: tiles.filter(t => !t.complete).length,
        markersCount: document.querySelectorAll(".custom-leaflet-marker").length,
      };
    });

    console.log("Map Diagnostics:", JSON.stringify(mapDiagnostics, null, 2));
    console.log(`Tile Requests Count: ${tileRequests.length}`);
    if (tileRequests.length > 0) {
      console.log("Sample Tile Requests:", tileRequests.slice(0, 3));
      const non200Tiles = tileRequests.filter(t => t.status !== 200 && t.status !== 304);
      console.log(`Non-200/304 Tiles: ${non200Tiles.length}`);
      if (non200Tiles.length > 0) {
        console.log("Non-200 Tiles Sample:", non200Tiles.slice(0, 5));
      }
    }
    console.log(`Failed Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      console.log("Failed Requests Sample:", failedRequests.slice(0, 5));
    }

    const safeUrlName = url.includes("vercel") ? "vercel" : "local";
    await page.screenshot({ path: `scratch/diagnose_map_${safeUrlName}_390.png` });
    console.log(`Screenshot saved to scratch/diagnose_map_${safeUrlName}_390.png`);

  } catch (err) {
    console.error("Diagnosis error:", err);
  } finally {
    await browser.close();
  }
}

async function main() {
  await diagnoseMap("http://127.0.0.1:3000/map");
  await diagnoseMap("https://craft-trust.vercel.app/map");
}

main();
