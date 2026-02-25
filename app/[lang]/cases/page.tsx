import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { getDictionary } from '../../dictionaries';
import { Calendar, ChevronRight } from 'lucide-react';

export default async function CasesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en' | 'zh');

    const baseContentPath = path.join(process.cwd(), 'content/cases');
  const localizedContentPath = path.join(baseContentPath, lang);
  const contentPath = fs.existsSync(localizedContentPath) ? localizedContentPath : baseContentPath;
  if (!fs.existsSync(contentPath)) fs.mkdirSync(contentPath, { recursive: true });

  const files = fs.readdirSync(contentPath).filter((fileName) => fileName.endsWith('.md'));

  const posts = files.map((fileName) => {
    const slug = fileName.replace('.md', '');
    const fileContent = fs.readFileSync(path.join(contentPath, fileName), 'utf8');
    const { data } = matter(fileContent);
    return { slug, ...data } as any;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    // 关键修复：强制设置背景色 bg-[#f8f9fc] 和文字颜色 text-gray-900，防止被深色模式覆盖
    <main className="min-h-screen bg-[#f8f9fc] text-gray-900 pt-44 pb-20 px-6">
      <div className="max-w-[900px] mx-auto">
        
        {/* 标题区 */}
        <div className="text-center mb-16">
         <h1 className="text-4xl font-extrabold text-[#2d334a] mb-4 tracking-tight">{dict.cases.title}</h1>
<p className="text-gray-400 text-lg">{dict.cases.subtitle}</p>


        </div>

        {/* 列表容器 */}
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/${lang}/cases/${post.slug}`} className="block group">
              <div className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white group-hover:border-blue-500/20 group-hover:shadow-xl transition-all duration-500 flex items-center justify-between">
                
                {/* 左侧内容区 */}
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                     {post.category || dict.cases.categoryDefault}

                    </span>
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      <Calendar size={14} />
                      <span>{post.date}</span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-[#2d334a] mb-3 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-400 leading-relaxed line-clamp-2 text-base">
                    {post.description}
                  </p>
                </div>

                {/* 右侧圆形按钮 */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <ChevronRight size={20} strokeWidth={3} />
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
