import { useContext } from 'react';

import PublishedReviewsContext from '../context/PublishedReviewsContext';

function usePublishedReviews() {
  const context = useContext(PublishedReviewsContext);

  if (!context) {
    throw new Error(
      'usePublishedReviews must be used inside PublishedReviewsProvider.'
    );
  }

  return context;
}

export default usePublishedReviews;
