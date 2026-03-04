import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getDictionary } from "../dictionaries";
import HtmlLangUpdater from "@/components/HtmlLangUpdater";

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const resolvedParams = await params;
  const lang = resolvedParams?.lang === "en" ? "en" : "zh";
  const dict = await getDictionary(lang);

  return (
    <>
      <HtmlLangUpdater lang={lang} />
      <Navbar lang={lang} dict={dict} />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="border-t border-gray-100 py-5 text-center text-sm text-gray-400">
        <Link href={`/${lang}/terms`} className="hover:text-gray-600 transition-colors">
          {lang === "zh" ? "服务条款" : "Terms of Service"}
        </Link>
      </footer>
    </>
  );
}
