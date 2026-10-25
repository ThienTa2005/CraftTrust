import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 320, height: 640, name: "320-small-mobile" },
  { width: 360, height: 740, name: "360-android-standard" },
  { width: 390, height: 844, name: "390-iphone-14" },
  { width: 430, height: 932, name: "430-iphone-pro-max" },
  { width: 768, height: 1024, name: "768-tablet-portrait" },
  { width: 1024, height: 768, name: "1024-laptop" },
  { width: 1440, height: 900, name: "1440-desktop-wide" },
];

test.describe("Real Geographical Craft Map E2E & Robustness", () => {
  // Test 1: Verify map loads properly on all 7 required viewports
  for (const vp of VIEWPORTS) {
    test(`loads map and tiles cleanly on viewport ${vp.width}px (${vp.name})`, async ({ page, isMobile }) => {
      if (isMobile && vp.width > 768) {
        test.skip();
        return;
      }
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const failedRequests: string[] = [];
      const tileRequests: { url: string; status: number }[] = [];

      page.on("requestfailed", (req) => {
        if (!req.url().includes("_rsc")) {
          failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
        }
      });

      page.on("response", (res) => {
        if (res.url().includes("basemaps.cartocdn") || res.url().includes("openstreetmap") || res.url().includes("arcgisonline")) {
          tileRequests.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto("/map", { waitUntil: "domcontentloaded" });

      // Wait for Leaflet container and tiles to settle
      const mapContainer = page.locator(".craft-map-viewport-panel");
      await expect(mapContainer).toBeVisible({ timeout: 15000 });

      // Ensure Leaflet container initialized
      const leafletContainer = page.locator(".leaflet-container");
      await expect(leafletContainer).toBeVisible({ timeout: 15000 });

      // Wait for at least 1 tile to finish loading
      await page.waitForFunction(() => {
        const tiles = Array.from(document.querySelectorAll<HTMLImageElement>(".leaflet-tile"));
        return tiles.length > 0 && tiles.some(t => t.complete && t.naturalWidth > 0);
      }, { timeout: 15000 });

      // Check tile stats
      const tileStats = await page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll<HTMLImageElement>(".leaflet-tile"));
        return {
          total: tiles.length,
          loaded: tiles.filter(t => t.complete && t.naturalWidth > 0).length,
          broken: tiles.filter(t => t.complete && t.naturalWidth === 0).length,
        };
      });

      expect(tileStats.loaded).toBeGreaterThan(0);
      expect(tileStats.broken).toBe(0);

      // Verify markers rendered
      const markers = page.locator(".custom-leaflet-marker");
      const markerCount = await markers.count();
      expect(markerCount).toBeGreaterThan(5);

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Save screenshot for audit
      await page.screenshot({ path: `scratch/map_viewport_${vp.width}.png` });
    });
  }

  // Test 2: Verify interactive features (search, category filter, marker click, directions)
  test("supports searching, category filters, marker selection and directions", async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 1024, height: 768 });
    }
    await page.goto("/map", { waitUntil: "domcontentloaded" });

    // Wait for map
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15000 });

    // Search for "Vạn Phúc"
    const searchInput = page.locator('input[placeholder*="Tìm theo tên làng nghề"]');
    await searchInput.fill("Vạn Phúc");

    // Check filtered carousel list
    await expect(page.locator('text=Làng lụa Vạn Phúc').first()).toBeVisible();

    // Click on category "Gốm sứ"
    await searchInput.fill("");
    const gomFilter = page.locator('button:has-text("Gốm sứ")');
    await gomFilter.click();

    // Inspector card should display Bat Trang
    await expect(page.locator('.craft-map-inspector-card h3:has-text("Làng gốm Bát Tràng")')).toBeVisible();

    // Click "Chỉ đường Google Maps" button
    const directionsBtn = page.locator('a.craft-map-primary-cta:has-text("Chỉ đường Google Maps")');
    await expect(directionsBtn).toBeVisible();
    const href = await directionsBtn.getAttribute("href");
    expect(href).toContain("google.com/maps/dir");
    expect(href).toContain("20.9786");
  });

  // Test 3: Verify tile provider switcher
  test("allows switching between map tile providers", async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 1024, height: 768 });
    }
    await page.goto("/map", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15000 });

    // Switch to OpenStreetMap "Chi tiết"
    const osmBtn = page.locator('.craft-map-tile-btn:has-text("Chi tiết")');
    await osmBtn.click();
    await expect(osmBtn).toHaveClass(/active/);

    // Wait for OSM tile to load
    await page.waitForFunction(() => {
      const tiles = Array.from(document.querySelectorAll<HTMLImageElement>(".leaflet-tile"));
      return tiles.some(t => t.src.includes("openstreetmap.org") && t.complete);
    }, { timeout: 15000 });

    // Switch to Esri "Địa hình"
    const esriBtn = page.locator('.craft-map-tile-btn:has-text("Địa hình")');
    await esriBtn.click();
    await expect(esriBtn).toHaveClass(/active/);

    await page.waitForFunction(() => {
      const tiles = Array.from(document.querySelectorAll<HTMLImageElement>(".leaflet-tile"));
      return tiles.some(t => t.src.includes("arcgisonline.com") && t.complete);
    }, { timeout: 15000 });
  });

  // Test 4: Verify resilient fallback when tile server is blocked / failing
  test("shows clear error card and fallback options when tile network fails", async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.setViewportSize({ width: 1024, height: 768 });
    }

    // Block all tile server domains to simulate extreme network block / offline
    await page.route(/.*(cartocdn|openstreetmap|arcgisonline).*/, (route) => {
      route.abort("failed");
    });

    await page.goto("/map", { waitUntil: "domcontentloaded" });

    // Wait for error card overlay to appear after fallback attempts
    const errorCard = page.locator(".craft-map-error-overlay");
    await expect(errorCard).toBeVisible({ timeout: 20000 });
    await expect(page.locator("text=Không thể kết nối máy chủ bản đồ trực tuyến")).toBeVisible();
    await expect(page.locator("text=Thử tải lại bản đồ")).toBeVisible();
    await expect(page.locator("text=Mở chỉ đường Google Maps")).toBeVisible();

    // Take screenshot of error state
    await page.screenshot({ path: "scratch/map_error_fallback.png" });
  });
});
