import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <Image className={compact ? "brand-logo compact" : "brand-logo"}
    src={compact ? "/brand/icon-192.png" : "/brand/horizontal.png"}
    width={compact ? 48 : 224} height={compact ? 48 : 64}
    alt="CraftTrust · Hanoi Craft-Trust" priority />;
}
