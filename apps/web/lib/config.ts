export const siteConfig = {
  name: "Hanoi Craft-Trust",
  description:
    "CraftTrust — kết nối nghệ nhân Hà Nội, tác phẩm thủ công và hồ sơ di sản có minh chứng.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function hasSupabaseConfig() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
