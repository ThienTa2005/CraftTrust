"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <div className="shell page-hero"><div className="error-banner" role="alert">Something went wrong while loading this view. <button className="button small" onClick={reset}>Try again</button></div></div>;
}
