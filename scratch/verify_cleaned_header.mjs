import { chromium } from "@playwright/test";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

  const textContent = await page.textContent(".buyer-header");
  
  // 1. Check trending tags
  const hasTrendingTags = textContent.includes("Ấm tử sa Bát Tràng") || textContent.includes("Men rạn cổ");
  console.log("Trending tags present in header?", hasTrendingTags, "(Expected: false)");

  // 2. Check village links in subnav
  const hasSubnavVillages = await page.locator(".buyer-subnav").textContent();
  const hasVillageSubnav = hasSubnavVillages.includes("Gốm Bát Tràng") || hasSubnavVillages.includes("Lụa Vạn Phúc") || hasSubnavVillages.includes("Mộc Mỹ Nghệ");
  console.log("Village items present in subnav?", hasVillageSubnav, "(Expected: false)");

  // 3. Verify core navigation remains intact
  const hasAllProducts = hasSubnavVillages.includes("Tất cả sản phẩm");
  const hasExperiences = hasSubnavVillages.includes("Trải nghiệm 3D/VR");
  const hasMap = hasSubnavVillages.includes("Bản đồ làng nghề");
  const hasRewards = hasSubnavVillages.includes("Tích điểm đổi quà");
  console.log("Core subnav links intact?", { hasAllProducts, hasExperiences, hasMap, hasRewards });

  // 4. Verify search input still exists and works
  const searchInput = page.locator(".buyer-search-input-box input");
  await searchInput.fill("ấm tử sa");
  await page.locator(".buyer-search-submit-btn").click();
  await page.waitForURL(/\/marketplace\?q=/, { timeout: 10000 });
  console.log("Search functionality verified intact, redirected to:", page.url());

  // Take screenshot of new header
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.locator(".buyer-header").screenshot({ path: "scratch/cleaned_buyer_header.png" });
  console.log("Saved screenshot: scratch/cleaned_buyer_header.png");

  await browser.close();
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
