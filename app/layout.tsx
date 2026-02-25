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
  title: "宠医通 | 决策助手",
  description: "看懂宠物医疗报告，理性评估治疗选择，安心与兽医沟通。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8f9fc] min-h-screen flex flex-col`}
      >
        {children}

        {/* --- Google Analytics 开始 (保留你的原代码) --- */}
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
        {/* --- Google Analytics 结束 --- */}
      </body>
    </html>
  );
}
