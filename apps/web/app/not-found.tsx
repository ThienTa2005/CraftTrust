import Link from "next/link";

export default function NotFound() {
  return <section className="shell page-hero"><span className="eyebrow">Not found</span><h1>This craft trail ends here.</h1><p>The page or passport identifier does not exist, or is not publicly available.</p><Link href="/" className="button">Return home</Link></section>;
}
