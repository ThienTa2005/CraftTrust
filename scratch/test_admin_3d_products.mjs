import { chromium } from "@playwright/test";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1200 }
  });

  console.log("1. Logging into Admin...");
  await page.goto("http://localhost:3000/auth?next=/admin", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Quản trị viên/i }).click();
  await page.waitForTimeout(200);
  await page.locator("button.auth-submit").click();
  await page.waitForURL(/\/admin(\?.*)?$/, { timeout: 20000 });

  console.log("2. Navigating to Tab 'Kiểm Duyệt Sản Phẩm' (3D Manager)...");
  await page.getByRole("button", { name: /Kiểm Duyệt Sản Phẩm/i }).click();
  await page.waitForTimeout(1500);

  // Scroll to 3D manager
  const managerHeader = page.getByRole("heading", { name: /Quản Lý & Kiểm Định Mô Hình 3D\/AR/i });
  await managerHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take screenshot of the 3D Studio area
  await page.screenshot({ path: "scratch/admin_3d_studio_working.png" });
  console.log("Saved screenshot: scratch/admin_3d_studio_working.png");

  await browser.close();
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
