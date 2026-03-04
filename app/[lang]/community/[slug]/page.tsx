import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import type { Metadata } from 'next';
import { getDictionary } from '../../../dictionaries';

const BASE_URL = 'https://severepetcondition.site';

function getCommunityData(lang: string, slug: string) {
  const baseFilePath = path.join(process.cwd(), 'content/community', `${slug}.md`);
  const localizedFilePath = path.join(process.cwd(), 'content/community', lang, `${slug}.md`);
  const filePath = fs.existsSync(localizedFilePath) ? localizedFilePath : baseFilePath;
  if (!fs.existsSync(filePath)) return null;
  const { data } = matter(fs.readFileSync(filePath, 'utf8'));
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const data = getCommunityData(lang, slug);
  if (!data) return {};

  const title = data.title || '';
  const description = data.description || '';
  const canonical = `/${lang}/community/${slug}`;
  const altLang = lang === 'zh' ? 'en' : 'zh';

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical,
      languages: {
        [lang === 'zh' ? 'zh-CN' : 'en-US']: canonical,
        [altLang === 'zh' ? 'zh-CN' : 'en-US']: `/${altLang}/community/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      siteName: lang === 'zh' ? '宠医通' : 'Pet Med-Pal',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      publishedTime: data.date,
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CommunityDetail({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const dict = await getDictionary(lang as 'en' | 'zh');

  const baseFilePath = path.join(process.cwd(), 'content/community', `${slug}.md`);
  const localizedFilePath = path.join(process.cwd(), 'content/community', lang, `${slug}.md`);
  const filePath = fs.existsSync(localizedFilePath) ? localizedFilePath : baseFilePath;

  if (!fs.existsSync(filePath)) return <div className="pt-40 text-center">{dict.community.notFound}</div>;

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const htmlContent = marked(content);

  return (
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
