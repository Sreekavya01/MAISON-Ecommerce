import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebase';

const RECENTLY_VIEWED_STORAGE_KEY = 'maison-recently-viewed';
const RECENTLY_VIEWED_LIMIT = 10;

const normalizeProduct = (product, viewedAtMs = Date.now()) => {
  const entry = {
    id: product.id,
    name: product.name || 'MAISON product',
    category: product.category || 'MAISON Collection',
    price: Number(product.price) || 0,
    image:
      product.image ||
      product.priorityImage ||
      product.imageUrl ||
      product.images?.[0] ||
      '',
    rating: Number(product.rating) || 0,
    reviews: Number(product.reviews) || 0,
    stock: Number(product.stock) || 0,
    viewedAtMs,
  };

  const originalPrice = Number(
    product.originalPrice || product.compareAtPrice
  );

  if (originalPrice > entry.price) {
    entry.originalPrice = originalPrice;
  }

  const discount = Number(product.discount || product.discountPercentage);

  if (discount > 0) {
    entry.discount = discount;
  }

  return entry;
};

const sortAndLimit = (items) => {
  const uniqueItems = new Map();

  items.forEach((item) => {
    if (item?.id === undefined || item?.id === null) return;

    const key = String(item.id);
    const previous = uniqueItems.get(key);
    const viewedAtMs = Number(item.viewedAtMs) || 0;

    if (!previous || viewedAtMs > (Number(previous.viewedAtMs) || 0)) {
      uniqueItems.set(key, normalizeProduct(item, viewedAtMs));
    }
  });

  return [...uniqueItems.values()]
    .sort((a, b) => b.viewedAtMs - a.viewedAtMs)
    .slice(0, RECENTLY_VIEWED_LIMIT);
};

export const getLocalRecentlyViewed = () => {
  try {
    const storedItems = JSON.parse(
      localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)
    );

    return Array.isArray(storedItems) ? sortAndLimit(storedItems) : [];
  } catch {
    return [];
  }
};

const saveLocalRecentlyViewed = (items) => {
  localStorage.setItem(
    RECENTLY_VIEWED_STORAGE_KEY,
    JSON.stringify(sortAndLimit(items))
  );
};

export const recordRecentlyViewed = async (product) => {
  if (!product?.id) return;

  const entry = normalizeProduct(product);
  saveLocalRecentlyViewed([entry, ...getLocalRecentlyViewed()]);

  const user = auth.currentUser;

  if (!user) return;

  try {
    await setDoc(
      doc(
        db,
        'users',
        user.uid,
        'recentlyViewed',
        String(product.id)
      ),
      {
        ...entry,
        viewedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Recently viewed save error:', error);
  }
};

export const loadRecentlyViewed = async (user = auth.currentUser) => {
  const localItems = getLocalRecentlyViewed();

  if (!user) return localItems;

  try {
    const snapshot = await getDocs(
      collection(db, 'users', user.uid, 'recentlyViewed')
    );

    const remoteItems = snapshot.docs.map((recentDocument) => ({
      ...recentDocument.data(),
      id: recentDocument.id,
    }));

    const mergedItems = sortAndLimit([...localItems, ...remoteItems]);
    saveLocalRecentlyViewed(mergedItems);

    await Promise.all(
      mergedItems.map((item) =>
        setDoc(
          doc(
            db,
            'users',
            user.uid,
            'recentlyViewed',
            String(item.id)
          ),
          item,
          { merge: true }
        )
      )
    );

    return mergedItems;
  } catch (error) {
    console.error('Recently viewed loading error:', error);
    return localItems;
  }
};

export { RECENTLY_VIEWED_LIMIT };
