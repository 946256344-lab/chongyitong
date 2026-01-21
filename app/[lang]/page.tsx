import { getDictionary } from '../dictionaries';
import MainForm from '@/components/MainForm';

// 定义 Props 类型，注意 params 现在是一个 Promise
type Props = {
  params: Promise<{ lang: 'en' | 'zh' }>;
};

export default async function Page({ params }: Props) {
  // 1. 必须先 await params 才能拿到里面的 lang
  const { lang } = await params;

  // 2. 现在 lang 是字符串了，可以安全地传给 getDictionary
  const dict = await getDictionary(lang);

  return <MainForm dict={dict} lang={lang} />;
}