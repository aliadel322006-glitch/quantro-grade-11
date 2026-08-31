import { LandingPage } from "@/components/landing-page";
import { getAuthContext } from "@/lib/auth/server";

export default async function PublicHome({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return <LandingPage locale={lang === "ar" ? "ar" : "en"} session={await getAuthContext()} />;
}
