import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "宠医通 | Pet Med-Pal",
    template: "%s | 宠医通",
  },
  description: "看懂宠物医疗报告，理性评估治疗选择，安心与兽医沟通。",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "宠医通 Pet Med-Pal",
  url: "https://severepetcondition.site",
  description:
    "帮助宠物主人看懂医疗报告、理性评估治疗选项、与兽医有效沟通的决策工具。",
  inLanguage: ["zh-CN", "en-US"],
  serviceType: "Pet Medical Decision Support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Note: lang attribute is overridden per-language via [lang]/layout.tsx template
    // Default "zh" covers majority of traffic
    <html lang="zh">
      <head>
        <script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8f9fc] min-h-screen flex flex-col`}
      >
        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YG4VJ87GL1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YG4VJ87GL1');
          `}
        </Script>
      </body>
    </html>
  );
}
