import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://severepetcondition.site';
const LANGS = ['zh', 'en', 'hi'] as const;

function getSlugs(section: 'cases' | 'community'): string[] {
  // Collect slugs from zh folder (authoritative list; en should mirror it)
  const dir = path.join(process.cwd(), 'content', section, 'zh');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // ─── Home pages ───────────────────────────────────────────────
  entries.push({
    url: `${BASE_URL}/zh`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages: { 'en-US': `${BASE_URL}/en`, 'hi-IN': `${BASE_URL}/hi` } },
  });
  entries.push({
    url: `${BASE_URL}/en`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages: { 'zh-CN': `${BASE_URL}/zh`, 'hi-IN': `${BASE_URL}/hi` } },
  });
  entries.push({
    url: `${BASE_URL}/hi`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 1,
    alternates: { languages: { 'zh-CN': `${BASE_URL}/zh`, 'en-US': `${BASE_URL}/en` } },
  });

  // ─── Cases list pages ─────────────────────────────────────────
  for (const lang of LANGS) {
    entries.push({
      url: `${BASE_URL}/${lang}/cases`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/cases`,
          'en-US': `${BASE_URL}/en/cases`,
          'hi-IN': `${BASE_URL}/hi/cases`,
        },
      },
    });
  }

  // ─── Case detail pages ────────────────────────────────────────
  const caseSlugs = getSlugs('cases');
  for (const slug of caseSlugs) {
    entries.push({
      url: `${BASE_URL}/zh/cases/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: { 'en-US': `${BASE_URL}/en/cases/${slug}` } },
    });
    entries.push({
      url: `${BASE_URL}/en/cases/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: { languages: { 'zh-CN': `${BASE_URL}/zh/cases/${slug}` } },
    });
  }

  // ─── Community list pages ─────────────────────────────────────
  for (const lang of LANGS) {
    entries.push({
      url: `${BASE_URL}/${lang}/community`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/community`,
          'en-US': `${BASE_URL}/en/community`,
          'hi-IN': `${BASE_URL}/hi/community`,
        },
      },
    });
  }

  // ─── Community detail pages ───────────────────────────────────
  const communitySlugs = getSlugs('community');
  for (const slug of communitySlugs) {
    entries.push({
      url: `${BASE_URL}/zh/community/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: { 'en-US': `${BASE_URL}/en/community/${slug}` } },
    });
    entries.push({
      url: `${BASE_URL}/en/community/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: { 'zh-CN': `${BASE_URL}/zh/community/${slug}` } },
    });
  }

  // ─── Terms pages ──────────────────────────────────────────────
  for (const lang of LANGS) {
    entries.push({
      url: `${BASE_URL}/${lang}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          'zh-CN': `${BASE_URL}/zh/terms`,
          'en-US': `${BASE_URL}/en/terms`,
          'hi-IN': `${BASE_URL}/hi/terms`,
        },
      },
    });
  }

  return entries;
}
