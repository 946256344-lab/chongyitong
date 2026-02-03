import type { Metadata } from 'next';
import { getDictionary } from '../dictionaries';
import MainForm from '@/components/MainForm';

type Props = {
  params: Promise<{ lang: 'en' | 'zh' }>;
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

  return {
    applicationName: '宠医通 | 决策助手',
    title: {
      default: seo.title,
      template: '%s | 宠医通',
    },
    description: seo.description,
    authors: [{ name: '宠医通团队', url: BASE_URL }],
    creator: '宠医通团队',
    publisher: '宠医通',
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
      siteName: '宠医通',
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

  return <MainForm dict={dict} lang={lang} />;
}
