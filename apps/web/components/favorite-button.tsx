"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const FAVORITES_KEY = "hct_favorite_products";

export function FavoriteButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      const favorites = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) ?? "[]",
      ) as string[];
      setActive(favorites.includes(productId));
    } catch {
      setActive(false);
    }
  }, [productId]);

  function toggleFavorite() {
    setActive((current) => {
      const next = !current;
      try {
        const favorites = new Set(
          JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[],
        );
        if (next) favorites.add(productId);
        else favorites.delete(productId);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
      } catch {
        // The visual interaction still works when storage is unavailable.
      }
      return next;
    });
  }

  return (
    <button
      type="button"
      className={`favorite-button ${active ? "is-favorite" : ""}`}
      onClick={toggleFavorite}
      aria-pressed={active}
      aria-label={`${active ? "Bỏ lưu" : "Lưu"} ${productName}`}
    >
      <Heart size={19} fill={active ? "currentColor" : "none"} />
      <span className="favorite-spark spark-one" aria-hidden="true" />
      <span className="favorite-spark spark-two" aria-hidden="true" />
      <span className="favorite-spark spark-three" aria-hidden="true" />
    </button>
  );
}
