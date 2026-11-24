const { initializeApp } = require('firebase-admin/app');
const {
  FieldValue,
  Timestamp,
  getFirestore,
} = require('firebase-admin/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = getFirestore();
const EMAIL_SERVICE_URL =
  'https://maison-email-service.sreekavya0125.workers.dev';
const FEEDBACK_DELAY_MS = 2 * 24 * 60 * 60 * 1000;
const FEEDBACK_LEASE_MS = 15 * 60 * 1000;
const MAX_FEEDBACK_EMAIL_ATTEMPTS = 5;
const triggerOptions = (document) => ({
  document,
  retry: true,
});

const shortReference = (prefix, documentId) =>
  `${prefix}-${String(documentId).slice(0, 8).toUpperCase()}`;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const getStorefrontUrl = () => {
  const configuredUrl = String(process.env.MAISON_SITE_URL || '')
    .trim()
    .replace(/\/$/, '');

  if (configuredUrl) return configuredUrl;

  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'maison-ecommerce-d75bd';

  return `https://${projectId}.web.app`;
};

const createNotificationOnce = async (notificationId, notification) => {
  const notificationRef = db
    .collection('adminNotifications')
    .doc(notificationId);

  try {
    await notificationRef.create({
      ...notification,
      isRead: false,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') {
      return;
    }

    throw error;
  }
};

exports.notifyCustomerRegistered = onDocumentCreated(
  triggerOptions('users/{userId}'),
  async (event) => {
    const customer = event.data?.data();
    if (!customer || customer.role === 'admin') return;

    const customerName =
      customer.name || customer.fullName || customer.email || 'A customer';

    await createNotificationOnce(`customer_${event.params.userId}`, {
      type: 'customer_registered',
      title: 'New Customer Registered',
      message: `${customerName} created a MAISON customer account.`,
      relatedDocumentId: event.params.userId,
      sourceCollection: 'users',
      targetPage: '/admin-customers',
    });
  }
);

exports.notifyOrderPlaced = onDocumentCreated(
  triggerOptions('orders/{orderId}'),
  async (event) => {
    const order = event.data?.data();
    if (!order) return;

    const orderId = order.orderId || event.params.orderId;
    const customerName = order.customer?.fullName || 'A customer';

    await createNotificationOnce(`order_${event.params.orderId}`, {
      type: 'order_placed',
      title:
        order.source === 'quotation'
          ? 'Quotation Order Confirmed'
          : 'New Order Placed',
      message: `${customerName} placed order ${orderId} for ${formatCurrency(
        order.total
      )}.`,
      relatedDocumentId: event.params.orderId,
      sourceCollection: 'orders',
      targetPage: '/admin-orders',
    });
  }
);

exports.notifyQuotationRequested = onDocumentCreated(
  triggerOptions('quotationRequests/{requestId}'),
  async (event) => {
    const quotation = event.data?.data();
    if (!quotation) return;

    const reference = shortReference('QT', event.params.requestId);

    await createNotificationOnce(`quotation_${event.params.requestId}`, {
      type: 'quotation_requested',
      title: 'New Quotation Request',
      message: `${quotation.customerName || 'A customer'} requested ${
        quotation.quantity || 0
      } units of ${quotation.productName || 'a MAISON product'} (${reference}).`,
      relatedDocumentId: event.params.requestId,
      sourceCollection: 'quotationRequests',
      targetPage: '/admin-quotations',
    });
  }
);

exports.notifyBulkOrderRequested = onDocumentCreated(
  triggerOptions('bulkOrderRequests/{requestId}'),
  async (event) => {
    const request = event.data?.data();
    if (!request) return;

    const reference = shortReference('BO', event.params.requestId);

    await createNotificationOnce(`bulk_${event.params.requestId}`, {
      type: 'bulk_order_requested',
      title: 'New Bulk Order Request',
      message: `${request.customer?.name || 'A customer'} requested bulk pricing for ${
        request.totalQuantity || 0
      } units (${reference}).`,
      relatedDocumentId: event.params.requestId,
      sourceCollection: 'bulkOrderRequests',
      targetPage: '/admin-quotations',
    });
  }
);

exports.notifyReturnRequested = onDocumentCreated(
  triggerOptions('returnRequests/{requestId}'),
  async (event) => {
    const request = event.data?.data();
    if (!request) return;

    const requestType = request.requestType || 'Return';

    await createNotificationOnce(`return_${event.params.requestId}`, {
      type: 'return_requested',
      title: `New ${requestType} Request`,
      message: `${request.customerName || 'A customer'} submitted a ${
        requestType.toLowerCase()
      } request for order ${request.orderReference || request.orderId || ''}.`,
      relatedDocumentId: event.params.requestId,
      sourceCollection: 'returnRequests',
      targetPage: '/admin-return-requests',
    });
  }
);

exports.notifyContactMessage = onDocumentCreated(
  triggerOptions('contactMessages/{messageId}'),
  async (event) => {
    const contactMessage = event.data?.data();
    if (!contactMessage) return;

    await createNotificationOnce(`contact_${event.params.messageId}`, {
      type: 'contact_message',
      title: 'New Contact Message',
      message: `${contactMessage.name || 'A customer'} sent “${
        contactMessage.subject || 'Customer support request'
      }”.`,
      relatedDocumentId: event.params.messageId,
      sourceCollection: 'contactMessages',
      targetPage: '/admin-contact-messages',
    });
  }
);

const notifyQuotationDecision = async ({
  event,
  sourceCollection,
  referencePrefix,
}) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  const previousDecision = before.customerDecision || 'pending';
  const decision = after.customerDecision || 'pending';

  if (
    decision === previousDecision ||
    !['accepted', 'rejected'].includes(decision)
  ) {
    return;
  }

  const requestId = event.params.requestId;
  const isBulk = sourceCollection === 'bulkOrderRequests';
  const customerName =
    after.customerName || after.customer?.name || 'A customer';
  const reference = shortReference(referencePrefix, requestId);
  const accepted = decision === 'accepted';

  await createNotificationOnce(
    `quotation_decision_${sourceCollection}_${requestId}_${decision}`,
    {
      type: accepted ? 'quotation_accepted' : 'quotation_rejected',
      title: accepted ? 'Quotation Accepted' : 'Quotation Rejected',
      message: `${customerName} ${decision} ${
        isBulk ? 'bulk quotation' : 'quotation'
      } ${reference}${
        accepted && after.createdOrderId
          ? `; order ${after.createdOrderId} was created.`
          : '.'
      }`,
      relatedDocumentId: requestId,
      sourceCollection,
      targetPage: '/admin-quotations',
    }
  );
};

exports.notifyQuotationDecision = onDocumentUpdated(
  triggerOptions('quotationRequests/{requestId}'),
  (event) =>
    notifyQuotationDecision({
      event,
      sourceCollection: 'quotationRequests',
      referencePrefix: 'QT',
    })
);

exports.notifyBulkQuotationDecision = onDocumentUpdated(
  triggerOptions('bulkOrderRequests/{requestId}'),
  (event) =>
    notifyQuotationDecision({
      event,
      sourceCollection: 'bulkOrderRequests',
      referencePrefix: 'BO',
    })
);

// Queue one feedback email when an order first transitions to Delivered.
// The actual delay and email send both happen on trusted backend services.
exports.scheduleOrderFeedbackEmail = onDocumentUpdated(
  triggerOptions('orders/{orderId}'),
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const previousStatus = String(before.orderStatus || '').toLowerCase();
    const currentStatus = String(after.orderStatus || '').toLowerCase();

    if (previousStatus === 'delivered' || currentStatus !== 'delivered') {
      return;
    }

    const orderId = event.params.orderId;
    const orderRef = db.collection('orders').doc(orderId);
    const queueRef = db.collection('feedbackEmailQueue').doc(orderId);
    const reviewRef = db.collection('customerReviews').doc(orderId);
    const scheduledFor = Timestamp.fromMillis(Date.now() + FEEDBACK_DELAY_MS);

    await db.runTransaction(async (transaction) => {
      const [queueSnapshot, reviewSnapshot, currentOrderSnapshot] = await Promise.all([
        transaction.get(queueRef),
        transaction.get(reviewRef),
        transaction.get(orderRef),
      ]);
      const currentOrder = currentOrderSnapshot.data();

      if (
        !currentOrderSnapshot.exists ||
        String(currentOrder?.orderStatus || '').toLowerCase() !== 'delivered' ||
        reviewSnapshot.exists ||
        currentOrder?.feedbackEmailSentAt ||
        ['pending', 'sending'].includes(queueSnapshot.data()?.status)
      ) {
        return;
      }

      transaction.set(queueRef, {
        orderId,
        orderReference: after.orderId || orderId,
        userId: after.userId || '',
        scheduledFor,
        status: 'pending',
        attempts: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(orderRef, {
        deliveredAt: after.deliveredAt || FieldValue.serverTimestamp(),
        feedbackEmailScheduledFor: scheduledFor,
        feedbackEmailStatus: 'scheduled',
      }, { merge: true });
    });
  }
);

const claimFeedbackEmail = async (queueRef) => {
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const queueSnapshot = await transaction.get(queueRef);

    if (!queueSnapshot.exists) return null;

    const queue = queueSnapshot.data();
    const scheduledTime = queue.scheduledFor?.toMillis?.() || 0;
    const leaseTime = queue.leaseExpiresAt?.toMillis?.() || 0;
    const canClaim =
      queue.status === 'pending' ||
      (queue.status === 'sending' && leaseTime <= now);

    if (!canClaim || scheduledTime > now) return null;

    transaction.update(queueRef, {
      status: 'sending',
      attempts: FieldValue.increment(1),
      leaseExpiresAt: Timestamp.fromMillis(now + FEEDBACK_LEASE_MS),
      lastAttemptAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return queue;
  });
};

const finishFeedbackQueueItem = async ({
  queueRef,
  orderRef,
  orderExists,
  orderUpdate,
}) => {
  const batch = db.batch();

  batch.delete(queueRef);

  if (orderExists && orderUpdate) {
    batch.set(orderRef, orderUpdate, { merge: true });
  }

  await batch.commit();
};

const sendFeedbackEmail = async ({ order, orderId }) => {
  const customerEmail = String(order.customer?.email || '').trim();

  if (!customerEmail) {
    return { skipped: true, reason: 'missing_email' };
  }

  const customerName = escapeHtml(
    order.customer?.fullName || order.customer?.name || 'Customer'
  );
  const orderReference = escapeHtml(order.orderId || orderId);
  const productNames = (order.products || [])
    .map((product) => escapeHtml(product.name || 'MAISON product'))
    .slice(0, 5)
    .join(', ');
  const reviewAnchor = `account-order-${String(orderId).replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  )}`;
  const reviewUrl = `${getStorefrontUrl()}/account?section=orders&reviewOrder=${encodeURIComponent(
    orderId
  )}#${reviewAnchor}`;

  const response = await fetch(EMAIL_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: customerEmail,
      subject: `How was your MAISON order ${order.orderId || orderId}?`,
      idempotencyKey: `maison-feedback-${orderId}`,
      html: `
        <div style="margin:0;padding:36px 12px;background:#f6f1e8;font-family:Arial,sans-serif;color:#172b4d;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5dccb;">
            <div style="padding:28px 32px;background:#172b4d;text-align:center;">
              <div style="color:#c6a15b;font-family:Georgia,serif;font-size:28px;letter-spacing:5px;">MAISON</div>
              <div style="margin-top:7px;color:#f7f1e5;font-size:10px;letter-spacing:2px;">THE ART OF SHOPPING</div>
            </div>
            <div style="padding:34px 32px;">
              <p style="margin:0 0 12px;color:#b18a43;font-size:11px;font-weight:bold;letter-spacing:2px;">YOUR EXPERIENCE MATTERS</p>
              <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px;font-weight:normal;">How did we do, ${customerName}?</h1>
              <p style="margin:0 0 18px;color:#596270;font-size:15px;line-height:1.7;">It has been two days since your MAISON order was delivered. We would love to hear about your experience.</p>
              <div style="margin:22px 0;padding:18px;background:#faf7f0;border-left:3px solid #c6a15b;">
                <p style="margin:0 0 7px;"><strong>Order:</strong> ${orderReference}</p>
                ${productNames ? `<p style="margin:0;color:#68707c;"><strong>Items:</strong> ${productNames}</p>` : ''}
              </div>
              <div style="text-align:center;margin:30px 0;">
                <a href="${reviewUrl}" style="display:inline-block;padding:15px 26px;background:#c6a15b;color:#172b4d;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:1px;">RATE YOUR EXPERIENCE</a>
              </div>
              <p style="margin:0;color:#7d838b;font-size:12px;line-height:1.6;">You must sign in to your MAISON account. Reviews can only be submitted for delivered orders belonging to you.</p>
            </div>
          </div>
        </div>
      `,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || result.error || `Email service returned ${response.status}`
    );
  }

  return { skipped: false };
};

const processFeedbackQueueItem = async (queueDocument) => {
  const queueRef = queueDocument.ref;
  const claimedQueue = await claimFeedbackEmail(queueRef);

  if (!claimedQueue) return;

  const orderId = claimedQueue.orderId || queueDocument.id;
  const orderRef = db.collection('orders').doc(orderId);
  const reviewRef = db.collection('customerReviews').doc(orderId);
  const [orderSnapshot, reviewSnapshot] = await Promise.all([
    orderRef.get(),
    reviewRef.get(),
  ]);
  const order = orderSnapshot.data();

  if (!orderSnapshot.exists || !order) {
    await finishFeedbackQueueItem({
      queueRef,
      orderRef,
      orderExists: false,
    });
    return;
  }

  if (String(order.orderStatus || '').toLowerCase() !== 'delivered') {
    await finishFeedbackQueueItem({
      queueRef,
      orderRef,
      orderExists: true,
      orderUpdate: {
        feedbackEmailStatus: 'skipped_order_not_delivered',
        feedbackEmailProcessedAt: FieldValue.serverTimestamp(),
      },
    });
    return;
  }

  if (reviewSnapshot.exists) {
    await finishFeedbackQueueItem({
      queueRef,
      orderRef,
      orderExists: true,
      orderUpdate: {
        feedbackEmailStatus: 'skipped_review_exists',
        feedbackEmailProcessedAt: FieldValue.serverTimestamp(),
      },
    });
    return;
  }

  try {
    const emailResult = await sendFeedbackEmail({ order, orderId });

    await finishFeedbackQueueItem({
      queueRef,
      orderRef,
      orderExists: true,
      orderUpdate: emailResult.skipped
        ? {
            feedbackEmailStatus: `skipped_${emailResult.reason}`,
            feedbackEmailProcessedAt: FieldValue.serverTimestamp(),
          }
        : {
            feedbackEmailStatus: 'sent',
            feedbackEmailSentAt: FieldValue.serverTimestamp(),
            feedbackEmailProcessedAt: FieldValue.serverTimestamp(),
          },
    });
  } catch (error) {
    const attemptNumber = Number(claimedQueue.attempts || 0) + 1;

    if (attemptNumber >= MAX_FEEDBACK_EMAIL_ATTEMPTS) {
      await finishFeedbackQueueItem({
        queueRef,
        orderRef,
        orderExists: true,
        orderUpdate: {
          feedbackEmailStatus: 'failed',
          feedbackEmailError: String(error.message || error).slice(0, 500),
          feedbackEmailProcessedAt: FieldValue.serverTimestamp(),
        },
      });
      return;
    }

    await queueRef.set({
      status: 'pending',
      lastError: String(error.message || error).slice(0, 500),
      leaseExpiresAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
};

// One scheduler job handles every due email. Cloud Scheduler and Cloud
// Functions require the Firebase Blaze plan in production.
exports.sendDueFeedbackEmails = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'Asia/Kolkata',
    retryCount: 3,
    maxInstances: 1,
  },
  async () => {
    const dueQueue = await db
      .collection('feedbackEmailQueue')
      .where('scheduledFor', '<=', Timestamp.now())
      .limit(50)
      .get();

    const results = await Promise.allSettled(
      dueQueue.docs.map(processFeedbackQueueItem)
    );

    const rejected = results.filter((result) => result.status === 'rejected');

    if (rejected.length > 0) {
      console.error(
        `${rejected.length} feedback email queue item(s) failed unexpectedly.`,
        rejected.map((result) => result.reason)
      );
      throw rejected[0].reason;
    }
  }
);

