"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState, type PointerEvent } from "react";

export function ProductImageLens({ src, alt }: { src: string; alt: string }) {
  const [lens, setLens] = useState({ x: 50, y: 50, visible: false });

  function moveLens(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(
      100,
      Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100),
    );
    const y = Math.min(
      100,
      Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100),
    );
    setLens({ x, y, visible: true });
  }

  return (
    <div
      className="product-image-lens"
      onPointerEnter={moveLens}
      onPointerMove={moveLens}
      onPointerLeave={() =>
        setLens((current) => ({ ...current, visible: false }))
      }
    >
      <Image src={src} alt={alt} width={1000} height={1100} priority />
      <span
        className={`magnifier-lens ${lens.visible ? "is-visible" : ""}`}
        style={{
          left: `${lens.x}%`,
          top: `${lens.y}%`,
          backgroundImage: `url("${src}")`,
          backgroundPosition: `${lens.x}% ${lens.y}%`,
        }}
        aria-hidden="true"
      />
      <span className="magnifier-hint">
        <Search size={15} aria-hidden="true" />
        Soi vân men
      </span>
    </div>
  );
}
