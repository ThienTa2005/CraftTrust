export const siteConfig = {
  name: "Hanoi Craft-Trust",
  description: "Verified stories, living heritage, and craft from Hanoi's artisan villages.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
};

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
