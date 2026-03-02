import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account/', '/analysis/', '/counseling/', '/subscription/', '/payment/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
