import { expect, test } from "@playwright/test";

test("homepage defaults to Vietnamese and switches to English", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Default is Vietnamese
  await expect(
    page.getByRole("heading", { name: /Chạm vào đất. Ngắm men kể chuyện/i }),
  ).toBeVisible();

  // Switch to English
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /Toggle navigation/i }).click();
  }
  await page
    .getByRole("button", { name: /English/i })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /Touch the clay. Watch the glaze tell its story/i,
    }),
  ).toBeVisible();

  // Navigate to marketplace in English
  await page
    .getByRole("link", { name: /Explore the collection/i })
    .first()
    .click();
  await expect(page).toHaveURL(/marketplace/);
  await expect(
    page.getByRole("heading", { name: /Find a ceramic form made for you/i }),
  ).toBeVisible();

  // Switch back to Vietnamese
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /Toggle navigation/i }).click();
  }
  await page
    .getByRole("button", { name: /Tiếng Việt/i })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Tìm một dáng gốm dành cho bạn/i }),
  ).toBeVisible();
});

test("passport discloses truthful evidence limits", async ({ page }) => {
  await page.goto("/trace/CT-BTG-NVA-2026-0085", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(/Chưa có giấy chứng nhận OCOP/i)).toBeVisible();
});

test("seller and admin workspaces fail closed without authorization", async ({
  page,
}) => {
  await page.goto("/seller", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Khu Vực Quản Trị/i)).toBeVisible();
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Cổng Quản Trị/i)).toBeVisible();
});

test("major pages stay inside the viewport from phone to wide desktop", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  test.setTimeout(180_000);

  const routes = [
    "/",
    "/marketplace",
    "/products/moon-glaze-tea-set",
    "/villages",
    "/villages/bat-trang",
    "/map",
    "/rewards",
    "/passport/HCT-DEMO-BT-001",
    "/assistant",
    "/cart",
    "/checkout",
    "/orders",
    "/auth",
    "/docs",
  ];
  const edgeViewports = [
    { width: 320, height: 720 },
    { width: 1920, height: 1080 },
  ];
  const representativeRoutes = [
    "/",
    "/marketplace",
    "/map",
    "/rewards",
    "/passport/HCT-DEMO-BT-001",
  ];
  const middleViewports = [
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
  ];

  const assertNoDocumentOverflow = async (route: string) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        { message: `${route} should not overflow the viewport horizontally` },
      )
      .toBe(true);
  };

  for (const viewport of edgeViewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) await assertNoDocumentOverflow(route);
  }

  for (const viewport of middleViewports) {
    await page.setViewportSize(viewport);
    for (const route of representativeRoutes)
      await assertNoDocumentOverflow(route);
  }
});
