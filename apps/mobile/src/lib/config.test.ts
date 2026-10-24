import { afterEach, describe, expect, it } from "vitest";
import { readPublicConfig } from "./config";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

describe("mobile public config", () => {
  it("reports missing backend settings", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_PASSPORT_BASE_URL;
    expect(readPublicConfig().config).toBeNull();
    expect(readPublicConfig().missing).toContain("supabaseUrl");
  });
});
