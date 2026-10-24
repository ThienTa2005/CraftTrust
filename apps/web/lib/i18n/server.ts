import { cookies } from "next/headers";
import type { Locale, TranslationDictionary } from "./types";
import { translations } from "./translations";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("hct_lang");
    if (cookie?.value === "en") return "en";
    return "vi";
  } catch {
    return "vi";
  }
}

export async function getServerTranslations(): Promise<{ locale: Locale; t: TranslationDictionary }> {
  const locale = await getServerLocale();
  return { locale, t: translations[locale] };
}
