"use client";

import { useState } from "react";
import Image from "next/image";
import { Box } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import type { Experience } from "@/lib/experiences";
import { ExperienceViewer } from "./experience-viewer";

export function ExperiencesView({ experiences, unavailable = false }: { experiences: Experience[]; unavailable?: boolean }) {
  const { locale } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const vi = locale === "vi";
  return (
    <section className="shell experiences-page">
      <span className="eyebrow">CraftTrust · {vi ? "Không gian khám phá" : "Explore"}</span>
      <h1>{vi ? "Trải nghiệm 3D/VR" : "3D/VR experiences"}</h1>
      <p>{vi ? "Khám phá mô hình 3D từ các sản phẩm thật của nghệ nhân đã được CraftTrust kiểm duyệt. Chọn một tác phẩm để xoay và xem chi tiết." : "Explore reviewed 3D models from real artisan products. Choose a work to rotate and inspect."}</p>
      {unavailable ? (
        <p className="error-banner" role="status">{vi ? "Chưa tải được bộ sưu tập trải nghiệm. Vui lòng quay lại sau." : "The experience collection is currently unavailable. Please try again later."}</p>
      ) : experiences.length === 0 ? (
        <div className="empty">{vi ? "Chưa có trải nghiệm được xuất bản. Bộ sưu tập sẽ xuất hiện khi quản trị viên đăng nội dung." : "No experiences have been published yet. The collection will appear once an administrator publishes content."}</div>
      ) : (
        <div className="experiences-grid">
          {experiences.map((item) => (
            <article className="experience-card" key={item.id}>
              {item.product?.posterUrl && <Image src={item.product.posterUrl} width={640} height={420} alt={item.product.name} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 12 }} />}
              <Box aria-hidden="true" size={28} />
              <h2>{item.title}</h2>
              {item.product && <p><strong>{item.product.name}</strong> · {item.product.artisan}</p>}
              <p>{item.description}</p>
              <button className="button secondary" type="button" aria-expanded={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>
                {selected === item.id ? vi ? "Đóng mô hình" : "Close model" : vi ? "Xem mô hình 3D" : "View 3D model"}
              </button>
              {selected === item.id && <ExperienceViewer key={item.id} id={item.id} title={item.title} />}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
