import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. 导入 Script 组件 (保留你原有的)
import Script from 'next/script';
// 2. 导入新写的导航组件 (新增)
import Link from 'next/link';
import { getDictionary } from "./dictionaries"; // 确保路径正确
import Navbar from "@/components/Navbar";
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

// 3. 注意这里：增加了 async 和 params 参数，为了获取当前语言
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>; // 定义 params 类型
}>) {
  // 等待参数解析 (Next.js 15 标准写法)
  const resolvedParams = await params;
  const lang = resolvedParams?.lang || 'zh'; // 如果获取不到，默认用中文
  const dict = await getDictionary(lang as 'en' | 'zh');
  return (
    <html lang={lang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8f9fc] min-h-screen flex flex-col`}
      >
        {/* --- 4. 插入导航栏 (它会固定在顶部) --- */}
      <Navbar lang={lang} dict={dict} />

        {/* --- 页面主体内容 (自动填充其余空间) --- */}
        <main className="flex-grow">
          {children}
        </main>

        {/* --- 页脚 --- */}
        <footer className="border-t border-gray-100 py-5 text-center text-sm text-gray-400">
          <Link href={`/${lang}/terms`} className="hover:text-gray-600 transition-colors">
            {lang === 'zh' ? '服务条款' : 'Terms of Service'}
          </Link>
        </footer>

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