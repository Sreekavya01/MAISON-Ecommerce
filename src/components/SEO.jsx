import { useEffect } from 'react';
import siteConfig from '../config/siteConfig';

function SEO({
  title,
  description,
  robots = 'index, follow',
  image = siteConfig.seo.defaultShareImage,
  type = 'website',
  canonicalPath,
  structuredData,
}) {
  useEffect(() => {
    document.title = title;

    const updateMeta = (name, content, attribute = 'name') => {
      let tag = document.querySelector(
        `meta[${attribute}="${name}"]`
      );

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    };

    const removeMeta = (name, attribute = 'name') => {
      document.querySelector(`meta[${attribute}="${name}"]`)?.remove();
    };

    const origin = siteConfig.seo.siteUrl || window.location.origin;
    const pathname = canonicalPath || window.location.pathname;
    const canonicalUrl = new URL(pathname, `${origin}/`).toString();
    const imageUrl = image
      ? new URL(image, `${origin}/`).toString()
      : '';

    updateMeta('description', description);
    updateMeta('robots', robots);

    updateMeta('og:type', type, 'property');
    updateMeta('og:site_name', siteConfig.brand.name, 'property');
    updateMeta('og:title', title, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:url', canonicalUrl, 'property');

    updateMeta('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);

    if (imageUrl) {
      updateMeta('og:image', imageUrl, 'property');
      updateMeta('twitter:image', imageUrl);
    } else {
      removeMeta('og:image', 'property');
      removeMeta('twitter:image');
    }

    let canonical = document.querySelector('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', canonicalUrl);

    const socialProfiles = Object.values(siteConfig.social).filter(Boolean);
    const schema = structuredData || {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.brand.name,
      url: `${origin}/`,
      ...(socialProfiles.length > 0 ? { sameAs: socialProfiles } : {}),
    };

    let schemaTag = document.querySelector('script[data-maison-seo]');

    if (!schemaTag) {
      schemaTag = document.createElement('script');
      schemaTag.type = 'application/ld+json';
      schemaTag.dataset.maisonSeo = 'true';
      document.head.appendChild(schemaTag);
    }

    schemaTag.textContent = JSON.stringify(schema);

  }, [title, description, robots, image, type, canonicalPath, structuredData]);

  return null;
}

export default SEO;
