import 'server-only' // 确保这部分代码只在服务端运行

const dictionaries = {
  en: () => import('../dictionaries/en.json').then((module) => module.default),
  zh: () => import('../dictionaries/zh.json').then((module) => module.default),
  hi: () => import('../dictionaries/hi.json').then((module) => module.default),
}

// 定义类型，方便写代码时有提示
export type Dictionary = Awaited<ReturnType<typeof dictionaries.zh>>

export const getDictionary = async (locale: 'en' | 'zh' | 'hi') => dictionaries[locale]()