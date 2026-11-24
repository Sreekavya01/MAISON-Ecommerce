import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  MapPin,
  User,
  Mail,
  Phone,
  CreditCard,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ShoppingBag,
  Package,
  Wallet,
  Tag,
  X,
} from 'lucide-react';

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

import SEO from '../components/SEO';
import ProductRating from '../components/ProductRating';
import './Checkout.css';
import { groupCartItems } from '../utils/cart';
import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
  formatNotificationCurrency,
} from '../utils/adminNotifications';

const availableCoupons = [
  {
    code: 'MAISON10',
    discount: 10,
    type: 'percentage',
    description: '10% Welcome Offer',
  },
  {
    code: 'STYLE15',
    discount: 15,
    type: 'percentage',
    description: '15% Style Celebration',
  },
  {
    code: 'FREESHIP',
    discount: 0,
    type: 'shipping',
    description: 'Free Shipping',
  },
];

const EMAIL_SERVICE_URL =
  'https://maison-email-service.sreekavya0125.workers.dev';

// Admin email address for new-order alerts.
const ADMIN_NOTIFICATION_EMAIL = 'sreekavya0125@gmail.com';

const escapeEmailHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

async function sendCustomerOrderConfirmationEmail(order) {
  const customerEmail = order.customer?.email?.trim();

  if (!customerEmail) {
    console.warn('Order confirmation email skipped: customer email is missing.');
    return;
  }

  const customerName = escapeEmailHtml(order.customer?.fullName || 'Customer');
  const orderId = escapeEmailHtml(order.orderId || 'MAISON order');
  const total = Number(order.total || 0).toLocaleString('en-IN');
  const paymentMethod = escapeEmailHtml(order.paymentMethod || 'Not specified');
  const productRows = (order.products || [])
    .map((product) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          ${escapeEmailHtml(product.name || 'Product')}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
          ${Math.max(1, Number(product.quantity) || 1)}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
          ₹${(Number(product.price || 0) * Math.max(1, Number(product.quantity) || 1)).toLocaleString('en-IN')}
        </td>
      </tr>
    `)
    .join('');

  try {
    const response = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject: `MAISON order confirmation - ${orderId}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#172B4D;max-width:640px;margin:auto;padding:24px;">
            <h1 style="letter-spacing:3px;">MAISON</h1>
            <h2>Thank you for your order, ${customerName}!</h2>
            <p>Your order has been successfully placed.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr>
                  <th style="padding:10px;text-align:left;border-bottom:2px solid #C6A15B;">Product</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #C6A15B;">Qty</th>
                  <th style="padding:10px;text-align:right;border-bottom:2px solid #C6A15B;">Amount</th>
                </tr>
              </thead>
              <tbody>${productRows}</tbody>
            </table>
            <p><strong>Total:</strong> ₹${total}</p>
            <p><strong>Payment method:</strong> ${paymentMethod}</p>
            <p>We will keep you updated as your order progresses.</p>
            <p style="margin-top:28px;">Thank you for choosing MAISON.</p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('MAISON order confirmation email failed:', result);
      return;
    }

    console.info('MAISON order confirmation email accepted:', result);
  } catch (error) {
    console.error('MAISON order confirmation email error:', error);
  }
}

async function sendAdminNewOrderNotificationEmail(order) {
  const adminEmail = ADMIN_NOTIFICATION_EMAIL;
  const customerName = escapeEmailHtml(order.customer?.fullName || 'Customer');
  const customerEmail = escapeEmailHtml(order.customer?.email || 'Not provided');
  const customerPhone = escapeEmailHtml(order.customer?.phone || 'Not provided');
  const orderId = escapeEmailHtml(order.orderId || 'MAISON order');
  const total = Number(order.total || 0).toLocaleString('en-IN');
  const paymentMethod = escapeEmailHtml(order.paymentMethod || 'Not specified');

  const productRows = (order.products || [])
    .map((product) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">
          ${escapeEmailHtml(product.name || 'Product')}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
          ${Math.max(1, Number(product.quantity) || 1)}
        </td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
          ₹${(Number(product.price || 0) * Math.max(1, Number(product.quantity) || 1)).toLocaleString('en-IN')}
        </td>
      </tr>
    `)
    .join('');

  try {
    const response = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: adminEmail,
        subject: `MAISON - New order received: ${orderId}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#172B4D;max-width:640px;margin:auto;padding:24px;">
            <h1 style="letter-spacing:3px;">MAISON</h1>
            <h2>New order received!</h2>
            <p>A customer has placed a new order on MAISON.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <h3>Customer details</h3>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            <h3>Order details</h3>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr>
                  <th style="padding:10px;text-align:left;border-bottom:2px solid #C6A15B;">Product</th>
                  <th style="padding:10px;text-align:center;border-bottom:2px solid #C6A15B;">Qty</th>
                  <th style="padding:10px;text-align:right;border-bottom:2px solid #C6A15B;">Amount</th>
                </tr>
              </thead>
              <tbody>${productRows}</tbody>
            </table>
            <p><strong>Total:</strong> ₹${total}</p>
            <p><strong>Payment method:</strong> ${paymentMethod}</p>
            <p>Please open the MAISON admin dashboard to manage this order.</p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('MAISON admin new-order email failed:', result);
      return;
    }

    console.info('MAISON admin new-order email accepted:', result);
  } catch (error) {
    console.error('MAISON admin new-order email error:', error);
  }
}

function Checkout({ cart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const stateQuotationOrder = location.state?.quotationOrder || null;
  const quotationOrderId =
    stateQuotationOrder?.orderId ||
    new URLSearchParams(location.search).get('quotationOrder');
  const isQuotationCheckout = Boolean(quotationOrderId);
  const buyNowItems = location.state?.buyNowItems;
  const isBuyNow =
    !isQuotationCheckout &&
    location.state?.checkoutMode === 'buy-now' &&
    Array.isArray(buyNowItems) &&
    buyNowItems.length > 0;

  const [quotationOrder, setQuotationOrder] = useState(
    stateQuotationOrder
  );
  const [loadingQuotationOrder, setLoadingQuotationOrder] = useState(
    isQuotationCheckout && !stateQuotationOrder
  );
  const [quotationOrderError, setQuotationOrderError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: stateQuotationOrder?.customer?.fullName || '',
    email: stateQuotationOrder?.customer?.email || '',
    phone: stateQuotationOrder?.customer?.phone || '',
    address: stateQuotationOrder?.customer?.address || '',
    city: stateQuotationOrder?.customer?.city || '',
    state: stateQuotationOrder?.customer?.state || '',
    pincode: stateQuotationOrder?.customer?.pincode || '',
  });

  useEffect(() => {
    if (!isQuotationCheckout || !quotationOrderId) return undefined;

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setQuotationOrderError(
          'Please sign in to continue payment for this quotation order.'
        );
        setLoadingQuotationOrder(false);
        return;
      }

      try {
        setLoadingQuotationOrder(true);
        const orderSnapshot = await getDoc(
          doc(db, 'orders', quotationOrderId)
        );

        if (!orderSnapshot.exists()) {
          throw new Error('ORDER_NOT_FOUND');
        }

        const order = {
          ...orderSnapshot.data(),
          orderId: orderSnapshot.data().orderId || orderSnapshot.id,
        };

        if (order.userId !== user.uid || order.source !== 'quotation') {
          throw new Error('ORDER_NOT_AVAILABLE');
        }

        if (!active) return;

        setQuotationOrder(order);
        setQuotationOrderError('');
        setFormData((current) => ({
          ...current,
          fullName: order.customer?.fullName || current.fullName,
          email: order.customer?.email || current.email,
          phone: order.customer?.phone || current.phone,
          address: order.customer?.address || current.address,
          city: order.customer?.city || current.city,
          state: order.customer?.state || current.state,
          pincode: order.customer?.pincode || current.pincode,
        }));
      } catch (error) {
        console.error('Quotation checkout loading error:', error);

        if (active) {
          setQuotationOrderError(
            error.message === 'ORDER_NOT_FOUND'
              ? 'This quotation order could not be found.'
              : 'This quotation order is not available for payment.'
          );
        }
      } finally {
        if (active) setLoadingQuotationOrder(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isQuotationCheckout, quotationOrderId]);

  const groupedCart = isQuotationCheckout
    ? quotationOrder?.products || []
    : isBuyNow
      ? buyNowItems.map((product) => ({
          ...product,
          quantity: Math.max(1, Number(product.quantity) || 1),
        }))
      : groupCartItems(cart);

  const calculatedSubtotal = groupedCart.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );

  const subtotal = isQuotationCheckout
    ? Number(quotationOrder?.subtotal) || 0
    : calculatedSubtotal;

  const shipping = isQuotationCheckout
    ? Number(quotationOrder?.shipping) || 0
    : 0;

  const discount = isQuotationCheckout
    ? Number(quotationOrder?.discount) || 0
    : appliedCoupon?.type === 'percentage'
      ? Math.round(subtotal * appliedCoupon.discount / 100)
      : 0;

  const total = isQuotationCheckout
    ? Number(quotationOrder?.total) || 0
    : Math.max(0, subtotal + shipping - discount);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // APPLY COUPON

  const handleApplyCoupon = () => {
    const enteredCode = couponInput.trim().toUpperCase();

    if (!enteredCode) {
      toast.error('Please enter a coupon code.');
      return;
    }

    const coupon = availableCoupons.find(
      item => item.code === enteredCode
    );

    if (!coupon) {
      toast.error('Invalid coupon code.');
      return;
    }

    if (appliedCoupon?.code === coupon.code) {
      toast.error('This coupon is already applied.');
      return;
    }

    setAppliedCoupon(coupon);
    setCouponInput('');

    if (coupon.type === 'shipping') {
      toast.success('Free shipping coupon applied!');
    } else {
      toast.success(`${coupon.discount}% discount applied successfully!`);
    }
  };

  // REMOVE COUPON

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed.');
  };

  // PLACE ORDER AND SAVE TO FIREBASE

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error('Please log in before placing your order.');
      navigate('/login');
      return;
    }

    if (groupedCart.length === 0) {
      toast.error('There are no products to check out.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const selectedPaymentMethod = {
        upi: 'UPI Payment',
        card: 'Credit / Debit Card',
        netbanking: 'Net Banking',
        cod: 'Cash on Delivery',
      }[paymentMethod];
      const paymentStatus = paymentMethod === 'cod' ? 'Due on delivery' : 'Paid';

      if (isQuotationCheckout) {
        if (!quotationOrder?.orderId) {
          throw new Error('QUOTATION_ORDER_NOT_READY');
        }

        const orderRef = doc(db, 'orders', quotationOrder.orderId);
        const updatedOrder = await runTransaction(
          db,
          async (transaction) => {
            const orderSnapshot = await transaction.get(orderRef);

            if (!orderSnapshot.exists()) {
              throw new Error('QUOTATION_ORDER_NOT_FOUND');
            }

            const currentOrder = orderSnapshot.data();

            if (
              currentOrder.userId !== currentUser.uid ||
              currentOrder.source !== 'quotation'
            ) {
              throw new Error('QUOTATION_ORDER_NOT_OWNED');
            }

            if (currentOrder.checkoutCompletedAt) {
              throw new Error('QUOTATION_ORDER_ALREADY_PAID');
            }

            const paymentHistoryEntry = {
              status:
                paymentMethod === 'cod'
                  ? 'Payment Due on Delivery'
                  : 'Payment Received',
              date: now.toISOString(),
              description:
                paymentMethod === 'cod'
                  ? 'Cash on delivery was selected for the accepted quotation.'
                  : `Payment recorded using ${selectedPaymentMethod}.`,
            };
            const invoice = {
              ...(currentOrder.invoice || {}),
              number:
                currentOrder.invoice?.number ||
                `MSN-${now.getFullYear()}-${quotationOrder.orderId
                  .replace(/[^a-z0-9]/gi, '')
                  .slice(-12)}`,
              issuedAt: now.toISOString(),
              paymentStatus,
              tax: Number(currentOrder.invoice?.tax) || 0,
            };
            const trackingHistory = [
              ...(currentOrder.trackingHistory || []),
              paymentHistoryEntry,
            ];

            transaction.update(orderRef, {
              customer: { ...formData },
              paymentMethod: selectedPaymentMethod,
              paymentStatus,
              invoice,
              trackingHistory,
              checkoutCompletedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            return {
              ...currentOrder,
              orderId:
                currentOrder.orderId || quotationOrder.orderId,
              createdAt:
                currentOrder.createdAt?.toDate?.().toISOString() ||
                currentOrder.createdAt ||
                now.toISOString(),
              customer: { ...formData },
              paymentMethod: selectedPaymentMethod,
              paymentStatus,
              invoice,
              trackingHistory,
              checkoutCompletedAt: now.toISOString(),
              updatedAt: now.toISOString(),
            };
          }
        );

        const existingOrders = JSON.parse(
          localStorage.getItem('maison-orders') || '[]'
        );
        const remainingOrders = existingOrders.filter(
          (order) => order.orderId !== updatedOrder.orderId
        );

        localStorage.setItem(
          'maison-orders',
          JSON.stringify([updatedOrder, ...remainingOrders])
        );

        // Send both emails without interrupting checkout.
        await sendCustomerOrderConfirmationEmail(updatedOrder);
        await sendAdminNewOrderNotificationEmail(updatedOrder);

        navigate('/order-confirmation', {
          state: { order: updatedOrder },
        });

        toast.success(
          paymentMethod === 'cod'
            ? 'Cash on delivery confirmed.'
            : 'Payment completed successfully!'
        );
        return;
      }

      const orderId = `MAI${Date.now().toString().slice(-8)}`;

      const order = {
        orderId,

        // Firebase customer identification
        userId: currentUser.uid,

        customer: { ...formData },

        products: groupedCart,
        checkoutMode: isBuyNow ? 'buy-now' : 'cart',

        paymentMethod: selectedPaymentMethod,
        paymentStatus,

        subtotal,
        shipping,

        couponCode: appliedCoupon?.code || null,

        discount,
        total,

        invoice: {
          number: `MSN-${now.getFullYear()}-${orderId.slice(-8)}`,
          issuedAt: now.toISOString(),
          paymentStatus,
          tax: 0,
        },

        orderDate: now.toLocaleDateString('en-IN'),

        orderStatus: 'Order Placed',

        trackingHistory: [
          {
            status: 'Order Placed',
            date: now.toLocaleString('en-IN'),
            description: 'Your order has been successfully placed.',
          },
        ],

        createdAt: serverTimestamp(),
      };

      // SAVE ORDER IN FIRESTORE

      const orderBatch = writeBatch(db);

      orderBatch.set(doc(db, 'orders', order.orderId), order);
      addAdminNotificationWrite(orderBatch, {
        id: adminNotificationIds.order(order.orderId),
        type: ADMIN_NOTIFICATION_TYPES.ORDER_PLACED,
        message: `${formData.fullName || 'A customer'} placed order ${
          order.orderId
        } for ${formatNotificationCurrency(order.total)}.`,
        relatedDocumentId: order.orderId,
        sourceCollection: 'orders',
        targetPage: '/admin-orders',
      });

      await orderBatch.commit();

      // SAVE ORDER IN EXISTING LOCAL STORAGE
      // This preserves the existing tracking functionality.

      const existingOrders = JSON.parse(
        localStorage.getItem('maison-orders') || '[]'
      );

      localStorage.setItem(
        'maison-orders',
        JSON.stringify([order, ...existingOrders])
      );

      // Send both emails without interrupting checkout.
      await sendCustomerOrderConfirmationEmail(order);
      await sendAdminNewOrderNotificationEmail(order);

      // OPEN ORDER CONFIRMATION PAGE

      navigate('/order-confirmation', {
        state: { order },
      });

      toast.success('Order placed successfully!');

    } catch (error) {
      console.error('Order placement error:', error);

      const checkoutErrors = {
        QUOTATION_ORDER_NOT_READY:
          'The quotation order is still loading. Please try again.',
        QUOTATION_ORDER_NOT_FOUND:
          'The confirmed quotation order could not be found.',
        QUOTATION_ORDER_NOT_OWNED:
          'You cannot complete payment for this order.',
        QUOTATION_ORDER_ALREADY_PAID:
          'Payment has already been completed for this order.',
      };

      toast.error(
        checkoutErrors[error.message] ||
          'Unable to place your order. Please try again.'
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  if (isQuotationCheckout && loadingQuotationOrder) {
    return (
      <div className="checkout-empty">
        <SEO
          title="Quotation Payment | MAISON"
          description="Loading your confirmed MAISON quotation order."
          robots="noindex, nofollow"
        />
        <ShoppingBag size={48} />
        <h2>Loading your confirmed order</h2>
        <p>Please wait while MAISON verifies your quotation.</p>
      </div>
    );
  }

  if (isQuotationCheckout && quotationOrderError) {
    return (
      <div className="checkout-empty">
        <SEO
          title="Quotation Payment | MAISON"
          description="Complete payment for your confirmed MAISON quotation order."
          robots="noindex, nofollow"
        />
        <ShoppingBag size={48} />
        <h2>Quotation order unavailable</h2>
        <p>{quotationOrderError}</p>
        <Link to="/quotations#my-quotations">VIEW MY QUOTATIONS</Link>
      </div>
    );
  }

  if (groupedCart.length === 0) {
    return (
      <div className="checkout-empty">

        <SEO
          title="Checkout | MAISON"
          description="Review your MAISON shopping bag and proceed to checkout."
          robots="noindex, nofollow"
        />

        <ShoppingBag size={48} />

        <h2>Your shopping bag is empty</h2>

        <p>
          {isQuotationCheckout
            ? 'This confirmed quotation does not contain any products.'
            : 'Add products before proceeding to checkout.'}
        </p>

        <Link to={isQuotationCheckout ? '/quotations' : '/shop'}>
          {isQuotationCheckout ? 'VIEW MY QUOTATIONS' : 'EXPLORE SHOP'}
        </Link>

      </div>
    );
  }

  return (
    <div className="checkout-page">

      <SEO
        title="Secure Checkout | MAISON Online Shopping"
        description="Complete your MAISON checkout by entering your delivery details, choosing a payment method and reviewing your selected fashion and lifestyle products."
        robots="noindex, nofollow"
      />

      <div className="checkout-header">

        <span className="checkout-eyebrow">
          {isQuotationCheckout
            ? 'MAISON / ACCEPTED QUOTATION / PAYMENT'
            : isBuyNow
              ? 'MAISON / BUY NOW / CHECKOUT'
              : 'MAISON / SHOPPING BAG / CHECKOUT'}
        </span>

        <h1>
          {isQuotationCheckout
            ? 'Complete Quotation Payment'
            : 'Complete Your Order'}
        </h1>

        <p>
          {isQuotationCheckout
            ? `Order ${quotationOrder.orderId} is confirmed. Add delivery details and choose payment.`
            : 'A beautiful shopping experience, right until your doorstep.'}
        </p>

      </div>

      {isQuotationCheckout && (
        <div className="checkout-quotation-banner">
          <Tag size={20} />
          <div>
            <strong>Approved quotation price locked</strong>
            <span>
              The products, discount, and final amount below match the
              quotation accepted by you.
            </span>
          </div>
        </div>
      )}

      <div className="checkout-layout">

        <form
          className="checkout-form-section"
          onSubmit={handleSubmit}
        >

          {/* CUSTOMER DETAILS */}

          <div className="checkout-card">

            <div className="checkout-section-heading">

              <div className="checkout-heading-icon">
                <User size={20} />
              </div>

              <div>
                <h2>Contact Information</h2>
                <p>Enter your personal details.</p>
              </div>

            </div>

            <div className="checkout-form-grid">

              <div className="checkout-field full-width">

                <label>Full Name</label>

                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="checkout-field">

                <label>Email Address</label>

                <div className="checkout-input-icon">

                  <Mail size={17} />

                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              <div className="checkout-field">

                <label>Phone Number</label>

                <div className="checkout-input-icon">

                  <Phone size={17} />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    pattern="[0-9]{10}"
                    title="Enter a valid 10-digit phone number"
                    required
                  />

                </div>

              </div>

            </div>

          </div>

          {/* DELIVERY ADDRESS */}

          <div className="checkout-card">

            <div className="checkout-section-heading">

              <div className="checkout-heading-icon">
                <MapPin size={20} />
              </div>

              <div>
                <h2>Delivery Address</h2>
                <p>Where should we deliver your order?</p>
              </div>

            </div>

            <div className="checkout-form-grid">

              <div className="checkout-field full-width">

                <label>Street Address</label>

                <textarea
                  name="address"
                  placeholder="House number, street and area"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  required
                />

              </div>

              <div className="checkout-field">

                <label>City</label>

                <input
                  type="text"
                  name="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="checkout-field">

                <label>State</label>

                <input
                  type="text"
                  name="state"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="checkout-field">

                <label>PIN Code</label>

                <input
                  type="text"
                  name="pincode"
                  placeholder="6-digit PIN code"
                  value={formData.pincode}
                  onChange={handleChange}
                  pattern="[0-9]{6}"
                  title="Enter a valid 6-digit PIN code"
                  required
                />

              </div>

            </div>

          </div>

          {/* PAYMENT METHODS */}

          <div className="checkout-card">

            <div className="checkout-section-heading">

              <div className="checkout-heading-icon">
                <CreditCard size={20} />
              </div>

              <div>
                <h2>Payment Method</h2>
                <p>Choose how you would like to pay.</p>
              </div>

            </div>

            <div className="checkout-payment-options">

              <label className={`checkout-payment-option ${paymentMethod === 'upi' ? 'selected' : ''}`}>

                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <Wallet size={21} />

                <div>
                  <strong>UPI Payment</strong>
                  <span>Google Pay, PhonePe, Paytm</span>
                </div>

              </label>

              <label className={`checkout-payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}>

                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <CreditCard size={21} />

                <div>
                  <strong>Credit / Debit Card</strong>
                  <span>Visa, Mastercard and RuPay</span>
                </div>

              </label>

              <label className={`checkout-payment-option ${paymentMethod === 'netbanking' ? 'selected' : ''}`}>

                <input
                  type="radio"
                  name="payment"
                  value="netbanking"
                  checked={paymentMethod === 'netbanking'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <CreditCard size={21} />

                <div>
                  <strong>Net Banking</strong>
                  <span>Pay through your bank account</span>
                </div>

              </label>

              <label className={`checkout-payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>

                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <Truck size={21} />

                <div>
                  <strong>Cash on Delivery</strong>
                  <span>Pay when your order arrives</span>
                </div>

              </label>

            </div>

            <div className="checkout-payment-note">

              <ShieldCheck size={17} />

              <span>
                Secure payment options. Actual payment processing
                will be integrated later.
              </span>

            </div>

          </div>

          <button
            type="submit"
            className="checkout-place-order"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? isQuotationCheckout
                ? 'PROCESSING PAYMENT...'
                : 'PLACING YOUR ORDER...'
              : isQuotationCheckout
                ? `PAY CONFIRMED ORDER · ₹${total.toLocaleString('en-IN')}`
                : `PLACE ORDER · ₹${total.toLocaleString('en-IN')}`}
          </button>

          {isQuotationCheckout ? (
            <Link
              to="/quotations#my-quotations"
              className="checkout-back-link"
            >
              <ArrowLeft size={16} />
              Back to My Quotations
            </Link>
          ) : isBuyNow ? (
            <button
              type="button"
              className="checkout-back-link"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Back to Product
            </button>
          ) : (
            <Link to="/cart" className="checkout-back-link">
              <ArrowLeft size={16} />
              Back to Shopping Bag
            </Link>
          )}

        </form>

        {/* ORDER SUMMARY */}

        <aside className="checkout-summary">

          <span className="checkout-summary-eyebrow">
            {isQuotationCheckout
              ? 'ACCEPTED QUOTATION'
              : isBuyNow
                ? 'BUY NOW ITEM'
                : 'YOUR SELECTION'}
          </span>

          <h2>Order Summary</h2>

          <div className="checkout-summary-products">

            {groupedCart.map(product => (

              <div
                className="checkout-summary-product"
                key={
                  product.cartItemKey ||
                  `${product.id}-${product.selectedColor || ''}-${product.selectedSize || ''}`
                }
              >

                <div className="checkout-summary-image">

                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <Package size={24} aria-hidden="true" />
                  )}

                  <span>{product.quantity}</span>

                </div>

                <div className="checkout-summary-product-info">

                  <strong>{product.name}</strong>

                  <ProductRating productId={product.id || product.productId} size="compact" />

                  <span>{product.category}</span>

                  <small>Qty: {product.quantity}</small>

                </div>

                <strong className="checkout-summary-price">
                  ₹{(product.price * product.quantity).toLocaleString('en-IN')}
                </strong>

              </div>

            ))}

          </div>

          <div className="checkout-summary-divider"></div>

          {/* COUPON SECTION */}

          {!isQuotationCheckout && (
            <>
              <div className="checkout-coupon-section">

                <div className="checkout-coupon-heading">

                  <Tag size={19} />

                  <div>
                    <h3>Have a Coupon?</h3>
                    <p>Apply your special MAISON offer.</p>
                  </div>

                </div>

                {!appliedCoupon ? (

                  <div className="checkout-coupon-input">

                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                    >
                      APPLY
                    </button>

                  </div>

                ) : (

                  <div className="checkout-applied-coupon">

                    <div>
                      <strong>
                        {appliedCoupon.code}
                      </strong>

                      <span>
                        {appliedCoupon.description}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      aria-label="Remove coupon"
                      title="Remove coupon"
                    >
                      <X size={18} />
                    </button>

                  </div>

                )}

                <div className="checkout-available-coupons">

                  <span>AVAILABLE OFFERS</span>

                  {availableCoupons.map(coupon => (

                    <div
                      className="checkout-available-coupon"
                      key={coupon.code}
                    >

                      <div>
                        <strong>{coupon.code}</strong>
                        <small>{coupon.description}</small>
                      </div>

                      {appliedCoupon?.code === coupon.code && (
                        <span className="coupon-applied-label">
                          APPLIED
                        </span>
                      )}

                    </div>

                  ))}

                </div>

              </div>

              <div className="checkout-summary-divider"></div>
            </>
          )}

          {/* PRICE DETAILS */}

          <div className="checkout-summary-row">

            <span>Subtotal</span>

            <span>
              ₹{subtotal.toLocaleString('en-IN')}
            </span>

          </div>

          <div className="checkout-summary-row">

            <span>Shipping</span>

            <span className="checkout-free">
              FREE
            </span>

          </div>

          {appliedCoupon?.type === 'shipping' && (

            <div className="checkout-summary-row coupon-discount-row">
              <span>Shipping Coupon</span>
              <span>FREE SHIPPING APPLIED</span>
            </div>

          )}

          {discount > 0 && (

            <div className="checkout-summary-row coupon-discount-row">

              <span>
                {isQuotationCheckout
                  ? `Quotation Discount (${Number(
                      quotationOrder?.discountPercent
                    ) || 0}%)`
                  : `Coupon Discount (${appliedCoupon.code})`}
              </span>

              <span>
                - ₹{discount.toLocaleString('en-IN')}
              </span>

            </div>

          )}

          <div className="checkout-summary-divider"></div>

          <div className="checkout-summary-total">

            <span>Total Amount</span>

            <strong>
              ₹{total.toLocaleString('en-IN')}
            </strong>

          </div>

          {discount > 0 && (

            <div className="checkout-savings-message">
              {isQuotationCheckout
                ? `Your approved quotation includes ₹${discount.toLocaleString(
                    'en-IN'
                  )} in savings.`
                : `You saved ₹${discount.toLocaleString(
                    'en-IN'
                  )} on this order!`}
            </div>

          )}

          <div className="checkout-summary-benefit">

            <Truck size={19} />

            <p>Free delivery on your purchase.</p>

          </div>

          <div className="checkout-summary-benefit">

            <ShieldCheck size={19} />

            <p>Your shopping experience matters to us.</p>

          </div>

        </aside>

      </div>

    </div>
  );
}

export default Checkout;
