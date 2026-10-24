import { ExperiencesView } from "@/components/experiences-view";
import { createPublicSupabase } from "@/lib/supabase";
import type { Experience } from "@/lib/experiences";

export const metadata = { title: "Trải nghiệm 3D/VR · CraftTrust" };
export const dynamic = "force-dynamic";

export default async function ExperiencesPage() {
  const supabase = createPublicSupabase();
  if (!supabase) return <ExperiencesView experiences={[]} unavailable />;
  let experiences: Experience[] = [];
  let unavailable = false;
  try {
    const { data, error } = await supabase.from("experiences")
      .select("id,title,description,status,created_at").eq("status", "published")
      .order("created_at", { ascending: false });
    experiences = (data ?? []) as Experience[];
    unavailable = Boolean(error);
  } catch {
    unavailable = true;
  }
  return <ExperiencesView experiences={experiences} unavailable={unavailable} />;
}
