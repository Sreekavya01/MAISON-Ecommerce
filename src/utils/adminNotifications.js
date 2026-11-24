import { doc, serverTimestamp } from 'firebase/firestore';

import { db } from '../firebase';

export const ADMIN_NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  CUSTOMER_REGISTERED: 'customer_registered',
  QUOTATION_REQUESTED: 'quotation_requested',
  BULK_ORDER_REQUESTED: 'bulk_order_requested',
  RETURN_REQUESTED: 'return_requested',
  CONTACT_MESSAGE: 'contact_message',
  QUOTATION_ACCEPTED: 'quotation_accepted',
  QUOTATION_REJECTED: 'quotation_rejected',
  CUSTOMER_REVIEW: 'customer_review',
};

const NOTIFICATION_TITLES = {
  [ADMIN_NOTIFICATION_TYPES.ORDER_PLACED]: 'New Order Received',
  [ADMIN_NOTIFICATION_TYPES.ORDER_CANCELLED]: 'Order Cancelled',
  [ADMIN_NOTIFICATION_TYPES.CUSTOMER_REGISTERED]: 'New Customer',
  [ADMIN_NOTIFICATION_TYPES.QUOTATION_REQUESTED]:
    'New Quotation Request',
  [ADMIN_NOTIFICATION_TYPES.BULK_ORDER_REQUESTED]: 'New Bulk Order',
  [ADMIN_NOTIFICATION_TYPES.RETURN_REQUESTED]: 'New Return Request',
  [ADMIN_NOTIFICATION_TYPES.CONTACT_MESSAGE]: 'New Contact Message',
  [ADMIN_NOTIFICATION_TYPES.QUOTATION_ACCEPTED]: 'Quotation Accepted',
  [ADMIN_NOTIFICATION_TYPES.QUOTATION_REJECTED]: 'Quotation Rejected',
  [ADMIN_NOTIFICATION_TYPES.CUSTOMER_REVIEW]: 'New Customer Review',
};

export const adminNotificationIds = {
  order: (orderId) => `order_${orderId}`,
  orderCancellation: (orderId) => `order_cancelled_${orderId}`,
  customer: (userId) => `customer_${userId}`,
  quotation: (requestId) => `quotation_${requestId}`,
  bulkOrder: (requestId) => `bulk_${requestId}`,
  returnRequest: (requestId) => `return_${requestId}`,
  contactMessage: (messageId) => `contact_${messageId}`,
  customerReview: (reviewId) => `review_${reviewId}`,
  quotationDecision: (sourceCollection, requestId, decision) =>
    `quotation_decision_${sourceCollection}_${requestId}_${decision}`,
};

export const formatNotificationCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

/**
 * Adds a deterministic admin notification to an existing Firestore
 * WriteBatch or Transaction. The source record and its notification are
 * committed atomically, which keeps Spark-plan notifications reliable
 * and lets Firestore Rules verify the related source write with getAfter().
 */
export const addAdminNotificationWrite = (
  writer,
  {
    id,
    type,
    message,
    relatedDocumentId,
    sourceCollection,
    targetPage,
  }
) => {
  const title = NOTIFICATION_TITLES[type];

  if (!title) {
    throw new Error(`Unsupported admin notification type: ${type}`);
  }

  writer.set(doc(db, 'adminNotifications', id), {
    type,
    title,
    message,
    relatedDocumentId,
    sourceCollection,
    targetPage,
    isRead: false,
    readAt: null,
    createdAt: serverTimestamp(),
  });
};
