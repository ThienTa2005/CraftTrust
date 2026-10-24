import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Hanoi Craft-Trust", short_name: "CraftTrust", description: "Di sản thủ công Hà Nội", start_url: "/", display: "standalone", background_color: "#F8F5EE", theme_color: "#123859", icons: [192, 512].map(size => ({ src: `/brand/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png" })) };
}
