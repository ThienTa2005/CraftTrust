export const siteConfig = {
  name: "Bát Tràng Craft",
  description:
    "Gốm Bát Tràng tuyển chọn với câu chuyện nghệ nhân và hộ chiếu nguồn gốc minh bạch.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function hasSupabaseConfig() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}
