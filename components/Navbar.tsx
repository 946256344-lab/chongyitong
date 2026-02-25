"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, User } from 'lucide-react';
import { useState } from 'react'; // 新增
import en from '@/dictionaries/en.json';
import zh from '@/dictionaries/zh.json';

import GuideModal from './GuideModal'; // 引入刚才写的组件
export default function Navbar({ lang, dict }: { lang: string; dict: any }) {
    const [isGuideOpen, setIsGuideOpen] = useState(false);
  const pathname = usePathname();
  const pathLang = pathname?.split('/')[1];
  const currentLang = pathLang === 'en' || pathLang === 'zh' ? pathLang : lang;
  const uiDict = currentLang === 'en' ? en : zh;


  // 导航链接配置
   const navLinks = [
    { name: uiDict?.nav?.home, href: `/${currentLang}` },
    { name: uiDict?.nav?.cases, href: `/${currentLang}/cases` },
    { name: uiDict?.nav?.community, href: `/${currentLang}/community` },
  ];
  const [brandMain, brandSub] = String(uiDict?.slogan ?? '')
    .split(/[|｜]/)
    .map((part) => part.trim());



  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-center relative">
        
        {/* 左侧 Logo - 使用 absolute 定位确保不干扰中间菜单居中 */}
        <div className="absolute left-6">
          <Link href={`/${lang}`} className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              T
            </div>
                        <span className="text-xl font-bold text-gray-900 hidden sm:block">
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

        {/* 中间菜单 - 真正居中 */}
        <nav className="flex items-center gap-10">
          {navLinks.map((link) => {
            // 判断当前页面是否激活，增加蓝色小横线逻辑
            const isActive = pathname === link.href || (link.href !== `/${lang}` && pathname.startsWith(link.href));
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
        </nav>

        {/* 右侧功能区 */}
        <div className="absolute right-6 flex items-center gap-4">
          
       
{/* 修改后的使用说明按钮：去掉 Link，改用 button */}
        <button 
          onClick={() => setIsGuideOpen(true)}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-50/50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-50 transition-colors"
        >
                  <HelpCircle size={18} />
                   {uiDict?.historyBtn}


        </button>
          <div className="h-6 w-[1px] bg-gray-100 mx-2 hidden sm:block" />

          <div className="flex items-center gap-3">
            {/* 动态切换语言按钮 */}
<button 
 onClick={() => {
  // 1. 获取当前路径，例如 "/zh/cases" 或 "/en"
  const path = window.location.pathname;
  const segments = path.split('/');

  // 2. 这里的核心逻辑是：如果第二个片段是 'zh'，就换成 'en'；反之亦然
  // segments[0] 通常是一个空字符串（因为路径以 / 开头）
  if (segments[1] === 'zh') {
    segments[1] = 'en';
  } else if (segments[1] === 'en') {
    segments[1] = 'zh';
  } else {
    // 3. 安全兜底：如果路径里没带语言前缀（比如直接访问根目录），则补上相反的语言
       segments.splice(1, 0, currentLang === 'zh' ? 'en' : 'zh');

  }

  // 4. 重新组合并跳转
  window.location.href = segments.join('/') || '/';
}}
  className="w-10 h-10 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors uppercase"
>
   {currentLang === 'zh' ? 'EN' : '中文'}

</button>
             <button className="w-10 h-10 bg-gray-900 flex items-center justify-center rounded-xl text-white hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
               <User size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* 放置弹窗组件 */}
    <GuideModal 
  isOpen={isGuideOpen} 
  onClose={() => setIsGuideOpen(false)} 
  dict={uiDict} 
/>

    </header>
  );
}