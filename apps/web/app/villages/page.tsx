import type { Metadata } from "next";
import { getVillages } from "@/lib/data";
import { VillagesView } from "@/components/villages-view";

export const metadata: Metadata = {
  title: "Làng nghề di sản · Craft villages"
};

export default async function VillagesPage() {
  const villages = await getVillages();

  return (
    <VillagesView
      villages={villages.data}
      demo={villages.demo}
      error={villages.error}
    />
  );
}
