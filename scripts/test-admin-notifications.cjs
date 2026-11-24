const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');

const functionsRequire = createRequire(
  path.join(__dirname, '../functions/package.json')
);
const { initializeApp } = functionsRequire('firebase-admin/app');
const {
  FieldValue,
  getFirestore,
} = functionsRequire('firebase-admin/firestore');

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-maison' });
const db = getFirestore();

const waitForNotification = async (notificationId, timeoutMs = 15000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await db
      .collection('adminNotifications')
      .doc(notificationId)
      .get();

    if (snapshot.exists) return snapshot.data();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Notification ${notificationId} was not created.`);
};

const run = async () => {
  await db.collection('users').doc('customer-1').set({
    name: 'Test Customer',
    email: 'customer@example.com',
    role: 'customer',
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('customer_customer-1');

  await db.collection('orders').doc('order-1').set({
    orderId: 'MAI-TEST-1',
    userId: 'customer-1',
    customer: { fullName: 'Test Customer' },
    total: 12500,
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('order_order-1');

  await db.collection('quotationRequests').doc('quote-1').set({
    customerName: 'Test Customer',
    productName: 'MAISON Chair',
    quantity: 10,
    customerDecision: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('quotation_quote-1');

  await db.collection('quotationRequests').doc('quote-1').update({
    customerDecision: 'accepted',
    createdOrderId: 'MAIQ-QUOTE-1',
  });
  await waitForNotification(
    'quotation_decision_quotationRequests_quote-1_accepted'
  );

  await db.collection('bulkOrderRequests').doc('bulk-1').set({
    customer: { name: 'Bulk Customer' },
    totalQuantity: 75,
    customerDecision: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('bulk_bulk-1');

  await db.collection('bulkOrderRequests').doc('bulk-1').update({
    customerDecision: 'rejected',
  });
  await waitForNotification(
    'quotation_decision_bulkOrderRequests_bulk-1_rejected'
  );

  await db.collection('returnRequests').doc('return-1').set({
    customerName: 'Test Customer',
    requestType: 'Replacement',
    orderReference: 'MAI-TEST-1',
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('return_return-1');

  await db.collection('contactMessages').doc('contact-1').set({
    name: 'Test Customer',
    subject: 'Delivery question',
    createdAt: FieldValue.serverTimestamp(),
  });
  await waitForNotification('contact_contact-1');

  const beforeNoOpUpdate = await db
    .collection('adminNotifications')
    .count()
    .get();

  await db.collection('quotationRequests').doc('quote-1').update({
    adminNotes: 'Unrelated update',
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const afterNoOpUpdate = await db
    .collection('adminNotifications')
    .count()
    .get();

  assert.equal(beforeNoOpUpdate.data().count, 8);
  assert.equal(afterNoOpUpdate.data().count, 8);

  console.log('Validated 8 unique real-time admin notification events.');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

