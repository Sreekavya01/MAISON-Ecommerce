import { CheckCircle2, MessageSquareQuote, Star } from 'lucide-react';

import usePublishedReviews from '../hooks/usePublishedReviews';
import './ProductReviews.css';

const formatReviewDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

function ProductReviews({ product }) {
  const {
    error,
    getProductReviews,
    getProductReviewSummary,
    loading,
  } = usePublishedReviews();
  const reviews = getProductReviews(product?.id);
  const { averageRating, reviewCount } = getProductReviewSummary(product?.id);

  return (
    <section className="product-customer-reviews" aria-labelledby="customer-reviews-title">
      <header className="product-reviews-heading">
        <div>
          <span>VERIFIED MAISON CUSTOMERS</span>
          <h2 id="customer-reviews-title">Customer Reviews</h2>
          <p>
            Feedback shown here comes only from customers with a delivered
            order containing {product?.name || 'this product'}.
          </p>
        </div>

        {reviewCount > 0 && (
          <div
            className="product-reviews-summary"
            aria-label={`${averageRating.toFixed(1)} out of 5 stars from ${reviewCount} reviews`}
          >
            <strong>{averageRating.toFixed(1)}</strong>
            <span className="product-review-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  fill={star <= Math.round(averageRating) ? 'currentColor' : 'none'}
                />
              ))}
            </span>
            <small>
              {reviewCount.toLocaleString('en-IN')}{' '}
              {reviewCount === 1 ? 'review' : 'reviews'}
            </small>
          </div>
        )}
      </header>

      {loading ? (
        <div className="product-reviews-empty" aria-live="polite">
          <MessageSquareQuote size={30} />
          <h3>Loading customer reviews…</h3>
        </div>
      ) : error ? (
        <div className="product-reviews-empty" role="status">
          <MessageSquareQuote size={30} />
          <h3>Reviews are temporarily unavailable</h3>
          <p>Please try again shortly.</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="product-reviews-empty">
          <MessageSquareQuote size={30} />
          <h3>No reviews yet</h3>
          <p>This product has not received a published customer review.</p>
        </div>
      ) : (
        <div className="product-reviews-list">
          {reviews.map((review) => (
            <article className="product-review-card" key={review.id}>
              <div className="product-review-card-top">
                <div className="product-review-customer">
                  <span aria-hidden="true">
                    {review.customerName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3>{review.customerName}</h3>
                    <small>
                      <CheckCircle2 size={13} /> Verified purchase
                    </small>
                  </div>
                </div>

                <time dateTime={review.createdAt?.toDate?.()?.toISOString?.()}>
                  {formatReviewDate(review.createdAt)}
                </time>
              </div>

              <div
                className="product-review-stars"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    fill={star <= review.rating ? 'currentColor' : 'none'}
                  />
                ))}
              </div>

              {review.review && <p>{review.review}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductReviews;
