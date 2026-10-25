import { BrandedLoader } from "@/components/branded-loader";

export default function Loading() {
  return (
    <BrandedLoader
      fullscreen
      message="Đang tạo tác trải nghiệm di sản…"
      subtext="Mỗi lần mua một lần về làng"
    />
  );
}

