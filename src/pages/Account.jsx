import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import toast from 'react-hot-toast';

import {
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from '../firebase';

import {
  UserRound,
  Package,
  MapPin,
  Heart,
  ShoppingBag,
  TicketPercent,
  Settings,
  LogOut,
  ChevronRight,
  Edit3,
  Save,
  X,
  ArrowRight,
  Copy,
  Clock,
  CheckCircle,
  CreditCard,
  RotateCcw,
  FileText,
  Truck,
  Ban,
  ChevronDown,
  Star,
} from 'lucide-react';

import SEO from '../components/SEO';
import InvoiceDrawer from '../components/InvoiceDrawer';
import ProductRating from '../components/ProductRating';

import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
} from '../utils/adminNotifications';

import './Account.css';

const menuItems = [
  { id: 'profile', label: 'Personal Profile', icon: UserRound },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'addresses', label: 'My Addresses', icon: MapPin },
  { id: 'wishlist', label: 'My Wishlist', icon: Heart },
  { id: 'buy-again', label: 'Buy Again', icon: ShoppingBag },
  { id: 'coupons', label: 'My Coupons', icon: TicketPercent },
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

const coupons = [
  {
    code: 'MAISON10',
    title: 'Welcome Offer',
    description: 'Get 10% off on your next purchase.',
    discount: '10% OFF',
    expiry: 'Valid on eligible orders',
  },
  {
    code: 'STYLE15',
    title: 'Style Celebration',
    description: 'Enjoy 15% off on selected products.',
    discount: '15% OFF',
    expiry: 'Valid on eligible orders',
  },
  {
    code: 'FREESHIP',
    title: 'Complimentary Shipping',
    description: 'Enjoy free shipping on your order.',
    discount: 'FREE SHIPPING',
    expiry: 'Valid on eligible orders',
  },
];

const returnReasons = [
  'Product damaged',
  'Product defective',
  'Wrong product received',
  'Wrong size received',
  'Missing parts or accessories',
  'Product does not match description',
  'Other',
];

const cancellationReasons = [
  'Ordered by mistake',
  'Found a better price',
  'Delivery taking too long',
  'Want to change the product',
  'Ordered the wrong product',
  'Other',
];

function formatPrice(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function getOrderDate(order) {
  if (order.createdAt?.toDate) {
    return order.createdAt.toDate().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return order.orderDate || 'Date unavailable';
}

function isDelivered(order) {
  return String(order.orderStatus || '').toLowerCase() === 'delivered';
}

function canCancelOrder(order) {
  const status = String(order.orderStatus || '')
    .trim()
    .toLowerCase();

  return [
    'order placed',
    'order confirmed',
    'processing',
  ].includes(status);
}

function isCurrentOrder(order) {
  const status = String(order.orderStatus || '')
    .trim()
    .toLowerCase();

  return ![
    'cancelled',
    'delivered',
  ].includes(status);
}

function getDeliveryAddress(order) {
  const customer = order.customer || {};

  return [
    customer.address,
    [customer.city, customer.state].filter(Boolean).join(', '),
    customer.pincode,
  ].filter(Boolean).join(' · ') || 'Delivery address unavailable';
}

function getOrderElementId(orderId) {
  return `account-order-${String(orderId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

function Account({ wishlist = [], onAddToCart }) {
  const navigate = useNavigate();
  const location = useLocation();

  const accountSearchParams = new URLSearchParams(location.search);
  const requestedSection = accountSearchParams.get('section');
  const requestedReviewOrder = accountSearchParams.get('reviewOrder');

  const activeSection = menuItems.some((item) => item.id === requestedSection)
    ? requestedSection
    : 'profile';

  const [editing, setEditing] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [activeReturnOrder, setActiveReturnOrder] = useState(null);
  const [activeCancelOrder, setActiveCancelOrder] = useState(null);

  const [cancellationReason, setCancellationReason] = useState('');

  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeFeedbackOrderId, setActiveFeedbackOrderId] = useState(
    requestedReviewOrder || null
  );
  const [submittingReview, setSubmittingReview] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    review: '',
  });

  const [returnForm, setReturnForm] = useState({
    productIndex: '',
    reason: '',
    requestType: 'Refund',
    comments: '',
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // LOAD PROFILE, ORDERS, RETURN REQUESTS AND REVIEWS

  useEffect(() => {
    let active = true;
    let unsubscribeOrders = () => {};
    let unsubscribeReturns = () => {};
    let unsubscribeReviews = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeOrders();
      unsubscribeReturns();
      unsubscribeReviews();
      unsubscribeOrders = () => {};
      unsubscribeReturns = () => {};
      unsubscribeReviews = () => {};

      if (!currentUser) {
        if (active) {
          setOrders([]);
          setReturnRequests([]);
          setReviews([]);
          setLoadingProfile(false);
          setLoadingOrders(false);
          navigate('/login', {
            replace: true,
            state: {
              from: `${window.location.pathname}${window.location.search}`,
            },
          });
        }

        return;
      }

      // LOAD CUSTOMER PROFILE

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (!active) return;

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          const loadedProfile = {
            name:
              userData.name ||
              currentUser.displayName ||
              'MAISON Customer',
            email: currentUser.email || userData.email || '',
            phone: userData.phone || '',
          };

          setProfile(loadedProfile);
          setFormData(loadedProfile);
        } else {
          const defaultProfile = {
            name: currentUser.displayName || 'MAISON Customer',
            email: currentUser.email || '',
            phone: '',
          };

          setProfile(defaultProfile);
          setFormData(defaultProfile);
        }
      } catch (error) {
        console.error('Error loading customer profile:', error);

        if (active) {
          toast.error('Unable to load your profile.');
        }
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }

      // LOAD CUSTOMER ORDERS

      if (!active || auth.currentUser?.uid !== currentUser.uid) return;

      setLoadingOrders(true);

      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeOrders = onSnapshot(
        ordersQuery,
        (orderSnapshot) => {
          if (!active) return;

          const customerOrders = orderSnapshot.docs.map((orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
          }));

          customerOrders.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;
          });

          setOrders(customerOrders);
          setLoadingOrders(false);
        },
        (error) => {
          console.error('Error loading customer orders:', error);

          if (active) {
            setOrders([]);
            setLoadingOrders(false);
            toast.error('Unable to load your orders. Please try again.');
          }
        }
      );

      // LOAD THIS CUSTOMER'S RETURN REQUESTS

      const returnsQuery = query(
        collection(db, 'returnRequests'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeReturns = onSnapshot(
        returnsQuery,
        (returnsSnapshot) => {
          if (!active) return;

          const customerReturns = returnsSnapshot.docs.map((returnDoc) => ({
            id: returnDoc.id,
            ...returnDoc.data(),
          }));

          setReturnRequests(customerReturns);
        },
        (error) => {
          console.error('Error loading customer returns:', error);

          if (active) {
            setReturnRequests([]);
            toast.error('Unable to load your return requests.');
          }
        }
      );

      // LOAD THIS CUSTOMER'S VERIFIED ORDER REVIEWS

      const reviewsQuery = query(
        collection(db, 'customerReviews'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeReviews = onSnapshot(
        reviewsQuery,
        (reviewsSnapshot) => {
          if (!active) return;

          setReviews(
            reviewsSnapshot.docs.map((reviewDoc) => ({
              id: reviewDoc.id,
              ...reviewDoc.data(),
            }))
          );
        },
        (error) => {
          console.error('Error loading customer reviews:', error);

          if (active) {
            setReviews([]);
            toast.error('Unable to load your submitted reviews.');
          }
        }
      );
    });

    return () => {
      active = false;
      unsubscribe();
      unsubscribeOrders();
      unsubscribeReturns();
      unsubscribeReviews();
    };
  }, [navigate]);

  useEffect(() => {
    if (
      !requestedReviewOrder ||
      activeSection !== 'orders' ||
      loadingOrders
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(getOrderElementId(requestedReviewOrder))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, loadingOrders, requestedReviewOrder, orders.length]);

  // PROFILE FORM CHANGE

  const handleProfileChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // SAVE PROFILE

  const saveProfile = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error('Please log in again.');
      navigate('/login');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    try {
      setSavingProfile(true);

      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });

      const updatedProfile = {
        name: formData.name.trim(),
        email: currentUser.email || '',
        phone: formData.phone.trim(),
      };

      setProfile(updatedProfile);
      setFormData(updatedProfile);

      setEditing(false);

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating customer profile:', error);

      toast.error('Unable to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // BUY AGAIN

  const handleBuyAgain = (product) => {
    if (typeof onAddToCart === 'function') {
      onAddToCart({
        ...product,
        quantity: 1,
      });

      toast.success(`${product.name} added to your bag!`);
    } else {
      toast.error('Unable to add this product right now.');
    }
  };

  const openAccountSection = (section) => {
    navigate(
      section === 'profile'
        ? '/account'
        : `/account?section=${encodeURIComponent(section)}`
    );
  };

  const openOrderTracking = (order) => {
    const trackingOrderId = String(
      order.orderId || order.id || ''
    ).trim().toUpperCase();

    const trackingPhone = String(
      order.customer?.phone || profile.phone || ''
    ).replace(/\D/g, '').slice(-10);

    navigate('/track-order', {
      state: {
        orderId: trackingOrderId,
        phone: trackingPhone,
        autoTrack: trackingOrderId.length > 0 && trackingPhone.length === 10,
      },
    });
  };

  // GET UNIQUE PRODUCTS FROM ORDERS

  const getPurchasedProducts = () => {
    const uniqueProducts = new Map();

    orders.forEach((order) => {
      (order.products || []).forEach((product) => {
        const productKey = [
          product.id || product.productId,
          product.selectedColor || '',
          product.selectedSize || '',
        ].join('-');

        if (!uniqueProducts.has(productKey)) {
          uniqueProducts.set(productKey, product);
        }
      });
    });

    return Array.from(uniqueProducts.values());
  };

  // CHECK WHETHER AN ORDER ALREADY HAS A RETURN REQUEST

  const getOrderReturn = (orderId) => {
    return returnRequests.find(
      (request) => request.orderId === orderId
    );
  };

  const getOrderReview = (orderId) => {
    return reviews.find(
      (review) => review.orderId === orderId || review.id === orderId
    );
  };

  const openFeedbackForm = (order) => {
    if (!isDelivered(order)) {
      toast.error('Reviews are available after delivery.');
      return;
    }

    if (getOrderReview(order.id)) {
      toast.success('You already reviewed this order.');
      return;
    }

    setActiveCancelOrder(null);
    setActiveReturnOrder(null);
    setActiveFeedbackOrderId(order.id);
    setReviewForm({ rating: 0, review: '' });
  };

  const closeFeedbackForm = () => {
    if (submittingReview) return;

    setActiveFeedbackOrderId(null);
    setReviewForm({ rating: 0, review: '' });
  };

  const submitReview = async (event, order) => {
    event.preventDefault();

    const currentUser = auth.currentUser;
    const reviewText = reviewForm.review.trim();

    if (!currentUser) {
      toast.error('Please log in again to submit your review.');
      return;
    }

    if (getOrderReview(order.id)) {
      toast.success('Review already submitted.');
      closeFeedbackForm();
      return;
    }

    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast.error('Please select a star rating.');
      return;
    }

    if (reviewText.length < 10) {
      toast.error('Please write at least 10 characters about your experience.');
      return;
    }

    if (reviewText.length > 2000) {
      toast.error('Your review must be 2,000 characters or fewer.');
      return;
    }

    try {
      setSubmittingReview(true);

      const orderSnapshot = await getDoc(doc(db, 'orders', order.id));

      if (!orderSnapshot.exists()) {
        toast.error('This order could not be found.');
        return;
      }

      const latestOrder = orderSnapshot.data();

      if (
        latestOrder.userId !== currentUser.uid ||
        String(latestOrder.orderStatus || '').toLowerCase() !== 'delivered'
      ) {
        toast.error('Only your own delivered orders can be reviewed.');
        return;
      }

      const reviewedProducts = Array.isArray(latestOrder.products)
        ? latestOrder.products
        : [];
      const hasVerifiedProductIds =
        reviewedProducts.length > 0 &&
        reviewedProducts.every((product) => {
          const productId = product?.id ?? product?.productId;
          return productId !== undefined && productId !== null && String(productId).trim();
        });

      if (!hasVerifiedProductIds) {
        toast.error('This order is missing product information needed for a review.');
        return;
      }

      const verifiedCustomerName = [
        latestOrder.customer?.fullName,
        latestOrder.customer?.name,
        profile.name,
        currentUser.displayName,
      ]
        .map((name) => String(name || '').trim())
        .find(
          (name) =>
            name &&
            !['customer', 'maison customer'].includes(name.toLowerCase())
        );

      if (!verifiedCustomerName) {
        toast.error('Please add your name to your account before submitting a review.');
        return;
      }

      const reviewData = {
        userId: currentUser.uid,
        orderId: order.id,
        orderReference: latestOrder.orderId || order.id,
        customerName: verifiedCustomerName,
        customerEmail: currentUser.email || '',
        productSummary: (latestOrder.products || [])
          .map((product) => product.name)
          .filter(Boolean)
          .join(', ')
          .slice(0, 500),
        products: reviewedProducts,
        orderTotal: Number(latestOrder.total || 0),
        rating: reviewForm.rating,
        review: reviewText,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const reviewRef = doc(db, 'customerReviews', order.id);
      const reviewBatch = writeBatch(db);

      reviewBatch.set(reviewRef, reviewData);

      addAdminNotificationWrite(reviewBatch, {
        id: adminNotificationIds.customerReview(order.id),
        type: ADMIN_NOTIFICATION_TYPES.CUSTOMER_REVIEW,
        message: `${reviewData.customerName} submitted a ${reviewData.rating}-star review for order ${reviewData.orderReference}.`,
        relatedDocumentId: order.id,
        sourceCollection: 'customerReviews',
        targetPage: '/admin-customer-reviews',
      });

      await reviewBatch.commit();

      setReviews((previous) => [
        ...previous.filter((review) => review.id !== order.id),
        {
          id: order.id,
          ...reviewData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      setActiveFeedbackOrderId(null);
      setReviewForm({ rating: 0, review: '' });
      toast.success('Thank you. Your review has been submitted!');
    } catch (error) {
      console.error('Error submitting customer review:', error);

      if (error.code === 'permission-denied') {
        toast.error(
          'This review was not accepted. It may already exist or the order is not eligible.'
        );
      } else {
        toast.error('Unable to submit your review. Please try again.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // OPEN CANCELLATION FORM

  const openCancelForm = (order) => {
    if (!canCancelOrder(order)) {
      toast.error('This order is no longer eligible for cancellation.');
      return;
    }

    setActiveReturnOrder(null);
    setActiveFeedbackOrderId(null);
    setActiveCancelOrder(order);
    setCancellationReason('');
  };

  // CLOSE CANCELLATION FORM

  const closeCancelForm = () => {
    if (cancellingOrder) return;

    setActiveCancelOrder(null);
    setCancellationReason('');
  };

  // CANCEL ORDER AND NOTIFY ADMIN

  const submitCancellation = async (event) => {
    event.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser || !activeCancelOrder) {
      toast.error('Please log in again.');
      return;
    }

    if (!cancellationReason) {
      toast.error('Please select a cancellation reason.');
      return;
    }

    if (!canCancelOrder(activeCancelOrder)) {
      toast.error('This order can no longer be cancelled.');
      closeCancelForm();
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this order? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setCancellingOrder(true);

      const orderRef = doc(db, 'orders', activeCancelOrder.id);

      const orderReference =
        activeCancelOrder.orderId || activeCancelOrder.id;

      const customerName =
        profile.name ||
        currentUser.displayName ||
        'A customer';

      // CREATE A FIRESTORE BATCH

      const cancellationBatch = writeBatch(db);

      // UPDATE THE ORDER

      cancellationBatch.update(orderRef, {
        orderStatus: 'Cancelled',
        cancellationReason,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // CREATE ADMIN NOTIFICATION

      addAdminNotificationWrite(cancellationBatch, {
        id: adminNotificationIds.orderCancellation(
          activeCancelOrder.id
        ),

        type: ADMIN_NOTIFICATION_TYPES.ORDER_CANCELLED,

        message: `${customerName} cancelled order ${orderReference}. Reason: ${cancellationReason}.`,

        relatedDocumentId: activeCancelOrder.id,

        sourceCollection: 'orders',

        targetPage: '/admin-orders',
      });

      // SAVE ORDER UPDATE AND NOTIFICATION TOGETHER

      await cancellationBatch.commit();

      // UPDATE THE CUSTOMER'S ORDER LIST

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === activeCancelOrder.id
            ? {
                ...order,
                orderStatus: 'Cancelled',
                cancellationReason,
                cancelledAt: new Date(),
              }
            : order
        )
      );

      toast.success(
        'Your order has been cancelled successfully.'
      );

      setActiveCancelOrder(null);
      setCancellationReason('');

    } catch (error) {
      console.error('Error cancelling order and notifying admin:', error);

      if (error.code === 'permission-denied') {
        toast.error(
          'Cancellation was rejected by Firebase. Please check your Firestore security rules.'
        );
      } else {
        toast.error(
          'Unable to cancel your order. Please try again.'
        );
      }
    } finally {
      setCancellingOrder(false);
    }
  };

  // OPEN RETURN FORM

  const openReturnForm = (order) => {
    if (!isDelivered(order)) {
      toast.error('Only delivered orders can be returned.');
      return;
    }

    if (getOrderReturn(order.id)) {
      toast.error('A return request already exists for this order.');
      return;
    }

    setActiveCancelOrder(null);
    setActiveFeedbackOrderId(null);
    setActiveReturnOrder(order);

    setReturnForm({
      productIndex: '',
      reason: '',
      requestType: 'Refund',
      comments: '',
    });
  };

  // CLOSE RETURN FORM

  const closeReturnForm = () => {
    setActiveReturnOrder(null);

    setReturnForm({
      productIndex: '',
      reason: '',
      requestType: 'Refund',
      comments: '',
    });
  };

  // HANDLE RETURN FORM CHANGES

  const handleReturnFormChange = (event) => {
    setReturnForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  // SUBMIT RETURN REQUEST TO FIREBASE

  const submitReturnRequest = async (event) => {
    event.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser || !activeReturnOrder) {
      toast.error('Please log in again.');
      return;
    }

    if (!isDelivered(activeReturnOrder)) {
      toast.error('Only delivered orders can be returned.');
      return;
    }

    if (
      returnForm.productIndex === '' ||
      !returnForm.reason ||
      !returnForm.requestType
    ) {
      toast.error('Please complete all required fields.');
      return;
    }

    const selectedProduct =
      activeReturnOrder.products[
        Number(returnForm.productIndex)
      ];

    if (!selectedProduct) {
      toast.error('Please select a valid product.');
      return;
    }

    if (getOrderReturn(activeReturnOrder.id)) {
      toast.error('A return request already exists for this order.');
      closeReturnForm();
      return;
    }

    try {
      setSubmittingReturn(true);

      const requestedAt = new Date().toISOString();

      const initialTrackingStatus =
        returnForm.requestType === 'Replacement'
          ? 'Replacement Requested'
          : 'Return Requested';

      const requestData = {
        userId: currentUser.uid,

        customerName: profile.name || currentUser.displayName || '',
        customerEmail: currentUser.email || '',
        customerPhone: profile.phone || '',

        orderId: activeReturnOrder.id,
        orderReference:
          activeReturnOrder.orderId || activeReturnOrder.id,

        product: {
          id: selectedProduct.id || selectedProduct.productId || '',
          name: selectedProduct.name || 'MAISON Product',
          image: selectedProduct.image || '',
          price: Number(selectedProduct.price || 0),
          quantity: Number(selectedProduct.quantity || 1),
          selectedColor: selectedProduct.selectedColor || '',
          selectedSize: selectedProduct.selectedSize || '',
        },

        reason: returnForm.reason,
        requestType: returnForm.requestType,
        comments: returnForm.comments.trim(),

        status: 'Return Requested',

        trackingHistory: [
          {
            status: initialTrackingStatus,
            date: requestedAt,
            description:
              returnForm.requestType === 'Replacement'
                ? 'Your replacement request has been submitted to MAISON.'
                : returnForm.requestType === 'Return'
                  ? 'Your return request has been submitted to MAISON.'
                  : 'Your return and refund request has been submitted to MAISON.',
          },
        ],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const requestRef = doc(collection(db, 'returnRequests'));
      const requestBatch = writeBatch(db);

      requestBatch.set(requestRef, requestData);

      addAdminNotificationWrite(requestBatch, {
        id: adminNotificationIds.returnRequest(requestRef.id),
        type: ADMIN_NOTIFICATION_TYPES.RETURN_REQUESTED,
        message: `${requestData.customerName || 'A customer'} submitted a ${
          requestData.requestType.toLowerCase()
        } request for order ${requestData.orderReference}.`,
        relatedDocumentId: requestRef.id,
        sourceCollection: 'returnRequests',
        targetPage: '/admin-return-requests',
      });

      await requestBatch.commit();

      const newRequest = {
        id: requestRef.id,
        ...requestData,
        createdAt: new Date(),
      };

      setReturnRequests((previous) => [
        ...previous,
        newRequest,
      ]);

      toast.success('Your return request has been submitted!');

      closeReturnForm();

    } catch (error) {
      console.error('Error submitting return request:', error);

      toast.error(
        'Unable to submit your request. Please try again.'
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  // COPY COUPON

  const copyCoupon = async (code) => {
    try {
      await navigator.clipboard.writeText(code);

      toast.success('Coupon code copied!');
    } catch {
      toast.error('Could not copy the coupon code.');
    }
  };

  // CUSTOMER LOGOUT

  const handleLogout = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to logout?'
    );

    if (confirmed) {
      try {
        await signOut(auth);

        toast.success('You have been logged out.');

        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);

        toast.error('Unable to logout. Please try again.');
      }
    }
  };

  // ACCOUNT CONTENT

  const currentOrderCount = orders.filter(isCurrentOrder).length;
  const previousOrderCount = orders.length - currentOrderCount;

  const renderContent = () => {
    switch (activeSection) {

      // PERSONAL PROFILE

      case 'profile':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>YOUR INFORMATION</span>
                <h2>Personal Profile</h2>
                <p>
                  Manage your personal details and contact information.
                </p>
              </div>

              {!editing && (
                <button
                  className="account-edit-button"
                  onClick={() => {
                    setFormData(profile);
                    setEditing(true);
                  }}
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
            </div>

            {loadingProfile ? (
              <div className="account-empty-state">
                <h3>Loading your profile...</h3>
                <p>Please wait while we retrieve your information.</p>
              </div>
            ) : (
              <>
                <div className="account-profile-card">
                  <div className="account-avatar">
                    <UserRound size={35} />
                  </div>

                  <div>
                    <h3>{profile.name}</h3>
                    <p>MAISON Member</p>
                  </div>
                </div>

                {editing ? (
                  <div className="account-form">

                    <label>
                      Full Name

                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleProfileChange}
                        placeholder="Enter your full name"
                      />
                    </label>

                    <label>
                      Email Address

                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        readOnly
                      />
                    </label>

                    <label>
                      Phone Number

                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleProfileChange}
                        placeholder="Enter your phone number"
                      />
                    </label>

                    <div className="account-form-actions">

                      <button
                        onClick={saveProfile}
                        disabled={savingProfile}
                      >
                        <Save size={16} />

                        {savingProfile
                          ? 'Saving...'
                          : 'Save Changes'}
                      </button>

                      <button
                        className="account-cancel-button"
                        onClick={() => {
                          setFormData(profile);
                          setEditing(false);
                        }}
                        disabled={savingProfile}
                      >
                        <X size={16} /> Cancel
                      </button>

                    </div>
                  </div>
                ) : (
                  <div className="account-details-grid">

                    <div>
                      <span>FULL NAME</span>
                      <strong>{profile.name}</strong>
                    </div>

                    <div>
                      <span>EMAIL ADDRESS</span>
                      <strong>
                        {profile.email || 'Not added yet'}
                      </strong>
                    </div>

                    <div>
                      <span>PHONE NUMBER</span>
                      <strong>
                        {profile.phone || 'Not added yet'}
                      </strong>
                    </div>

                  </div>
                )}
              </>
            )}

          </section>
        );

      // MY ORDERS

      case 'orders':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>YOUR PURCHASE HISTORY</span>
                <h2>My Orders</h2>
                <p>
                  View your orders, track deliveries, request returns and share feedback.
                </p>
              </div>
            </div>

            {!loadingOrders && orders.length > 0 && (
              <div className="account-orders-overview" aria-label="Order summary">
                <div>
                  <span>CURRENT ORDERS</span>
                  <strong>{currentOrderCount}</strong>
                </div>

                <div>
                  <span>PREVIOUS ORDERS</span>
                  <strong>{previousOrderCount}</strong>
                </div>
              </div>
            )}

            {loadingOrders ? (
              <div className="account-empty-state">
                <Package size={38} />

                <h3>Loading your orders...</h3>

                <p>
                  Please wait while we retrieve your purchase history.
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="account-empty-state">
                <ShoppingBag size={38} />

                <h3>No orders yet</h3>

                <p>
                  Your purchases will appear here after you place an order.
                </p>

                <Link to="/shop">
                  EXPLORE SHOP
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const existingReturn = getOrderReturn(order.id);
                const existingReview = getOrderReview(order.id);
                const delivered = isDelivered(order);
                const eligibleForCancellation = canCancelOrder(order);
                const cancelled =
                  String(order.orderStatus || '').toLowerCase() === 'cancelled';
                const isExpanded = expandedOrderId === order.id;
                const trackingHistory = Array.isArray(order.trackingHistory)
                  ? order.trackingHistory
                  : [];
                const latestTrackingUpdate = trackingHistory.at(-1);
                const detailsId = `account-order-details-${String(order.id)
                  .replace(/[^a-zA-Z0-9_-]/g, '')}`;

                return (
                  <div
                    className="account-order-card"
                    key={order.id}
                    id={getOrderElementId(order.id)}
                  >

                    <div className="account-order-top">

                      <div>
                        <span>ORDER ID</span>

                        <h3>
                          {order.orderId || order.id}
                        </h3>

                        <p>
                          <Clock size={14} />
                          {getOrderDate(order)}
                        </p>
                      </div>

                      <span
                        className="account-order-status"
                        style={
                          cancelled
                            ? {
                                background: '#FCE8E8',
                                color: '#A83232',
                              }
                            : {}
                        }
                      >
                        {cancelled ? (
                          <Ban size={14} />
                        ) : (
                          <CheckCircle size={14} />
                        )}

                        {order.orderStatus || 'Order Placed'}
                      </span>

                    </div>

                    <div className="account-order-products">

                      {(order.products || []).map((product, index) => (
                        <div
                          key={`${product.id || product.productId}-${index}`}
                        >

                          <img
                            src={
                              product.image ||
                              'https://placehold.co/100x120?text=MAISON'
                            }
                            alt={product.name || 'MAISON Product'}
                          />

                          <div>
                            <span>{product.name}</span>

                            <ProductRating
                              productId={product.id || product.productId}
                              size="compact"
                            />

                            {product.selectedColor && (
                              <small>
                                Colour: {product.selectedColor}
                              </small>
                            )}

                            {product.selectedSize && (
                              <small>
                                Size: {product.selectedSize}
                              </small>
                            )}

                            <small>
                              Qty: {product.quantity || 1}
                              {' · '}
                              ₹{formatPrice(product.price)} each
                            </small>
                          </div>

                        </div>
                      ))}

                    </div>

                    <div className="account-order-bottom">

                      <strong>
                        ₹{formatPrice(order.total)}
                      </strong>

                      <div className="account-order-actions">

                        <button
                          type="button"
                          className="account-details-button"
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          onClick={() => setExpandedOrderId(
                            isExpanded ? null : order.id
                          )}
                        >
                          <ChevronDown
                            className={isExpanded ? 'expanded' : ''}
                            size={15}
                          />
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>

                        <button
                          type="button"
                          className="account-track-button"
                          onClick={() => openOrderTracking(order)}
                        >
                          <Truck size={15} />
                          Track Order
                        </button>

                        <button
                          type="button"
                          className="account-invoice-button"
                          onClick={() => setInvoiceOrder(order)}
                        >
                          <FileText size={15} />
                          Invoice
                        </button>

                        <button
                          onClick={() => {
                            (order.products || []).forEach(
                              handleBuyAgain
                            );
                          }}
                        >
                          <ShoppingBag size={15} />
                          Buy Again
                        </button>

                      </div>

                    </div>

                    {isExpanded && (
                      <section
                        className="account-order-details"
                        id={detailsId}
                        aria-label={`Details for order ${order.orderId || order.id}`}
                      >
                        <div className="account-order-details-heading">
                          <span>ORDER &amp; DELIVERY DETAILS</span>
                          <strong>
                            <Truck size={15} />
                            {order.orderStatus || 'Order Placed'}
                          </strong>
                        </div>

                        <div className="account-order-details-grid">
                          <div>
                            <span>PAYMENT</span>
                            <strong>{order.paymentMethod || 'Not available'}</strong>
                            <small>{order.paymentStatus || 'Status pending'}</small>
                          </div>

                          <div>
                            <span>COURIER</span>
                            <strong>{order.courier || 'To be assigned'}</strong>
                            <small>{order.trackingId || 'Tracking ID pending'}</small>
                          </div>

                          <div>
                            <span>SHIPPED ON</span>
                            <strong>
                              {cancelled
                                ? 'Not applicable'
                                : order.shippedDate || 'Not shipped yet'}
                            </strong>
                          </div>

                          <div>
                            <span>ESTIMATED DELIVERY</span>
                            <strong>
                              {cancelled
                                ? 'Not applicable'
                                : delivered
                                  ? 'Delivered'
                                  : order.estimatedDate || 'To be confirmed'}
                            </strong>
                          </div>
                        </div>

                        <div className="account-order-address">
                          <MapPin size={18} />
                          <div>
                            <span>DELIVERY ADDRESS</span>
                            <strong>{getDeliveryAddress(order)}</strong>
                          </div>
                        </div>

                        {latestTrackingUpdate && (
                          <div className="account-order-latest-update">
                            <Clock size={16} />
                            <div>
                              <span>LATEST UPDATE</span>
                              <strong>
                                {latestTrackingUpdate.description ||
                                  latestTrackingUpdate.status}
                              </strong>
                              {latestTrackingUpdate.date && (
                                <small>{latestTrackingUpdate.date}</small>
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {/* VERIFIED CUSTOMER FEEDBACK */}

                    {delivered && existingReview ? (
                      <div className="account-review-submitted">
                        <CheckCircle size={18} />
                        <div>
                          <strong>Review Submitted</strong>
                          <span>
                            {existingReview.rating}/5 stars · Thank you for your feedback
                          </span>
                        </div>
                      </div>
                    ) : delivered ? (
                      <button
                        type="button"
                        className="account-review-button"
                        onClick={() => openFeedbackForm(order)}
                      >
                        <Star size={16} />
                        Rate &amp; Review
                      </button>
                    ) : null}

                    {delivered &&
                      !existingReview &&
                      activeFeedbackOrderId === order.id && (
                        <section className="account-feedback-section">
                          <div className="account-feedback-heading">
                            <div>
                              <span>MAISON CUSTOMER FEEDBACK</span>
                              <h3>Rate Your Experience</h3>
                              <p>
                                Tell us about the products, delivery and your
                                overall MAISON experience.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={closeFeedbackForm}
                              disabled={submittingReview}
                              aria-label="Close review form"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <form
                            className="account-feedback-form"
                            onSubmit={(event) => submitReview(event, order)}
                          >
                            <fieldset>
                              <legend>Overall rating</legend>
                              <div
                                className="account-star-rating"
                                role="group"
                                aria-label="Choose a rating from 1 to 5 stars"
                              >
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <button
                                    type="button"
                                    key={rating}
                                    className={
                                      reviewForm.rating >= rating
                                        ? 'selected'
                                        : ''
                                    }
                                    onClick={() => setReviewForm((previous) => ({
                                      ...previous,
                                      rating,
                                    }))}
                                    aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                                    aria-pressed={reviewForm.rating === rating}
                                  >
                                    <Star
                                      size={29}
                                      fill={
                                        reviewForm.rating >= rating
                                          ? 'currentColor'
                                          : 'none'
                                      }
                                    />
                                  </button>
                                ))}
                              </div>
                              <span className="account-rating-label">
                                {reviewForm.rating > 0
                                  ? `${reviewForm.rating} out of 5 stars`
                                  : 'Select your rating'}
                              </span>
                            </fieldset>

                            <label htmlFor={`review-${order.id}`}>
                              Written review
                              <textarea
                                id={`review-${order.id}`}
                                value={reviewForm.review}
                                onChange={(event) => setReviewForm((previous) => ({
                                  ...previous,
                                  review: event.target.value,
                                }))}
                                minLength={10}
                                maxLength={2000}
                                rows={5}
                                placeholder="What stood out about your MAISON experience?"
                                required
                              />
                              <small>
                                {reviewForm.review.length}/2000 characters
                              </small>
                            </label>

                            <div className="account-feedback-actions">
                              <button
                                type="submit"
                                disabled={
                                  submittingReview || reviewForm.rating === 0
                                }
                              >
                                <Star size={16} />
                                {submittingReview
                                  ? 'Submitting...'
                                  : 'Submit Review'}
                              </button>
                              <button
                                type="button"
                                onClick={closeFeedbackForm}
                                disabled={submittingReview}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </section>
                      )}

                    {/* CANCEL ORDER OPTION */}

                    {eligibleForCancellation && !existingReturn && (
                      <button
                        type="button"
                        className="account-return-button"
                        style={{
                          background: '#fff5f5',
                          color: '#a83232',
                          borderColor: '#e7bcbc',
                        }}
                        onClick={() => openCancelForm(order)}
                      >
                        <Ban size={15} />
                        Cancel Order
                      </button>
                    )}

                    {/* CANCELLED ORDER DETAILS */}

                    {cancelled && (
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '15px',
                          background: '#fff5f5',
                          border: '1px solid #f0d2d2',
                          borderRadius: '8px',
                        }}
                      >
                        <strong style={{ color: '#a83232' }}>
                          This order has been cancelled.
                        </strong>

                        {order.cancellationReason && (
                          <p style={{ margin: '8px 0 0', color: '#555' }}>
                            Reason: {order.cancellationReason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* CANCELLATION FORM */}

                    {activeCancelOrder?.id === order.id && (
                      <div
                        className="account-return-section"
                        style={{
                          border: '1px solid #e7bcbc',
                          background: '#fffafa',
                        }}
                      >

                        <h3>Cancel Your Order</h3>

                        <p className="account-return-description">
                          Please tell us why you want to cancel this order.
                          Your cancellation will be submitted immediately
                          after confirmation.
                        </p>

                        <form
                          className="account-return-form"
                          onSubmit={submitCancellation}
                        >

                          <label>
                            Select Cancellation Reason

                            <select
                              value={cancellationReason}
                              onChange={(event) =>
                                setCancellationReason(event.target.value)
                              }
                              required
                            >
                              <option value="">
                                Choose a reason
                              </option>

                              {cancellationReasons.map((reason) => (
                                <option
                                  key={reason}
                                  value={reason}
                                >
                                  {reason}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="account-return-actions">

                            <button
                              type="submit"
                              className="account-return-submit"
                              style={{
                                background: '#a83232',
                                borderColor: '#a83232',
                              }}
                              disabled={cancellingOrder}
                            >
                              <Ban size={15} />

                              {cancellingOrder
                                ? 'Cancelling...'
                                : 'Confirm Cancellation'}
                            </button>

                            <button
                              type="button"
                              className="account-return-cancel"
                              onClick={closeCancelForm}
                              disabled={cancellingOrder}
                            >
                              Keep Order
                            </button>

                          </div>

                        </form>

                      </div>
                    )}

                    {/* RETURN REQUEST OPTION */}

                    {delivered && !existingReturn && (
                      <button
                        className="account-return-button"
                        onClick={() => openReturnForm(order)}
                      >
                        <RotateCcw size={15} />
                        Return / Replace
                      </button>
                    )}

                    {existingReturn && (
                      <div className="account-return-existing">
                        <strong>Return request submitted</strong>

                        <p>
                          Request ID: {existingReturn.id}
                        </p>

                        <p>
                          Status: {existingReturn.status}
                        </p>

                        <p>
                          Request type: {existingReturn.requestType}
                        </p>
                      </div>
                    )}

                    {!delivered && !existingReturn && !cancelled && (
                      <p className="account-demo-note">
                        Return requests are available after an order
                        has been delivered.
                      </p>
                    )}

                    {/* RETURN REQUEST FORM */}

                    {activeReturnOrder?.id === order.id && (
                      <div className="account-return-section">

                        <h3>Return / Replace Request</h3>

                        <p className="account-return-description">
                          Tell us why you want to return or replace
                          this product. Our team will review your request.
                        </p>

                        <form
                          className="account-return-form"
                          onSubmit={submitReturnRequest}
                        >

                          <label>
                            Select Product

                            <select
                              name="productIndex"
                              value={returnForm.productIndex}
                              onChange={handleReturnFormChange}
                              required
                            >
                              <option value="">
                                Choose a product
                              </option>

                              {(order.products || []).map(
                                (product, index) => (
                                  <option
                                    key={`${product.id || product.productId}-${index}`}
                                    value={index}
                                  >
                                    {product.name || 'MAISON Product'}
                                    {' - '}
                                    Qty: {product.quantity || 1}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            Reason for Return

                            <select
                              name="reason"
                              value={returnForm.reason}
                              onChange={handleReturnFormChange}
                              required
                            >
                              <option value="">
                                Select a reason
                              </option>

                              {returnReasons.map((reason) => (
                                <option
                                  key={reason}
                                  value={reason}
                                >
                                  {reason}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div>
                            <label>
                              What would you prefer?
                            </label>

                            <div className="account-return-choice">

                              <label>
                                <input
                                  type="radio"
                                  name="requestType"
                                  value="Refund"
                                  checked={
                                    returnForm.requestType === 'Refund'
                                  }
                                  onChange={handleReturnFormChange}
                                />

                                <span>Return & Refund</span>
                              </label>

                              <label>
                                <input
                                  type="radio"
                                  name="requestType"
                                  value="Replacement"
                                  checked={
                                    returnForm.requestType === 'Replacement'
                                  }
                                  onChange={handleReturnFormChange}
                                />

                                <span>Replacement</span>
                              </label>

                              <label>
                                <input
                                  type="radio"
                                  name="requestType"
                                  value="Return"
                                  checked={
                                    returnForm.requestType === 'Return'
                                  }
                                  onChange={handleReturnFormChange}
                                />

                                <span>Return Only</span>
                              </label>

                            </div>
                          </div>

                          <label>
                            Additional Comments (Optional)

                            <textarea
                              name="comments"
                              value={returnForm.comments}
                              onChange={handleReturnFormChange}
                              placeholder="Tell us more about the issue..."
                              rows={4}
                              maxLength={1000}
                            />
                          </label>

                          <div className="account-return-actions">

                            <button
                              type="submit"
                              className="account-return-submit"
                              disabled={submittingReturn}
                            >
                              <RotateCcw size={15} />

                              {submittingReturn
                                ? 'Submitting...'
                                : 'Submit Request'}
                            </button>

                            <button
                              type="button"
                              className="account-return-cancel"
                              onClick={closeReturnForm}
                              disabled={submittingReturn}
                            >
                              Cancel
                            </button>

                          </div>

                        </form>

                      </div>
                    )}

                  </div>
                );
              })
            )}

          </section>
        );

      // ADDRESSES

      case 'addresses':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>DELIVERY INFORMATION</span>
                <h2>My Addresses</h2>
                <p>Manage your saved delivery addresses.</p>
              </div>
            </div>

            <div className="account-feature-card">
              <MapPin size={32} />

              <h3>Manage Your Addresses</h3>

              <p>
                Add, edit, or remove your delivery addresses.
              </p>

              <Link to="/my-addresses">
                VIEW MY ADDRESSES <ArrowRight size={16} />
              </Link>
            </div>

          </section>
        );

      // WISHLIST

      case 'wishlist':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>YOUR FAVOURITES</span>
                <h2>My Wishlist</h2>
                <p>
                  Your favourite pieces, saved in one place.
                </p>
              </div>

              <Link
                to="/wishlist"
                className="account-text-link"
              >
                VIEW ALL <ArrowRight size={15} />
              </Link>
            </div>

            {wishlist.length === 0 ? (
              <div className="account-empty-state">
                <Heart size={38} />

                <h3>Your wishlist is empty</h3>

                <p>
                  Save the products you love and find them here.
                </p>

                <Link to="/shop">
                  EXPLORE SHOP
                </Link>
              </div>
            ) : (
              <div className="account-product-grid">

                {wishlist.slice(0, 4).map((product) => (
                  <div
                    className="account-product-card"
                    key={product.id}
                  >

                    <Link to={`/product/${product.id}`}>
                      <img
                        src={product.image}
                        alt={product.name}
                      />
                    </Link>

                    <span>{product.category}</span>

                    <h3>{product.name}</h3>

                    <ProductRating productId={product.id} size="compact" />

                    <strong>
                      ₹{formatPrice(product.price)}
                    </strong>

                  </div>
                ))}

              </div>
            )}

          </section>
        );

      // BUY AGAIN

      case 'buy-again': {
        const purchasedProducts = getPurchasedProducts();

        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>YOUR REPEAT FAVOURITES</span>

                <h2>Buy Again</h2>

                <p>
                  Shop products from your previous orders again.
                </p>
              </div>
            </div>

            {loadingOrders ? (
              <div className="account-empty-state">
                <h3>Loading previous purchases...</h3>
              </div>
            ) : purchasedProducts.length === 0 ? (
              <div className="account-empty-state">
                <ShoppingBag size={38} />

                <h3>No previous purchases</h3>

                <p>
                  Products you purchase will appear here.
                </p>

                <Link to="/shop">
                  EXPLORE SHOP
                </Link>
              </div>
            ) : (
              <div className="account-product-grid">

                {purchasedProducts.map((product, index) => (
                  <div
                    className="account-product-card"
                    key={`${product.id || product.productId}-${index}`}
                  >

                    <Link
                      to={`/product/${product.id || product.productId}`}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                      />
                    </Link>

                    <span>{product.category}</span>

                    <h3>{product.name}</h3>

                    <ProductRating
                      productId={product.id || product.productId}
                      size="compact"
                    />

                    <strong>
                      ₹{formatPrice(product.price)}
                    </strong>

                    <button
                      onClick={() => handleBuyAgain(product)}
                    >
                      <ShoppingBag size={15} />
                      ADD TO BAG
                    </button>

                  </div>
                ))}

              </div>
            )}

          </section>
        );
      }

      // COUPONS

      case 'coupons':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>EXCLUSIVE SAVINGS</span>

                <h2>My Coupons</h2>

                <p>
                  Discover available offers for your next purchase.
                </p>
              </div>
            </div>

            <div className="account-coupon-grid">

              {coupons.map((coupon) => (
                <div
                  className="account-coupon-card"
                  key={coupon.code}
                >

                  <div className="account-coupon-discount">
                    {coupon.discount}
                  </div>

                  <div className="account-coupon-info">

                    <h3>{coupon.title}</h3>

                    <p>{coupon.description}</p>

                    <small>{coupon.expiry}</small>

                    <button
                      onClick={() => copyCoupon(coupon.code)}
                    >
                      <Copy size={15} />
                      {coupon.code}
                    </button>

                  </div>

                </div>
              ))}

            </div>

            <p className="account-demo-note">
              These are demonstration coupons. They are not
              connected to checkout yet.
            </p>

          </section>
        );

      // SETTINGS

      case 'settings':
        return (
          <section className="account-panel">

            <div className="account-panel-heading">
              <div>
                <span>ACCOUNT PREFERENCES</span>

                <h2>Account Settings</h2>

                <p>Manage your account preferences.</p>
              </div>
            </div>

            <div className="account-settings-list">

              <div>

                <div className="account-settings-icon">
                  <UserRound size={20} />
                </div>

                <div>
                  <h3>Personal Information</h3>

                  <p>
                    Update your name, email and phone number.
                  </p>
                </div>

                <button
                  onClick={() => openAccountSection('profile')}
                >
                  EDIT <ChevronRight size={17} />
                </button>

              </div>

              <div>

                <div className="account-settings-icon">
                  <MapPin size={20} />
                </div>

                <div>
                  <h3>Address Management</h3>

                  <p>Manage your delivery addresses.</p>
                </div>

                <Link to="/my-addresses">
                  MANAGE <ChevronRight size={17} />
                </Link>

              </div>

              <div>

                <div className="account-settings-icon">
                  <CreditCard size={20} />
                </div>

                <div>
                  <h3>Payment Preferences</h3>

                  <p>
                    Payment management will be available
                    after integration.
                  </p>
                </div>

                <span className="account-coming-soon">
                  COMING SOON
                </span>

              </div>

            </div>

          </section>
        );

      default:
        return null;
    }
  };

  return (
    <main className="account-page">

      <SEO
        title="My Account | MAISON"
        description="Manage your MAISON profile, orders, addresses and favourites."
        robots="noindex, nofollow"
      />

      {/* ACCOUNT HERO */}

      <section className="account-hero">

        <div>
          <span>WELCOME TO YOUR MAISON</span>

          <h1>
            My <i>Account.</i>
          </h1>

          <p>
            Your personal space to manage your shopping experience.
          </p>
        </div>

        <div className="account-hero-icon">
          <UserRound size={38} />
        </div>

      </section>

      {/* ACCOUNT MAIN */}

      <section className="account-main-layout">

        {/* SIDEBAR */}

        <aside className="account-sidebar">

          <div className="account-sidebar-user">

            <div className="account-sidebar-avatar">
              <UserRound size={27} />
            </div>

            <div>
              <span>WELCOME BACK</span>

              <h3>
                {loadingProfile ? 'Loading...' : profile.name}
              </h3>
            </div>

          </div>

          <div className="account-menu-heading">
            MY ACCOUNT
          </div>

          <nav className="account-menu">

            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className={
                    activeSection === item.id ? 'active' : ''
                  }
                  onClick={() => {
                    openAccountSection(item.id);
                    setEditing(false);
                    closeReturnForm();
                    closeCancelForm();
                    closeFeedbackForm();
                  }}
                >
                  <Icon size={19} />

                  <span>{item.label}</span>

                  <ChevronRight size={16} />
                </button>
              );
            })}

          </nav>

          <button
            className="account-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            Logout
          </button>

        </aside>

        {/* ACCOUNT CONTENT */}

        <div className="account-content">
          {renderContent()}
        </div>

      </section>

      <InvoiceDrawer
        open={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
      />

    </main>
  );
}

export default Account;
