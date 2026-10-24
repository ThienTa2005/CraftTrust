import { expect, test } from "@playwright/test";

test("homepage defaults to Vietnamese and switches to English", async ({ page }) => {
  await page.goto("/");
  // Default is Vietnamese
  await expect(page.getByRole("heading", { name: /Mỗi tác phẩm thủ công mang một câu chuyện/i })).toBeVisible();
  await expect(page.getByText("DEMO DATA")).toBeVisible();

  // Switch to English
  await page.getByRole("button", { name: /English/i }).first().click();
  await expect(page.getByRole("heading", { name: /Craft carries a story/i })).toBeVisible();

  // Navigate to marketplace in English
  await page.getByRole("link", { name: /Explore the marketplace/i }).first().click();
  await expect(page).toHaveURL(/marketplace/);
  await expect(page.getByRole("heading", { name: /Craft chosen with context/i })).toBeVisible();

  // Switch back to Vietnamese
  await page.getByRole("button", { name: /Tiếng Việt/i }).first().click();
  await expect(page.getByRole("heading", { name: /Tác phẩm thủ công đính kèm nguồn gốc/i })).toBeVisible();
});

test("demo passport discloses evidence limits", async ({ page }) => {
  await page.goto("/passport/HCT-DEMO-BT-001");
  await expect(page.getByText(/DEMO DATA/i)).toBeVisible();
  await expect(page.getByText(/illustrative only/i)).toBeVisible();
});

test("seller and admin workspaces fail closed without backend", async ({ page }) => {
  await page.goto("/seller");
  await expect(page.getByText(/Supabase is not configured/i)).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText(/Supabase is not configured/i)).toBeVisible();
});
