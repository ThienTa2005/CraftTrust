import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const baseUrl = process.env.STAGING_BASE_URL ?? "http://127.0.0.1:3000";
const pageUrl = `${baseUrl}/preview-3d`;
const outputDir = new URL("../test-results/staging-glb/", import.meta.url);

const profiles = [
  {
    name: "desktop-software-webgl",
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    network: null,
  },
  {
    name: "pixel7-8mbps-software-webgl",
    context: { ...devices["Pixel 7"] },
    network: {
      offline: false,
      latency: 80,
      downloadThroughput: 1_000_000,
      uploadThroughput: 250_000,
      connectionType: "cellular4g",
    },
  },
  {
    name: "android-webview-8mbps-software-webgl",
    context: {
      ...devices["Pixel 7"],
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 " +
        "Mobile Safari/537.36 Zalo",
    },
    network: {
      offline: false,
      latency: 80,
      downloadThroughput: 1_000_000,
      uploadThroughput: 250_000,
      connectionType: "cellular4g",
    },
  },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const results = [];
try {
  for (const profile of profiles) {
    const context = await browser.newContext(profile.context);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.addInitScript(() => {
      window.__craftTrustModelTiming = {};
      const attach = () => {
        const viewer = document.querySelector("model-viewer");
        if (!viewer || viewer.dataset.metricsAttached === "true") return;
        viewer.dataset.metricsAttached = "true";
        viewer.addEventListener("load", () => {
          window.__craftTrustModelTiming.load = performance.now();
        });
        viewer.addEventListener("poster-dismissed", () => {
          window.__craftTrustModelTiming.posterDismissed = performance.now();
        });
        viewer.addEventListener("error", () => {
          window.__craftTrustModelTiming.error = performance.now();
        });
      };
      const observe = () => {
        if (!document.documentElement) return;
        attach();
        new MutationObserver(attach).observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      };
      if (document.documentElement) observe();
      else
        document.addEventListener("readystatechange", observe, { once: true });
    });

    const client = await context.newCDPSession(page);
    if (profile.network) {
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", profile.network);
    }

    const navigationStarted = Date.now();
    const response = await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page
      .getByTestId("model-load-time")
      .filter({ hasText: "Loaded in" })
      .waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForTimeout(1_000);

    const browserMetrics = await page.evaluate(() => {
      const viewer = document.querySelector("model-viewer");
      const modelResource = performance
        .getEntriesByType("resource")
        .find((entry) => entry.name.includes("web-1cf288a4.glb"));
      const navigation = performance.getEntriesByType("navigation")[0];
      return {
        timing: window.__craftTrustModelTiming,
        statusText: document.querySelector('[data-testid="model-load-time"]')
          ?.textContent,
        modelResource: modelResource
          ? {
              durationMs: Math.round(modelResource.duration),
              transferSize: modelResource.transferSize,
              encodedBodySize: modelResource.encodedBodySize,
              decodedBodySize: modelResource.decodedBodySize,
            }
          : null,
        navigation: navigation
          ? {
              domContentLoadedMs: Math.round(
                navigation.domContentLoadedEventEnd,
              ),
              responseEndMs: Math.round(navigation.responseEnd),
            }
          : null,
        viewer: viewer
          ? {
              loaded: viewer.loaded,
              canActivateAR: viewer.canActivateAR,
              width: Math.round(viewer.getBoundingClientRect().width),
              height: Math.round(viewer.getBoundingClientRect().height),
            }
          : null,
      };
    });

    const screenshot = new URL(`${profile.name}.png`, outputDir);
    const screenshotPath =
      profile.name === "desktop-software-webgl"
        ? fileURLToPath(screenshot)
        : null;
    let screenshotError = null;
    if (screenshotPath) {
      try {
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
          timeout: 30_000,
          animations: "disabled",
        });
      } catch (error) {
        screenshotError =
          error instanceof Error ? error.message : String(error);
      }
    }
    results.push({
      profile: profile.name,
      httpStatus: response?.status() ?? null,
      wallClockMs: Date.now() - navigationStarted,
      ...browserMetrics,
      consoleErrors,
      pageErrors,
      screenshot: screenshotPath,
      screenshotError,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  pageUrl,
  renderer: "Chromium headless with ANGLE SwiftShader (CPU software WebGL)",
  limitations: [
    "Pixel 7 and Android WebView are emulations on the desktop Chromium engine.",
    "No physical Android device or Zalo Mini App runtime was measured.",
  ],
  results,
};
await writeFile(
  new URL("metrics.json", outputDir),
  `${JSON.stringify(report, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (
  results.some(
    (result) =>
      result.httpStatus !== 200 ||
      result.viewer?.loaded !== true ||
      result.pageErrors.length > 0 ||
      result.timing?.error,
  )
) {
  process.exitCode = 1;
}
