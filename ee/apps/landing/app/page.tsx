import { LandingHome } from "../components/landing-home";
import { getGithubData } from "../lib/github";
import { headers } from "next/headers";
import { StructuredData } from "../components/structured-data";
import { baseOpenGraph } from "../lib/seo";

export const metadata = {
  alternates: {
    canonical: "/"
  },
  openGraph: {
    ...baseOpenGraph,
    url: "https://teamworklabs.com"
  }
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TeamWork",
  description:
    "Open source Claude Cowork alternative. Desktop app that lets teams use 50+ LLMs, bring their own provider keys, and ship reusable agent setups with guardrails.",
  url: "https://teamworklabs.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "macOS, Windows, Linux",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    url: "https://teamworklabs.com/pricing"
  },
  publisher: {
    "@type": "Organization",
    name: "TeamWork",
    url: "https://teamworklabs.com"
  }
};

export default async function Home() {
  const github = await getGithubData();
  const cal = process.env.NEXT_PUBLIC_CAL_URL || "/enterprise#book";
  const userAgent = headers().get("user-agent")?.toLowerCase() || "";
  const isMobileVisitor = /android|iphone|ipad|ipod|mobile/.test(userAgent);

  return (
    <>
      <StructuredData data={softwareApplicationSchema} />
      <LandingHome
        stars={github.stars}
        downloadHref={github.downloads.macos}
        callHref={cal}
        isMobileVisitor={isMobileVisitor}
      />
    </>
  );
}
