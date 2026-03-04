"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, User } from 'lucide-react';
import { useState } from 'react';
import en from '@/dictionaries/en.json';
import zh from '@/dictionaries/zh.json';
import GuideModal from './GuideModal';

export default function Navbar({ lang, dict }: { lang: string; dict: any }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const pathname = usePathname();
  const pathLang = pathname?.split('/')[1];
  const currentLang = pathLang === 'en' || pathLang === 'zh' ? pathLang : lang;
  const uiDict = currentLang === 'en' ? en : zh;

  const navLinks = [
    { name: uiDict?.nav?.home, href: `/${currentLang}` },
    { name: uiDict?.nav?.cases, href: `/${currentLang}/cases` },
    { name: uiDict?.nav?.community, href: `/${currentLang}/community` },
  ];

  const [brandMain, brandSub] = String(uiDict?.slogan ?? '')
    .split(/[|｜]/)
    .map((part) => part.trim());

  function switchLang() {
    const path = window.location.pathname;
    const segments = path.split('/');
    if (segments[1] === 'zh') {
      segments[1] = 'en';
    } else if (segments[1] === 'en') {
      segments[1] = 'zh';
    } else {
      segments.splice(1, 0, currentLang === 'zh' ? 'en' : 'zh');
    }
    window.location.href = segments.join('/') || '/';
  }

  const NavLinks = () => (
    <>
      {navLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== `/${currentLang}` && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-[15px] font-medium transition-all relative py-2 ${
              isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {link.name}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </>
  );

  const RightButtons = ({ showHelp }: { showHelp?: boolean }) => (
    <div className="flex items-center gap-2">
      {showHelp && (
        <>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            <HelpCircle size={18} />
            {uiDict?.historyBtn}
          </button>
          <div className="h-6 w-[1px] bg-gray-100 mx-1" />
        </>
      )}
      <button
        onClick={switchLang}
        className="w-10 h-10 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors uppercase"
      >
        {currentLang === 'zh' ? 'EN' : '中文'}
      </button>
      <button className="w-10 h-10 bg-gray-900 flex items-center justify-center rounded-xl text-white hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
        <User size={20} />
      </button>
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-[1440px] mx-auto px-6">

        {/* ── 手机端：两行布局 ── */}
        <div className="flex flex-col md:hidden">
          {/* 第一行：Logo + 右侧按钮 */}
          <div className="flex items-center justify-between h-14">
            <Link href={`/${currentLang}`} className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform text-sm">
                T
              </div>
              <span className="text-base font-bold text-gray-900">
                {brandMain || dict?.slogan}
              </span>
            </Link>
            <RightButtons showHelp={false} />
          </div>

          {/* 第二行：导航链接 */}
          <nav className="flex items-center justify-center gap-8 pb-2 border-t border-gray-50 pt-2">
            <NavLinks />
          </nav>
        </div>

        {/* ── 桌面端：单行布局（原有样式） ── */}
        <div className="hidden md:flex items-center justify-center h-20 relative">
          {/* 左侧 Logo */}
          <div className="absolute left-0">
            <Link href={`/${currentLang}`} className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                T
              </div>
              <span className="text-xl font-bold text-gray-900">
                {brandMain || dict?.slogan}
                {brandSub && (
                  <>
                    <span className="text-gray-300 font-light mx-1">|</span>
                    <span className="text-gray-500 font-medium">{brandSub}</span>
                  </>
                )}
              </span>
            </Link>
          </div>

          {/* 中间导航 */}
          <nav className="flex items-center gap-10">
            <NavLinks />
          </nav>

          {/* 右侧功能区 */}
          <div className="absolute right-0">
            <RightButtons showHelp={true} />
          </div>
        </div>

      </div>

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        dict={uiDict}
      />
    </header>
  );
}
