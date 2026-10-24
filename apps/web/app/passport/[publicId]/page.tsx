import { notFound } from "next/navigation";
import { getPassport } from "@/lib/passport";
import { siteConfig } from "@/lib/config";
import { PassportView } from "@/components/passport-view";

export default async function PassportPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const result = await getPassport(publicId);
  if (!result.data) notFound();

  const passport = result.data;
  const url = `${siteConfig.siteUrl}/passport/${encodeURIComponent(passport.publicId)}`;

  return (
    <PassportView
      passport={passport}
      demo={result.demo}
      error={result.error}
      url={url}
    />
  );
}
