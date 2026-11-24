import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock3,
  EyeOff,
  MessageSquare,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import SEO from '../components/SEO';
import './CustomerReviews.css';

const REVIEW_STATUSES = ['pending', 'published', 'hidden'];

const formatReviewDate = (value) => {
  if (!value) return 'Just now';

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getReviewElementId = (reviewId) =>
  `customer-review-${String(reviewId).replace(/[^a-zA-Z0-9_-]/g, '')}`;

const getReviewProductId = (review) => {
  const productId =
    review.productId ?? review.products?.[0]?.id ?? review.products?.[0]?.productId;

  return productId === undefined || productId === null
    ? ''
    : String(productId).trim();
};

const getReviewProductName = (review) => {
  if (review.productName) return review.productName;

  const products = Array.isArray(review.products) ? review.products : [];

  if (products.length === 1) {
    return products[0]?.name || review.productSummary || 'Order product';
  }

  return review.productSummary ||
    (products.length > 1
      ? `${products.length} products (legacy order review)`
      : 'Order products');
};

function CustomerReviews() {
  const location = useLocation();
  const relatedDocumentId = location.state?.relatedDocumentId;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [highlightedReviewId, setHighlightedReviewId] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'customerReviews'),
      (snapshot) => {
        const reviewList = snapshot.docs.map((reviewDoc) => ({
          id: reviewDoc.id,
          ...reviewDoc.data(),
        }));

        reviewList.sort(
          (first, second) =>
            (second.createdAt?.toMillis?.() || 0) -
            (first.createdAt?.toMillis?.() || 0)
        );

        setReviews(reviewList);
        setLoading(false);
      },
      (error) => {
        console.error('Customer review loading error:', error);
        toast.error('Unable to load customer reviews.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (
      !relatedDocumentId ||
      loading ||
      highlightedReviewId === relatedDocumentId ||
      !reviews.some((review) => review.id === relatedDocumentId)
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setSearchTerm('');
      setStatusFilter('all');
      setHighlightedReviewId(relatedDocumentId);
      document
        .getElementById(getReviewElementId(relatedDocumentId))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightedReviewId, loading, relatedDocumentId, reviews]);

  const filteredReviews = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (review.status || 'pending') === statusFilter;
      const matchesSearch =
        !search ||
        [
          review.orderReference,
          review.customerName,
          review.customerEmail,
          review.productId,
          review.productName,
          review.productSummary,
          ...(Array.isArray(review.products)
            ? review.products.map((product) => product?.name)
            : []),
          review.review,
        ].some((value) => String(value || '').toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [reviews, searchTerm, statusFilter]);

  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) /
      reviews.length
    : 0;
  const pendingCount = reviews.filter((review) => review.status === 'pending').length;
  const publishedCount = reviews.filter(
    (review) => review.status === 'published'
  ).length;
  const fiveStarCount = reviews.filter((review) => review.rating === 5).length;

  const updateReviewStatus = async (review, status) => {
    if (!REVIEW_STATUSES.includes(status) || review.status === status) return;

    try {
      setUpdatingId(review.id);

      const updates = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === 'published') {
        const hasLinkedProducts =
          Array.isArray(review.products) &&
          review.products.length > 0 &&
          review.products.every((product) => {
            const productId = product?.id ?? product?.productId;
            return productId !== undefined && productId !== null && String(productId).trim();
          });

        if (!hasLinkedProducts) {
          const orderDocumentId = review.orderId || review.id;
          const orderSnapshot = await getDoc(doc(db, 'orders', orderDocumentId));

          if (!orderSnapshot.exists()) {
            throw new Error('REVIEW_ORDER_NOT_FOUND');
          }

          const orderProducts = orderSnapshot.data().products;
          const hasOrderProductIds =
            Array.isArray(orderProducts) &&
            orderProducts.length > 0 &&
            orderProducts.every((product) => {
              const productId = product?.id ?? product?.productId;
              return productId !== undefined && productId !== null && String(productId).trim();
            });

          if (!hasOrderProductIds) {
            throw new Error('REVIEW_PRODUCTS_NOT_FOUND');
          }

          updates.products = orderProducts;
        }
      }

      await updateDoc(doc(db, 'customerReviews', review.id), updates);

      toast.success(`Review marked as ${status}.`);
    } catch (error) {
      console.error('Review status update error:', error);
      toast.error(
        error.message === 'REVIEW_ORDER_NOT_FOUND' ||
          error.message === 'REVIEW_PRODUCTS_NOT_FOUND'
          ? 'This review cannot be published because its order product IDs could not be verified.'
          : 'Unable to update this review.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const removeReview = async (review) => {
    const confirmed = window.confirm(
      `Delete the review for ${getReviewProductName(review)} in order ${review.orderReference || review.orderId || review.id}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(review.id);
      await deleteDoc(doc(db, 'customerReviews', review.id));
      toast.success('Customer review deleted.');
    } catch (error) {
      console.error('Review deletion error:', error);
      toast.error('Unable to delete this review.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="customer-reviews-admin">
      <SEO
        title="Customer Reviews | MAISON Admin"
        description="Review and manage verified MAISON customer order feedback."
        robots="noindex, nofollow"
      />

      <header className="reviews-admin-header">
        <div>
          <span>MAISON / ADMIN / CUSTOMER REVIEWS</span>
          <h1>Customer Reviews</h1>
          <p>Manage verified feedback from delivered customer orders.</p>
        </div>
        <div className="reviews-admin-header-icon">
          <MessageSquare size={24} />
        </div>
      </header>

      <section className="reviews-summary-grid" aria-label="Review summary">
        <article>
          <MessageSquare size={20} />
          <div><span>Total reviews</span><strong>{reviews.length}</strong></div>
        </article>
        <article>
          <Star size={20} />
          <div><span>Average rating</span><strong>{averageRating.toFixed(1)}</strong></div>
        </article>
        <article>
          <Clock3 size={20} />
          <div><span>Pending review</span><strong>{pendingCount}</strong></div>
        </article>
        <article>
          <CheckCircle2 size={20} />
          <div><span>Published</span><strong>{publishedCount}</strong></div>
        </article>
        <article>
          <Star size={20} />
          <div><span>Five-star reviews</span><strong>{fiveStarCount}</strong></div>
        </article>
      </section>

      <section className="reviews-admin-toolbar">
        <label className="reviews-search">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, order or review"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter reviews by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
      </section>

      {loading ? (
        <section className="reviews-admin-empty">
          <Clock3 size={34} />
          <h2>Loading customer reviews...</h2>
        </section>
      ) : filteredReviews.length === 0 ? (
        <section className="reviews-admin-empty">
          <MessageSquare size={34} />
          <h2>No reviews found</h2>
          <p>Verified feedback will appear after customers review delivered orders.</p>
        </section>
      ) : (
        <section className="reviews-admin-list">
          {filteredReviews.map((review) => (
            <article
              className={`review-admin-card ${
                highlightedReviewId === review.id
                  ? 'notification-highlight'
                  : ''
              }`}
              id={getReviewElementId(review.id)}
              key={review.id}
            >
              <div className="review-admin-card-top">
                <div>
                  <span>
                    {review.productId ? 'VERIFIED PRODUCT REVIEW' : 'LEGACY ORDER REVIEW'}
                  </span>
                  <h2>{getReviewProductName(review)}</h2>
                  <small>
                    Order {review.orderReference || review.orderId} ·{' '}
                    {formatReviewDate(review.createdAt)}
                  </small>
                </div>

                <select
                  className={`review-status-select ${review.status || 'pending'}`}
                  value={review.status || 'pending'}
                  onChange={(event) => updateReviewStatus(review, event.target.value)}
                  disabled={updatingId === review.id}
                  aria-label={`Status for ${getReviewProductName(review)} review`}
                >
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="review-admin-rating" aria-label={`${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={19}
                    fill={star <= review.rating ? 'currentColor' : 'none'}
                  />
                ))}
                <strong>{review.rating}/5</strong>
              </div>

              <blockquote>{review.review}</blockquote>

              <div className="review-admin-meta">
                <div><span>CUSTOMER</span><strong>{review.customerName}</strong><small>{review.customerEmail}</small></div>
                <div>
                  <span>PRODUCT</span>
                  <strong>{getReviewProductName(review)}</strong>
                  {getReviewProductId(review) && (
                    <small>ID: {getReviewProductId(review)}</small>
                  )}
                </div>
                <div><span>ORDER VALUE</span><strong>₹{Number(review.orderTotal || 0).toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="review-admin-actions">
                <button
                  type="button"
                  onClick={() => updateReviewStatus(
                    review,
                    review.status === 'hidden' ? 'published' : 'hidden'
                  )}
                  disabled={updatingId === review.id}
                >
                  {review.status === 'hidden' ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                  {review.status === 'hidden' ? 'Publish Review' : 'Hide Review'}
                </button>
                <button
                  type="button"
                  className="review-delete-button"
                  onClick={() => removeReview(review)}
                  disabled={deletingId === review.id}
                >
                  <Trash2 size={16} />
                  {deletingId === review.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default CustomerReviews;
