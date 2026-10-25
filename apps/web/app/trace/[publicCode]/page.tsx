import { notFound } from "next/navigation";
import { getPassport } from "@/lib/passport";
import { siteConfig } from "@/lib/config";
import { PassportView } from "@/components/passport-view";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  const result = await getPassport(publicCode);
  if (!result.data) notFound();

  const passport = result.data;
  const url = `${siteConfig.siteUrl}/trace/${encodeURIComponent(passport.publicCode || passport.publicId)}`;

  return (
    <PassportView
      passport={passport}
      demo={result.demo}
      error={result.error}
      url={url}
      traceMode
    />
  );
}
