import { BrandedLoader } from "@/components/branded-loader";

export default function Loading() {
  return (
    <BrandedLoader
      fullscreen
      message="Đang tải không gian di sản…"
      subtext="Mỗi lần mua một lần về làng"
    />
  );
}

