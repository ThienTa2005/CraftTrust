import { describe, expect, it } from "vitest";
import { identifier, readConfig } from "./lib";

describe("Zalo client configuration", () => {
  it("blocks backend use when required public values are absent", () => {
    const result = readConfig({} as ImportMetaEnv);
    expect(result.config).toBeNull();
    expect(result.missing).toEqual(["supabaseUrl", "supabaseAnonKey", "passportBaseUrl"]);
  });

  it("extracts the resolver identifier without asserting verification", () => {
    expect(identifier("https://example.test/passport/QR-123")).toBe("QR-123");
  });
});
