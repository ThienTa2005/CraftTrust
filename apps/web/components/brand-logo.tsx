import Image from "next/image";

export function BrandLogo({
  compact = false,
  variant = compact ? "compact" : "horizontal",
  className = "",
  priority = true,
}: {
  compact?: boolean;
  variant?: "horizontal" | "compact" | "full";
  className?: string;
  priority?: boolean;
}) {
  if (variant === "compact") {
    return (
      <Image
        className={`brand-logo compact ${className}`.trim()}
        src="/brand/icon-192.png"
        width={48}
        height={48}
        alt="CraftTrust – Mỗi lần mua một lần về làng"
        priority={priority}
      />
    );
  }

  if (variant === "full") {
    return (
      <Image
        className={`brand-logo full ${className}`.trim()}
        src="/brand/full.png"
        width={240}
        height={240}
        alt="CraftTrust – Mỗi lần mua một lần về làng"
        priority={priority}
      />
    );
  }

  return (
    <Image
      className={`brand-logo ${className}`.trim()}
      src="/brand/horizontal.png"
      width={224}
      height={52}
      alt="CraftTrust – Mỗi lần mua một lần về làng"
      priority={priority}
    />
  );
}

