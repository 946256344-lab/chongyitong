import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getDictionary } from '../dictionaries';
import MainForm from '@/components/MainForm';

export type FeaturedCase = {
  slug: string;
  title: string;
  description: string;
  category: string;
};

type Props = {
  params: Promise<{ lang: 'en' | 'zh' | 'hi' }>;
};

const BASE_URL = 'https://severepetcondition.site';

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const seo = dict.seo || {
    title: dict.slogan || '宠医通 | 决策助手',
    description:
      dict.subSlogan ||
      '看懂宠物医疗报告，理性评估治疗选择，安心与兽医沟通。',
    keywords: ['宠物医疗', '宠物健康', '兽医咨询'],
  };

  const appName = lang === 'zh' ? '宠医通 | 决策助手' : 'VetDecide AI | Decision Assistant';
  const teamName = lang === 'zh' ? '宠医通团队' : 'VetDecide AI Team';
  const siteName = lang === 'zh' ? '宠医通' : 'VetDecide AI';

  return {
    applicationName: appName,
    title: {
      default: seo.title,
      template: `%s | ${siteName}`,
    },
    description: seo.description,
    authors: [{ name: teamName, url: BASE_URL }],
    creator: teamName,
    publisher: siteName,
    keywords: seo.keywords,
    icons: {
      icon: '/favicon.ico',
    },
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `/${lang}`,
      languages: {
        'zh-CN': '/zh',
        'en-US': '/en',
      },
    },
    openGraph: {
      type: 'website',
      url: `/${lang}`,
      title: seo.title,
      description: seo.description,
      siteName: siteName,
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const basePath = path.join(process.cwd(), 'content/cases');
  const localizedPath = path.join(basePath, lang);
  const contentPath = fs.existsSync(localizedPath) ? localizedPath : basePath;

  const featuredCases: FeaturedCase[] = fs
    .readdirSync(contentPath)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .slice(0, 2)
    .map((fileName) => {
      const slug = fileName.replace('.md', '');
      const { data } = matter(fs.readFileSync(path.join(contentPath, fileName), 'utf8'));
      return {
        slug,
        title: data.title ?? '',
        description: data.description ?? '',
        category: data.category ?? '',
      };
    });

  return <MainForm dict={dict} lang={lang} featuredCases={featuredCases} />;
}
