import { MetadataRoute } from 'next';

const BASE_URL = 'https://severepetcondition.site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/report/', '/zh/report/', '/en/report/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
