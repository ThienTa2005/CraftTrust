import { expect, test } from "@playwright/test";

test("experience navigation opens a separate page with no upload controls", async ({ page }, testInfo) => {
  await page.goto("/experiences");
  await expect(page.getByRole("heading", { name: "Trải nghiệm 3D/VR", exact: true })).toBeVisible();
  await expect(page.locator('a[href="/experiences"]').first()).toHaveAttribute("href", "/experiences");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Xuất bản|Tải lên/ })).toHaveCount(0);
  for (const width of testInfo.project.name === "mobile" ? [320, 390] : [1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/experiences-${width}.png`, fullPage: true });
  }
});

test("anonymous visitors cannot upload or publish experiences", async ({ request }) => {
  expect((await request.get("/api/admin/experiences")).status()).toBe(401);
  expect((await request.post("/api/admin/experiences", { multipart: { title: "Unauthorized" } })).status()).toBe(401);
  expect((await request.patch("/api/admin/experiences/11111111-1111-4111-8111-111111111111", { data: { status: "published" } })).status()).toBe(401);
});
