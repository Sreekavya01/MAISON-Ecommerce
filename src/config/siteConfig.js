const cleanValue = (value) => String(value || '').trim();

const parseNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseReviews = (value) => {
  if (!value) return [];

  try {
    const reviews = JSON.parse(value);
    return Array.isArray(reviews) ? reviews : [];
  } catch (error) {
    console.warn('VITE_GOOGLE_REVIEWS_JSON must contain a valid JSON array.', error);
    return [];
  }
};

const siteConfig = {
  brand: {
    name: 'MAISON',
    tagline: 'THE ART OF SHOPPING',
  },

  seo: {
    siteUrl: cleanValue(import.meta.env.VITE_SITE_URL).replace(/\/$/, ''),
    defaultShareImage: cleanValue(import.meta.env.VITE_DEFAULT_SHARE_IMAGE),
  },

  social: {
    instagram: cleanValue(import.meta.env.VITE_INSTAGRAM_URL),
    facebook: cleanValue(import.meta.env.VITE_FACEBOOK_URL),
    youtube: cleanValue(import.meta.env.VITE_YOUTUBE_URL),
    linkedin: cleanValue(import.meta.env.VITE_LINKEDIN_URL),
    medium: cleanValue(import.meta.env.VITE_MEDIUM_URL),
  },

  googleReviews: {
    profileUrl: cleanValue(import.meta.env.VITE_GOOGLE_REVIEWS_URL),
    rating: parseNumber(import.meta.env.VITE_GOOGLE_RATING),
    reviewCount: parseNumber(import.meta.env.VITE_GOOGLE_REVIEW_COUNT),
    reviews: parseReviews(import.meta.env.VITE_GOOGLE_REVIEWS_JSON),
  },

  store: {
    name: cleanValue(import.meta.env.VITE_STORE_NAME) || 'MAISON Store',
    address: cleanValue(import.meta.env.VITE_STORE_ADDRESS),
    hours: cleanValue(import.meta.env.VITE_STORE_HOURS),
    mapsUrl: cleanValue(import.meta.env.VITE_STORE_MAPS_URL),
    mapEmbedUrl: cleanValue(import.meta.env.VITE_STORE_MAP_EMBED_URL),
  },
};

export default siteConfig;
