import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { getDictionary } from '../../../dictionaries';

export default async function CaseDetail({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const dict = await getDictionary(lang as 'en' | 'zh');

  const filePath = path.join(process.cwd(), 'content/cases', `${slug}.md`);
  if (!fs.existsSync(filePath)) return <div className="pt-40 text-center">文章不存在</div>;

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const htmlContent = marked(content);

  return (
    // 同样强制背景色
    <main className="min-h-screen bg-white text-gray-900 pt-44 pb-20 px-6">
      <article className="max-w-[750px] mx-auto">
        <header className="mb-12">
          <div className="text-blue-600 font-bold mb-4 tracking-widest text-sm uppercase">
            {data.category}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#2d334a] mb-8 leading-tight">
            {data.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-400 text-sm border-b pb-8">
            <span>{data.date}</span>
          </div>
        </header>

        {/* Markdown 正文排版 */}
        <div 
          className="prose prose-slate prose-lg max-w-none 
          prose-headings:text-[#2d334a] prose-headings:font-bold
          prose-p:text-gray-600 prose-p:leading-8
          prose-strong:text-blue-600"
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </article>
    </main>
  );
}