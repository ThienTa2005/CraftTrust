import { describe, it, expect } from "vitest";
import { getPassport } from "../lib/passport";

describe("Digital Heritage Passport & Traceability (Master Prompt P1 & P2)", () => {
  it("resolves exact demo public code CT-BTG-NVA-2026-0085", async () => {
    const result = await getPassport("CT-BTG-NVA-2026-0085");
    expect(result.data).toBeDefined();
    const passport = result.data!;

    expect(passport.publicCode).toBe("CT-BTG-NVA-2026-0085");
    expect(passport.artifactId).toBe("ART-BTG-2026-0085");
    expect(passport.productName).toContain("Bát Tràng");
    expect(passport.artisan).toContain("Nguyễn Văn An");
    expect(passport.artisanYears).toBe(35);
    expect(passport.priceVnd).toBe(850000);
  });

  it("strictly enforces truthful OCOP status for demo product without fake certificates", async () => {
    const result = await getPassport("CT-BTG-NVA-2026-0085");
    const passport = result.data!;

    expect(passport.ocop.hasCertificate).toBe(false);
    expect(passport.ocop.stars).toBe(0);
    expect(passport.ocop.officialStatusVi).toBe("Chưa có giấy chứng nhận OCOP được xác minh trong hệ thống.");
  });

  it("includes all 6 crafting process video stages with illustration disclaimer", async () => {
    const result = await getPassport("CT-BTG-NVA-2026-0085");
    const passport = result.data!;

    expect(passport.videos.length).toBe(6);
    expect(passport.videos[0]!.stageNumber).toBe(1);
    expect(passport.videos[5]!.stageNumber).toBe(6);
    expect(passport.videos[0]!.isIllustrationNote).toContain("Video tư liệu minh họa");
  });

  it("configures scannable base QR seal placement on the 3D model", async () => {
    const result = await getPassport("CT-BTG-NVA-2026-0085");
    const passport = result.data!;

    expect(passport.qrPlacement).toBeDefined();
    expect(passport.qrPlacement?.enabled).toBe(true);
    expect(passport.modelUrl).toBeDefined();
  });

  it("includes authoritative research citations from official Hanoi portals", async () => {
    const result = await getPassport("CT-BTG-NVA-2026-0085");
    const passport = result.data!;

    expect(passport.editorialStory.sources.length).toBeGreaterThanOrEqual(3);
    const urls = passport.editorialStory.sources.map((s) => s.url);
    expect(urls).toContain("https://vanban.hanoi.gov.vn/");
    expect(urls).toContain("https://ocop.gov.vn/");
    expect(urls).toContain("https://traceviet.mae.gov.vn/");
  });
});
