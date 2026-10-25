import { expect, test } from "@playwright/test";

test.describe("Hanoi CraftTrust Final Acceptance Verification", () => {
  test("TEST 01 & 02: Admin Login and Redirection to Admin Portal with Design System", async ({ page }) => {
    // 1. Visit /auth with next=/admin
    await page.goto("/auth?next=/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Một tài khoản/i })).toBeVisible();

    // 2. Type Admin credentials sequentially to ensure React state updates
    const emailInput = page.locator("input#email");
    await emailInput.click();
    await emailInput.fill("");
    await emailInput.pressSequentially("admin@crafttrust.vn", { delay: 15 });
    await expect(emailInput).toHaveValue("admin@crafttrust.vn");

    const passInput = page.locator("input#password");
    await passInput.click();
    await passInput.fill("");
    await passInput.pressSequentially("12345678", { delay: 15 });
    await expect(passInput).toHaveValue("12345678");

    // 3. Submit login via submit button
    await page.locator("button.auth-submit").click();

    // 4. Verify redirected to /admin (strictly not /auth)
    await expect(page).toHaveURL(/\/admin(\?.*)?$/, { timeout: 20000 });
    await expect(page).not.toHaveURL(/\/auth/);

    // 5. Verify Admin Portal Shell Elements
    await expect(page.getByText("CỔNG QUẢN TRỊ HỆ THỐNG")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("TỔNG GMV TOÀN SÀN")).toBeVisible();
    await expect(page.getByText("GIAN HÀNG NGHỆ NHÂN")).toBeVisible();
    await expect(page.getByText("3 xưởng")).toBeVisible();

    // 6. Verify Navigation and Tabs
    await page.getByRole("button", { name: /Kiểm Duyệt Sản Phẩm/i }).click();
    await expect(page.getByRole("heading", { name: /Kiểm Duyệt Sản Phẩm/i })).toBeVisible();

    await page.getByRole("button", { name: /Đơn Hàng Toàn Sàn/i }).click();
    await expect(page.getByRole("heading", { name: /Giám Sát Đơn Hàng/i })).toBeVisible();

    // 7. Refresh page - stays in /admin
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText("CỔNG QUẢN TRỊ HỆ THỐNG")).toBeVisible();
  });

  test("TEST 07 & 08: Digital Heritage Passport Benchmark Verification (CT-BTG-NVA-2026-0085)", async ({ page }) => {
    await page.goto("/trace/CT-BTG-NVA-2026-0085", { waitUntil: "domcontentloaded" });

    // Verify artifact identifier and titles
    await expect(page.getByText("CT-BTG-NVA-2026-0085").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Bình gốm men lam Bát Tràng/i })).toBeVisible();

    // Verify Truthful OCOP disclaimer
    await expect(
      page.getByText(/Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống/i),
    ).toBeVisible();

    // Verify 3D Base inspection button
    await expect(page.getByRole("button", { name: /Xoay xem đáy & Tem QR/i })).toBeVisible();

    // Verify Artisan details
    await expect(page.getByText("Nghệ nhân Nguyễn Văn An (NVA)").first()).toBeVisible();
    await expect(page.getByText("Xưởng gốm thủ công Thu Hà").first()).toBeVisible();

    // Verify 6-stage video process tabs
    await expect(page.getByText(/Quy Trình Chế Tác Di Sản/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /CĐ 1/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /CĐ 6/i })).toBeVisible();
  });

  test("TEST 12: Responsive Viewport Checks Across Standard Screen Sizes", async ({ page }) => {
    const viewports = [
      { name: "Mobile (iPhone SE)", width: 375, height: 667 },
      { name: "Mobile (Pixel 7)", width: 412, height: 915 },
      { name: "Tablet (iPad Mini)", width: 768, height: 1024 },
      { name: "Desktop (Standard)", width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/trace/CT-BTG-NVA-2026-0085", { waitUntil: "domcontentloaded" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll, `Horizontal overflow on ${vp.name}`).toBe(false);
    }
  });
});
