"use client";

import Image from "next/image";
import Link from "next/link";
import { DataNotice } from "@/components/data-state";
import type { VillageCard } from "@/lib/demo-data";
import { useLanguage } from "@/lib/i18n/context";

export function VillagesView({ villages, demo, error }: { villages: VillageCard[]; demo: boolean; error?: string | undefined }) {
  const { locale, t } = useLanguage();

  return (
    <div className="shell">
      <header className="page-hero">
        <span className="eyebrow">{t.villages.eyebrow}</span>
        <h1>{t.villages.title}</h1>
        <p>{t.villages.subtitle}</p>
      </header>

      <DataNotice demo={demo} error={error} />

      {villages.length ? (
        <div className="grid three">
          {villages.map((village) => {
            const summary = locale === "en" && village.summaryEn ? village.summaryEn : village.summary;
            const craft = locale === "en" && village.craftEn ? village.craftEn : village.craft;
            return (
              <Link className="card" href={`/villages/${village.slug}`} key={village.id}>
                <div className="card-image">
                  <Image src={village.image} alt={village.name} fill sizes="33vw" />
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    <span>{village.district}</span>
                    <span>{craft}</span>
                  </div>
                  <h3>{village.name}</h3>
                  <p>{summary}</p>
                  <strong>{t.villages.craftTrail}</strong>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">{t.homeSections.noVillages}</div>
      )}
    </div>
  );
}
