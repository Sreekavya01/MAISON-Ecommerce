import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import PublishedReviewsContext from '../context/PublishedReviewsContext';
import { db } from '../firebase';

const getProductId = (product) => {
  const productId = product?.id ?? product?.productId;

  return productId === undefined || productId === null
    ? ''
    : String(productId).trim();
};

const getCreatedAtMillis = (review) => {
  if (typeof review.createdAt?.toMillis === 'function') {
    return review.createdAt.toMillis();
  }

  const date = new Date(review.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const normalizePublishedReview = (reviewDoc) => {
  const data = reviewDoc.data();
  const rating = Number(data.rating);
  const review = typeof data.review === 'string' ? data.review.trim() : '';
  const customerName =
    typeof data.customerName === 'string' ? data.customerName.trim() : '';
  const products = Array.isArray(data.products) ? data.products : [];
  const explicitProductId = getProductId({ productId: data.productId });
  const productIds = explicitProductId
    ? [explicitProductId]
    : [...new Set(products.map(getProductId).filter(Boolean))];

  if (
    data.status !== 'published' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !review ||
    !customerName ||
    ['customer', 'maison customer'].includes(customerName.toLowerCase()) ||
    productIds.length === 0
  ) {
    return null;
  }

  return {
    ...data,
    id: reviewDoc.id,
    customerName,
    productIds,
    rating,
    review,
  };
};

function PublishedReviewsProvider({ children }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const publishedReviewsQuery = query(
      collection(db, 'customerReviews'),
      where('status', '==', 'published')
    );

    return onSnapshot(
      publishedReviewsQuery,
      (snapshot) => {
        const verifiedReviews = snapshot.docs
          .map(normalizePublishedReview)
          .filter(Boolean)
          .sort(
            (first, second) =>
              getCreatedAtMillis(second) - getCreatedAtMillis(first)
          );

        setReviews(verifiedReviews);
        setError(null);
        setLoading(false);
      },
      (firebaseError) => {
        console.error('Published customer reviews loading error:', firebaseError);
        setReviews([]);
        setError(firebaseError);
        setLoading(false);
      }
    );
  }, []);

  const reviewsByProduct = useMemo(() => {
    const reviewMap = new Map();

    reviews.forEach((review) => {
      review.productIds.forEach((productId) => {
        const currentReviews = reviewMap.get(productId) || [];
        reviewMap.set(productId, [...currentReviews, review]);
      });
    });

    return reviewMap;
  }, [reviews]);

  const summariesByProduct = useMemo(() => {
    const summaryMap = new Map();

    reviewsByProduct.forEach((productReviews, productId) => {
      const reviewCount = productReviews.length;
      const totalRating = productReviews.reduce(
        (total, review) => total + review.rating,
        0
      );

      summaryMap.set(productId, {
        averageRating: reviewCount > 0 ? totalRating / reviewCount : null,
        reviewCount,
      });
    });

    return summaryMap;
  }, [reviewsByProduct]);

  const getProductReviews = useCallback(
    (productId) => reviewsByProduct.get(String(productId)) || [],
    [reviewsByProduct]
  );

  const getProductReviewSummary = useCallback(
    (productId) =>
      summariesByProduct.get(String(productId)) || {
        averageRating: null,
        reviewCount: 0,
      },
    [summariesByProduct]
  );

  const contextValue = useMemo(
    () => ({
      error,
      getProductReviews,
      getProductReviewSummary,
      loading,
    }),
    [error, getProductReviews, getProductReviewSummary, loading]
  );

  return (
    <PublishedReviewsContext.Provider value={contextValue}>
      {children}
    </PublishedReviewsContext.Provider>
  );
}

export default PublishedReviewsProvider;
