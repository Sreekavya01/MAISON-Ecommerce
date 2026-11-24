import { Star } from 'lucide-react';

import usePublishedReviews from '../hooks/usePublishedReviews';
import './ProductRating.css';

function ProductRating({
  className = '',
  linkToReviews = false,
  productId,
  size = 'default',
}) {
  const { error, getProductReviewSummary, loading } = usePublishedReviews();
  const { averageRating, reviewCount } = getProductReviewSummary(productId);
  const classes = [
    'verified-product-rating',
    `verified-product-rating--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <div className={`${classes} is-loading`} aria-live="polite">
        Loading reviews…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${classes} is-empty`}>
        Reviews unavailable
      </div>
    );
  }

  if (reviewCount === 0) {
    return <div className={`${classes} is-empty`}>No reviews yet</div>;
  }

  const roundedRating = Math.round(averageRating);
  const label = `${averageRating.toFixed(1)} out of 5 stars from ${reviewCount} ${
    reviewCount === 1 ? 'review' : 'reviews'
  }`;
  const content = (
    <>
      <span className="verified-rating-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            fill={star <= roundedRating ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <strong>{averageRating.toFixed(1)}</strong>
      <span>
        {reviewCount.toLocaleString('en-IN')}{' '}
        {reviewCount === 1 ? 'review' : 'reviews'}
      </span>
    </>
  );

  if (linkToReviews) {
    return (
      <a className={classes} href="#product-reviews" aria-label={label}>
        {content}
      </a>
    );
  }

  return (
    <div className={classes} aria-label={label}>
      {content}
    </div>
  );
}

export default ProductRating;
