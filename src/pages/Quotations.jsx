import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Tag,
  Package,
  Send,
  CheckCircle,
  Plus,
  Minus,
  ShieldCheck,
  Headset,
  LoaderCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { auth, db } from '../firebase';
import { products as fallbackProducts } from '../data/products';
import {
  buildQuotationOrder,
  getQuotationOrderId,
} from '../utils/quotationOrder';
import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
  formatNotificationCurrency,
} from '../utils/adminNotifications';
import SEO from '../components/SEO';
import './Quotations.css';

const getDiscount = (quantity) => {
  if (quantity >= 50) return 15;
  if (quantity >= 25) return 10;
  if (quantity >= 10) return 5;
  return 0;
};

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (timestamp) => {
  if (!timestamp) return 'Date unavailable';

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const quotationStatusLabel = (status) => {
  const labels = {
    pending: 'Awaiting Admin Review',
    reviewed: 'Reviewed',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected by Admin',
    completed: 'Completed',
  };

  return labels[status] || status || 'Pending';
};

function Quotations() {
  const navigate = useNavigate();

  const [productList, setProductList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [myQuotations, setMyQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(true);

  const [processingDecision, setProcessingDecision] = useState('');
  const [openingOrder, setOpeningOrder] = useState('');

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  // AUTHENTICATION LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (!user) {
        setMyQuotations([]);
        setLoadingQuotations(false);
      } else {
        setLoadingQuotations(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // LOAD PRODUCTS
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));

        const liveProducts = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => item.name && Number(item.price) > 0)
          .sort((first, second) =>
            first.name.localeCompare(second.name)
          );

        setProductList(
          liveProducts.length > 0
            ? liveProducts
            : fallbackProducts.map((item) => ({
                ...item,
                id: String(item.id),
              }))
        );
      } catch (error) {
        console.error('Quotation product loading error:', error);

        setProductList(
          fallbackProducts.map((item) => ({
            ...item,
            id: String(item.id),
          }))
        );

        toast.error(
          'Live products could not be loaded. Showing the saved catalogue.'
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // LOAD CUSTOMER'S OWN QUOTATIONS
  useEffect(() => {
    if (authLoading || !currentUser) return undefined;

    let normalRequests = [];
    let bulkRequests = [];

    const updateCombinedRequests = () => {
      const combined = [...normalRequests, ...bulkRequests];

      combined.sort((first, second) => {
        const firstDate = first.createdAt?.toMillis?.() || 0;
        const secondDate = second.createdAt?.toMillis?.() || 0;

        return secondDate - firstDate;
      });

      setMyQuotations(combined);
      setLoadingQuotations(false);
    };

    const normalQuery = query(
      collection(db, 'quotationRequests'),
      where('userId', '==', currentUser.uid)
    );

    const bulkQuery = query(
      collection(db, 'bulkOrderRequests'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeNormal = onSnapshot(
      normalQuery,
      (snapshot) => {
        normalRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          requestType: 'normal',
          requestCollection: 'quotationRequests',
        }));

        updateCombinedRequests();
      },
      (error) => {
        console.error('Normal quotation loading error:', error);
        setLoadingQuotations(false);
        toast.error('Unable to load your quotation requests.');
      }
    );

    const unsubscribeBulk = onSnapshot(
      bulkQuery,
      (snapshot) => {
        bulkRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          requestType: 'bulk',
          requestCollection: 'bulkOrderRequests',
        }));

        updateCombinedRequests();
      },
      (error) => {
        console.error('Bulk quotation loading error:', error);
        setLoadingQuotations(false);
        toast.error('Unable to load your bulk quotation requests.');
      }
    );

    return () => {
      unsubscribeNormal();
      unsubscribeBulk();
    };
  }, [currentUser, authLoading]);

  const product = useMemo(
    () =>
      productList.find(
        (item) => String(item.id) === selectedProduct
      ),
    [productList, selectedProduct]
  );

  const unitPrice = Number(product?.price) || 0;
  const discount = getDiscount(quantity);
  const subtotal = unitPrice * quantity;
  const discountAmount = Math.round(
    (subtotal * discount) / 100
  );
  const total = subtotal - discountAmount;

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomer((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // SUBMIT NEW QUOTATION
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!product) {
      toast.error('Please select a product.');
      return;
    }

    if (
      !customer.name.trim() ||
      !customer.email.trim() ||
      !customer.phone.trim()
    ) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (!/^\d{10}$/.test(customer.phone.trim())) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestRef = doc(collection(db, 'quotationRequests'));
      const requestData = {
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim().toLowerCase(),
        customerPhone: customer.phone.trim(),
        company: customer.company.trim() || null,
        message: customer.message.trim() || null,

        userId: auth.currentUser?.uid || null,

        productId: String(product.id),
        productName: product.name,
        productCategory: product.category || null,
        productImage: product.image || null,

        unitPrice,
        quantity,
        subtotal,

        estimatedDiscountPercent: discount,
        estimatedDiscountAmount: discountAmount,
        estimatedTotal: total,

        finalUnitPrice: null,
        finalDiscountPercent: null,
        finalSubtotal: null,
        finalDiscountAmount: null,
        finalTotal: null,

        adminNotes: '',
        status: 'pending',
        customerDecision: 'pending',
        createdOrderId: null,
        source: 'quotation-page',

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const requestBatch = writeBatch(db);

      requestBatch.set(requestRef, requestData);
      addAdminNotificationWrite(requestBatch, {
        id: adminNotificationIds.quotation(requestRef.id),
        type: ADMIN_NOTIFICATION_TYPES.QUOTATION_REQUESTED,
        message: `${requestData.customerName} requested ${
          requestData.quantity
        } units of ${requestData.productName}.`,
        relatedDocumentId: requestRef.id,
        sourceCollection: 'quotationRequests',
        targetPage: '/admin-quotations',
      });

      await requestBatch.commit();

      setSubmittedRequest({
        id: requestRef.id,
        productName: product.name,
      });

      toast.success(
        'Quotation request submitted successfully.'
      );

      setCustomer({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
      });

      setSelectedProduct('');
      setQuantity(10);
    } catch (error) {
      console.error('Quotation submission error:', error);

      toast.error(
        'Unable to submit your quotation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // CUSTOMER ACCEPT / REJECT
  const handleCustomerDecision = async (quotation, decision) => {
    if (!['accepted', 'rejected'].includes(decision)) return;

    if (!currentUser) {
      toast.error('Please sign in to respond to your quotation.');
      return;
    }

    if (quotation.status !== 'approved') {
      toast.error('This quotation is not ready for your response.');
      return;
    }

    if (
      quotation.customerDecision === 'accepted' ||
      quotation.customerDecision === 'rejected'
    ) {
      toast.error('You have already responded to this quotation.');
      return;
    }

    const actionText =
      decision === 'accepted' ? 'accept' : 'reject';

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} this quotation?`
    );

    if (!confirmed) return;

    const processingKey = `${quotation.requestCollection}-${quotation.id}`;

    try {
      setProcessingDecision(processingKey);

      const quotationRef = doc(
        db,
        quotation.requestCollection,
        quotation.id
      );

      const createdOrder = await runTransaction(
        db,
        async (transaction) => {
          const quotationSnapshot = await transaction.get(quotationRef);

          if (!quotationSnapshot.exists()) {
            throw new Error('QUOTATION_NOT_FOUND');
          }

          const quotationData = quotationSnapshot.data();

          if (quotationData.userId !== currentUser.uid) {
            throw new Error('QUOTATION_NOT_OWNED');
          }

          if (quotationData.status !== 'approved') {
            throw new Error('QUOTATION_NOT_APPROVED');
          }

          if (
            quotationData.customerDecision === 'accepted' ||
            quotationData.customerDecision === 'rejected'
          ) {
            throw new Error('QUOTATION_ALREADY_DECIDED');
          }

          // REJECT QUOTATION
          if (decision === 'rejected') {
            transaction.update(quotationRef, {
              customerDecision: 'rejected',
              customerDecisionBy: currentUser.uid,
              customerDecisionAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            addAdminNotificationWrite(transaction, {
              id: adminNotificationIds.quotationDecision(
                quotation.requestCollection,
                quotation.id,
                decision
              ),
              type: ADMIN_NOTIFICATION_TYPES.QUOTATION_REJECTED,
              message: `${
                quotationData.customerName ||
                quotationData.customer?.name ||
                'A customer'
              } rejected ${
                quotation.requestType === 'bulk'
                  ? 'a bulk quotation'
                  : 'a quotation'
              }.`,
              relatedDocumentId: quotation.id,
              sourceCollection: quotation.requestCollection,
              targetPage: '/admin-quotations',
            });

            return null;
          }

          // ACCEPT QUOTATION AND CREATE ORDER
          const freshQuotation = {
            id: quotation.id,
            ...quotationData,
            requestType: quotation.requestType,
          };

          const order = buildQuotationOrder({
            quotation: freshQuotation,
            requestCollection: quotation.requestCollection,
            user: currentUser,
            catalogue: productList,
          });

          const orderRef = doc(db, 'orders', order.orderId);

          // No separate order-existence read here.
          // The order and quotation decision are saved together.
          transaction.set(orderRef, {
            ...order,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.update(quotationRef, {
            customerDecision: 'accepted',
            customerDecisionBy: currentUser.uid,
            customerDecisionAt: serverTimestamp(),
            createdOrderId: order.orderId,
            acceptedOrderTotal: order.total,
            orderCreatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          addAdminNotificationWrite(transaction, {
            id: adminNotificationIds.quotationDecision(
              quotation.requestCollection,
              quotation.id,
              decision
            ),
            type: ADMIN_NOTIFICATION_TYPES.QUOTATION_ACCEPTED,
            message: `${
              quotationData.customerName ||
              quotationData.customer?.name ||
              'A customer'
            } accepted ${
              quotation.requestType === 'bulk'
                ? 'a bulk quotation'
                : 'a quotation'
            }.`,
            relatedDocumentId: quotation.id,
            sourceCollection: quotation.requestCollection,
            targetPage: '/admin-quotations',
          });
          addAdminNotificationWrite(transaction, {
            id: adminNotificationIds.order(order.orderId),
            type: ADMIN_NOTIFICATION_TYPES.ORDER_PLACED,
            message: `${
              quotationData.customerName ||
              quotationData.customer?.name ||
              'A customer'
            } confirmed order ${order.orderId} for ${
              formatNotificationCurrency(order.total)
            }.`,
            relatedDocumentId: order.orderId,
            sourceCollection: 'orders',
            targetPage: '/admin-orders',
          });

          return order;
        }
      );

      toast.success(
        decision === 'accepted'
          ? 'Quotation accepted and order confirmed.'
          : 'Quotation rejected successfully.'
      );

      if (createdOrder) {
        const existingOrders = JSON.parse(
          localStorage.getItem('maison-orders') || '[]'
        );

        const remainingOrders = existingOrders.filter(
          (order) => order.orderId !== createdOrder.orderId
        );

        localStorage.setItem(
          'maison-orders',
          JSON.stringify([createdOrder, ...remainingOrders])
        );

        navigate('/order-confirmation', {
          state: { order: createdOrder },
        });
      }
    } catch (error) {
      console.error('Quotation decision error:', error);

      const errorMessages = {
        QUOTATION_NOT_FOUND: 'This quotation no longer exists.',
        QUOTATION_NOT_OWNED: 'You cannot respond to this quotation.',
        QUOTATION_NOT_APPROVED: 'This quotation is no longer approved.',
        QUOTATION_ALREADY_DECIDED:
          'A final response has already been submitted.',
        INVALID_QUOTATION_PRICING:
          'The approved product pricing is incomplete. Please contact MAISON.',
        INVALID_QUOTATION_TOTAL:
          'The approved quotation total is invalid. Please contact MAISON.',
      };

      toast.error(
        errorMessages[error.message] ||
          'Unable to save your response. Please try again.'
      );
    } finally {
      setProcessingDecision('');
    }
  };

  const handleOpenOrder = async (quotation) => {
    if (!currentUser) {
      toast.error('Please sign in to view this order.');
      return;
    }

    const orderId =
      quotation.createdOrderId || getQuotationOrderId(quotation);

    try {
      setOpeningOrder(orderId);

      const orderSnapshot = await getDoc(doc(db, 'orders', orderId));

      if (!orderSnapshot.exists()) {
        toast.error('The confirmed order could not be found.');
        return;
      }

      const order = {
        ...orderSnapshot.data(),
        orderId: orderSnapshot.data().orderId || orderSnapshot.id,
      };

      if (order.userId !== currentUser.uid) {
        toast.error('You cannot view this order.');
        return;
      }

      navigate('/order-confirmation', { state: { order } });
    } catch (error) {
      console.error('Quotation order loading error:', error);
      toast.error('Unable to open your confirmed order.');
    } finally {
      setOpeningOrder('');
    }
  };

  // QUOTATION CARD
  const renderQuotationCard = (quotation) => {
    const isBulk = quotation.requestType === 'bulk';

    const decision = quotation.customerDecision || 'pending';

    const isApproved = quotation.status === 'approved';

    const isProcessing =
      processingDecision ===
      `${quotation.requestCollection}-${quotation.id}`;

    const createdOrderId =
      quotation.createdOrderId || getQuotationOrderId(quotation);

    const isOpeningOrder = openingOrder === createdOrderId;

    const products = isBulk
      ? isApproved && quotation.finalProducts?.length > 0
        ? quotation.finalProducts.map((item) => ({
            ...item,
            unitPrice: item.finalUnitPrice,
          }))
        : quotation.products || []
      : [
          {
            productId: quotation.productId,
            name: quotation.productName,
            quantity: quotation.quantity,
            unitPrice:
              isApproved && Number(quotation.finalUnitPrice) > 0
                ? quotation.finalUnitPrice
                : quotation.unitPrice,
          },
        ];

    const finalUnitPrice = Number(quotation.finalUnitPrice);
    const finalTotal = Number(quotation.finalTotal);

    return (
      <article
        key={`${quotation.requestCollection}-${quotation.id}`}
        style={{
          background: '#fff',
          border: '1px solid #e8e3d9',
          borderRadius: '12px',
          padding: '22px',
          marginBottom: '18px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <strong style={{ color: '#172B4D' }}>
              {isBulk ? 'Bulk Quotation' : 'Product Quotation'}
            </strong>

            <p style={{ margin: '5px 0 0', fontSize: '13px' }}>
              Reference: {isBulk ? 'BO-' : 'QT-'}
              {quotation.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <span
            style={{
              padding: '7px 12px',
              borderRadius: '20px',
              background: isApproved ? '#e8f5e9' : '#fff4df',
              color: isApproved ? '#24733b' : '#9a6715',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            {quotationStatusLabel(quotation.status)}
          </span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          {products.map((item, index) => (
            <div
              key={`${item.productId || item.name}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 0',
                borderBottom: '1px solid #f0ede8',
              }}
            >
              <div>
                <strong style={{ color: '#26364b' }}>
                  {item.name || 'MAISON Product'}
                </strong>

                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
                  Quantity: {item.quantity || 0}
                </p>
              </div>

              <strong>
                {formatPrice(item.unitPrice ?? item.price)}
              </strong>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <small style={{ color: '#777' }}>Requested Date</small>
            <p style={{ margin: '5px 0', fontWeight: '600' }}>
              {formatDate(quotation.createdAt)}
            </p>
          </div>

          <div>
            <small style={{ color: '#777' }}>Estimated Total</small>
            <p style={{ margin: '5px 0', fontWeight: '600' }}>
              {formatPrice(
                isBulk
                  ? quotation.estimatedRegularTotal
                  : quotation.estimatedTotal
              )}
            </p>
          </div>

          {quotation.adminNotes && (
            <div>
              <small style={{ color: '#777' }}>Admin Message</small>
              <p style={{ margin: '5px 0', fontWeight: '600' }}>
                {quotation.adminNotes}
              </p>
            </div>
          )}
        </div>

        {isApproved && (
          <div
            style={{
              background: '#f8f7f4',
              border: '1px solid #e5dfd2',
              borderRadius: '10px',
              padding: '18px',
              marginTop: '12px',
            }}
          >
            <h4
              style={{
                margin: '0 0 14px',
                color: '#172B4D',
                fontSize: '16px',
              }}
            >
              <Tag
                size={17}
                style={{
                  verticalAlign: 'middle',
                  marginRight: '7px',
                }}
              />
              Final Quotation from MAISON
            </h4>

            {!isBulk && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span>Final Unit Price</span>
                <strong>{formatPrice(finalUnitPrice)}</strong>
              </div>
            )}

            {isBulk && quotation.finalProducts?.length > 0 && (
              <div className="customer-quote-final-products">
                {quotation.finalProducts.map((item, index) => (
                  <div key={item.lineId || `${item.productId}-${index}`}>
                    <span>
                      {item.name || `Product ${index + 1}`}
                      <small>{item.quantity} units</small>
                    </span>
                    <strong>
                      {formatPrice(item.finalUnitPrice)} each
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span>Final Discount</span>
              <strong>
                {Number(quotation.finalDiscountPercent) || 0}%
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #ded8cc',
                color: '#172B4D',
                fontSize: '18px',
              }}
            >
              <strong>Final Total</strong>
              <strong>{formatPrice(finalTotal)}</strong>
            </div>

            {decision === 'pending' ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '18px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleCustomerDecision(quotation, 'accepted')
                  }
                  disabled={isProcessing}
                  style={{
                    flex: '1',
                    minWidth: '130px',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '12px',
                    background: '#172B4D',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {isProcessing ? (
                    <LoaderCircle size={16} />
                  ) : (
                    'Accept Quotation'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCustomerDecision(quotation, 'rejected')
                  }
                  disabled={isProcessing}
                  style={{
                    flex: '1',
                    minWidth: '130px',
                    border: '1px solid #b84a4a',
                    borderRadius: '7px',
                    padding: '12px',
                    background: '#fff',
                    color: '#b84a4a',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Reject Quote
                </button>
              </div>
            ) : decision === 'accepted' ? (
              <div className="customer-quote-order-confirmation">
                <div>
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Quotation accepted</strong>
                    <span>
                      Order {createdOrderId} · {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenOrder(quotation)}
                  disabled={isOpeningOrder}
                >
                  {isOpeningOrder ? (
                    <LoaderCircle className="quotation-spinner" size={16} />
                  ) : (
                    'View Order & Payment'
                  )}
                </button>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '7px',
                  background: '#fff0f0',
                  color: '#b33b3b',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <XCircle size={19} />
                You rejected this quotation. This decision is final.
              </div>
            )}
          </div>
        )}

        {quotation.status !== 'approved' && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f8f7f4',
              borderRadius: '7px',
              color: '#666',
              fontSize: '13px',
            }}
          >
            <Clock
              size={16}
              style={{
                verticalAlign: 'middle',
                marginRight: '7px',
              }}
            />
            Your quotation is waiting for the MAISON team to review.
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="quotations-page">
      <SEO
        title="Request a Quotation | Bulk Pricing & Discounts | MAISON"
        description="Request a custom quotation from MAISON. Explore product pricing, quantity-based discounts and bulk order estimates for businesses and personal requirements."
      />

      {/* MY QUOTATIONS */}
      <section
        id="my-quotations"
        style={{
          maxWidth: '1100px',
          margin: '40px auto',
          padding: '25px 20px',
        }}
      >
        <div style={{ marginBottom: '25px' }}>
          <span
            style={{
              color: '#C6A15B',
              fontWeight: '700',
              fontSize: '12px',
              letterSpacing: '2px',
            }}
          >
            CUSTOMER ACCOUNT
          </span>

          <h2
            style={{
              color: '#172B4D',
              margin: '8px 0',
              fontSize: '28px',
            }}
          >
            My Quotations
          </h2>

          <p style={{ color: '#777', margin: 0 }}>
            View your quotation requests and respond to final prices
            approved by MAISON.
          </p>
        </div>

        {authLoading || loadingQuotations ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <LoaderCircle
              className="quotation-spinner"
              size={28}
            />
            <p>Loading your quotations...</p>
          </div>
        ) : !currentUser ? (
          <div
            style={{
              padding: '25px',
              background: '#f8f7f4',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <ShieldCheck size={30} color="#C6A15B" />

            <h3 style={{ color: '#172B4D' }}>
              Sign in to view your quotations
            </h3>

            <p style={{ color: '#777' }}>
              Please sign in to see your quotation requests,
              approved prices and response options.
            </p>

            <a
              href="/login"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                padding: '12px 25px',
                background: '#172B4D',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Sign In
            </a>
          </div>
        ) : myQuotations.length === 0 ? (
          <div
            style={{
              padding: '30px',
              background: '#f8f7f4',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <FileText size={32} color="#C6A15B" />

            <h3 style={{ color: '#172B4D' }}>
              No quotation requests yet
            </h3>

            <p style={{ color: '#777' }}>
              Your submitted quotation requests will appear here.
            </p>

            <a
              href="#quotation-form"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                color: '#172B4D',
                fontWeight: '700',
              }}
            >
              Request a Quotation
            </a>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <strong style={{ color: '#172B4D' }}>
                {myQuotations.length}{' '}
                {myQuotations.length === 1
                  ? 'Quotation'
                  : 'Quotations'}
              </strong>

              <span
                style={{
                  fontSize: '13px',
                  color: '#777',
                }}
              >
                <RefreshCw
                  size={13}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: '5px',
                  }}
                />
                Updates automatically
              </span>
            </div>

            {myQuotations.map(renderQuotationCard)}
          </>
        )}
      </section>

      {/* ORIGINAL QUOTATION HERO */}
      <section className="quotation-hero">
        <div className="quotation-hero-content">
          <span className="quotation-eyebrow">
            EXCLUSIVE BUSINESS PRICING
          </span>

          <h1>
            Better Prices.
            <br />
            <span>Bigger Possibilities.</span>
          </h1>

          <p>
            Get personalised quotations, exclusive quantity discounts and
            competitive prices for your shopping requirements.
          </p>

          <a
            href="#quotation-form"
            className="quotation-hero-button"
          >
            Request a Quotation
          </a>
        </div>

        <div
          className="quotation-hero-decoration"
          aria-hidden="true"
        >
          <div className="quotation-decoration-circle circle-one" />
          <div className="quotation-decoration-circle circle-two" />
          <div className="quotation-decoration-circle circle-three" />

          <div className="quotation-hero-card">
            <Tag size={28} />
            <strong>Up to 15% OFF</strong>
            <span>On bulk purchases</span>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="quotation-benefits">
        <div>
          <Tag size={24} />
          <h3>Exclusive Discounts</h3>
          <p>Save more when you order more.</p>
        </div>

        <div>
          <FileText size={24} />
          <h3>Custom Quotations</h3>
          <p>Get pricing based on your needs.</p>
        </div>

        <div>
          <ShieldCheck size={24} />
          <h3>Transparent Pricing</h3>
          <p>Clear pricing and discount details.</p>
        </div>

        <div>
          <Headset size={24} />
          <h3>Dedicated Support</h3>
          <p>Assistance with your order enquiry.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="quotation-pricing">
        <div className="quotation-section-heading">
          <span>OUR PRICING ADVANTAGE</span>
          <h2>More Quantity. More Savings.</h2>
          <p>
            Explore our quantity-based discount structure.
          </p>
        </div>

        <div className="quotation-pricing-grid">
          <div className="quotation-pricing-card">
            <span>01</span>
            <h3>Standard Order</h3>
            <h2>5% OFF</h2>
            <p>For orders of 10–24 items.</p>
          </div>

          <div className="quotation-pricing-card featured-pricing">
            <span>02</span>
            <div className="pricing-popular">POPULAR</div>
            <h3>Business Order</h3>
            <h2>10% OFF</h2>
            <p>For orders of 25–49 items.</p>
          </div>

          <div className="quotation-pricing-card">
            <span>03</span>
            <h3>Bulk Order</h3>
            <h2>15% OFF</h2>
            <p>For orders of 50 or more items.</p>
          </div>
        </div>

        <small className="quotation-pricing-note">
          * Displayed discounts are estimates. The final quote is
          confirmed after an administrator reviews availability and pricing.
        </small>
      </section>

      {/* QUOTATION FORM */}
      <section
        className="quotation-form-section"
        id="quotation-form"
      >
        <div className="quotation-form-intro">
          <span>LET&apos;S WORK TOGETHER</span>

          <h2>Request Your Custom Quotation</h2>

          <p>
            Select a product, enter your required quantity and share your
            details. Our team will review the request and confirm a final price.
          </p>

          <div className="quotation-form-points">
            <div>
              <CheckCircle size={18} />
              Quantity-based discounts
            </div>

            <div>
              <CheckCircle size={18} />
              Product-wise price estimates
            </div>

            <div>
              <CheckCircle size={18} />
              Administrator-reviewed final pricing
            </div>
          </div>
        </div>

        <form
          className="quotation-form"
          onSubmit={handleSubmit}
        >
          {submittedRequest && (
            <div
              className="quotation-success"
              role="status"
            >
              <CheckCircle size={22} />

              <div>
                <strong>Request received</strong>

                <p>
                  Reference QT-
                  {submittedRequest.id.slice(0, 8).toUpperCase()}
                  {' '}for {submittedRequest.productName}.
                  Our team will review the price.
                </p>
              </div>
            </div>
          )}

          <h3>Quotation Details</h3>

          <div className="quotation-field">
            <label htmlFor="quotation-product">
              Select Product *
            </label>

            <select
              id="quotation-product"
              value={selectedProduct}
              onChange={(event) =>
                setSelectedProduct(event.target.value)
              }
              required
              disabled={loadingProducts || isSubmitting}
            >
              <option value="">
                {loadingProducts
                  ? 'Loading products…'
                  : 'Choose a product'}
              </option>

              {productList.map((item) => (
                <option
                  key={item.id}
                  value={String(item.id)}
                >
                  {item.name} - {formatPrice(item.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="quotation-field">
            <label htmlFor="quotation-quantity">
              Required Quantity *
            </label>

            <div className="quotation-quantity-control">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() =>
                  setQuantity((previous) =>
                    Math.max(1, previous - 1)
                  )
                }
                disabled={isSubmitting}
              >
                <Minus size={17} />
              </button>

              <input
                id="quotation-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(
                      1,
                      Number(event.target.value) || 1
                    )
                  )
                }
                disabled={isSubmitting}
              />

              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((previous) => previous + 1)
                }
                disabled={isSubmitting}
              >
                <Plus size={17} />
              </button>
            </div>
          </div>

          <div className="quotation-estimate">
            <div className="quotation-estimate-heading">
              <Package size={19} />
              <strong>Estimated Price</strong>
            </div>

            <div>
              <span>Unit Price</span>
              <strong>{formatPrice(unitPrice)}</strong>
            </div>

            <div>
              <span>Quantity</span>
              <strong>{quantity}</strong>
            </div>

            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div>
              <span>Discount ({discount}%)</span>
              <strong className="quotation-discount">
                - {formatPrice(discountAmount)}
              </strong>
            </div>

            <div className="quotation-estimate-total">
              <span>Estimated Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>

          <h3 className="quotation-customer-heading">
            Your Information
          </h3>

          <div className="quotation-field">
            <label htmlFor="quotation-name">
              Full Name *
            </label>

            <input
              id="quotation-name"
              type="text"
              name="name"
              placeholder="Enter your name"
              value={customer.name}
              onChange={handleCustomerChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="quotation-field">
            <label htmlFor="quotation-email">
              Email Address *
            </label>

            <input
              id="quotation-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={customer.email}
              onChange={handleCustomerChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="quotation-field">
            <label htmlFor="quotation-phone">
              Phone Number *
            </label>

            <input
              id="quotation-phone"
              type="tel"
              name="phone"
              inputMode="numeric"
              maxLength="10"
              placeholder="10-digit mobile number"
              value={customer.phone}
              onChange={handleCustomerChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="quotation-field">
            <label htmlFor="quotation-company">
              Company Name (Optional)
            </label>

            <input
              id="quotation-company"
              type="text"
              name="company"
              placeholder="Enter company name"
              value={customer.company}
              onChange={handleCustomerChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="quotation-field">
            <label htmlFor="quotation-message">
              Additional Requirements
            </label>

            <textarea
              id="quotation-message"
              name="message"
              rows="3"
              placeholder="Tell us about your requirements..."
              value={customer.message}
              onChange={handleCustomerChange}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="quotation-submit-button"
            disabled={isSubmitting || loadingProducts}
          >
            {isSubmitting ? (
              <LoaderCircle
                className="quotation-spinner"
                size={17}
              />
            ) : (
              <Send size={17} />
            )}

            {isSubmitting
              ? 'Submitting Request…'
              : 'Submit Quotation Request'}
          </button>

          <p className="quotation-form-disclaimer">
            Submitting this form creates a pricing request only.
            No payment is taken, and the final price is confirmed
            after review.
          </p>
        </form>
      </section>
    </div>
  );
}

export default Quotations;
