import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  CircleDollarSign,
  Clock,
  MapPin,
  Package,
  RefreshCcw,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import SEO from '../components/SEO';
import './TrackOrder.css';

const originalOrderTrackingSteps = [
  {
    label: 'Order Placed',
    journeyLabel: 'ORIGINAL ORDER JOURNEY',
    statuses: ['Order Placed', 'Pending'],
    description: 'Your original order was placed successfully.',
    icon: Package,
  },
  {
    label: 'Order Confirmed',
    statuses: ['Confirmed', 'Order Confirmed'],
    description: 'Your original order was confirmed by MAISON.',
    icon: CheckCircle,
  },
  {
    label: 'Processing',
    statuses: ['Processing'],
    description: 'Your original order is being prepared for dispatch.',
    icon: Clock,
  },
  {
    label: 'Shipped',
    statuses: ['Shipped'],
    description: 'Your original order was handed to the courier.',
    icon: Package,
  },
  {
    label: 'In Transit',
    statuses: ['In Transit'],
    description: 'Your original order is moving toward your address.',
    icon: Truck,
  },
  {
    label: 'Out for Delivery',
    statuses: ['Out for Delivery'],
    description: 'Your original order is out for delivery.',
    icon: Truck,
  },
  {
    label: 'Delivered',
    statuses: ['Delivered'],
    description: 'Your original order was delivered successfully.',
    icon: CheckCircle,
  },
];

const replacementTrackingSteps = [
  {
    label: 'Replacement Requested',
    journeyLabel: 'REPLACEMENT JOURNEY',
    statuses: ['Replacement Requested', 'Return Requested', 'Under Review'],
    description: 'Your replacement request was received by MAISON.',
    icon: RotateCcw,
  },
  {
    label: 'Accepted',
    statuses: ['Approved', 'Replacement Accepted'],
    description: 'Your replacement request was accepted.',
    icon: CheckCircle,
  },
  {
    label: 'Processing',
    statuses: ['Replacement Processing'],
    description: 'Your replacement item is being prepared.',
    icon: Clock,
  },
  {
    label: 'Shipped',
    statuses: ['Replacement Shipped'],
    description: 'Your replacement item was shipped.',
    icon: Package,
  },
  {
    label: 'In Transit',
    statuses: ['Replacement In Transit'],
    description: 'Your replacement is moving toward your address.',
    icon: Truck,
  },
  {
    label: 'Out for Delivery',
    statuses: ['Replacement Out for Delivery'],
    description: 'Your replacement is out for delivery.',
    icon: Truck,
  },
  {
    label: 'Replacement Delivered',
    statuses: ['Replacement Delivered'],
    description: 'Your replacement was delivered successfully.',
    icon: MapPin,
  },
];

const returnTrackingSteps = [
  {
    label: 'Return Requested',
    journeyLabel: 'RETURN JOURNEY',
    statuses: ['Return Requested', 'Under Review'],
    description: 'Your return request was received by MAISON.',
    icon: RotateCcw,
  },
  {
    label: 'Accepted',
    statuses: ['Approved', 'Return Accepted'],
    description: 'Your return request was accepted.',
    icon: CheckCircle,
  },
  {
    label: 'Pickup Scheduled',
    statuses: ['Pickup Scheduled'],
    description: 'Pickup was scheduled for your item.',
    icon: Clock,
  },
  {
    label: 'Product Picked Up',
    statuses: ['Product Picked Up'],
    description: 'The item was collected from your address.',
    icon: Truck,
  },
  {
    label: 'Product Received',
    statuses: ['Product Received'],
    description: 'MAISON received your returned item.',
    icon: Package,
  },
  {
    label: 'Return Completed',
    statuses: ['Return Completed'],
    description: 'Your return was completed successfully.',
    icon: CheckCircle,
  },
];

const refundTrackingSteps = [
  {
    label: 'Refund Requested',
    journeyLabel: 'REFUND JOURNEY',
    statuses: ['Return Requested', 'Under Review'],
    description: 'Your return and refund request was received.',
    icon: RotateCcw,
  },
  {
    label: 'Accepted',
    statuses: ['Approved', 'Return Accepted'],
    description: 'Your return request was accepted.',
    icon: CheckCircle,
  },
  {
    label: 'Pickup Scheduled',
    statuses: ['Pickup Scheduled'],
    description: 'Pickup was scheduled for your item.',
    icon: Clock,
  },
  {
    label: 'Product Picked Up',
    statuses: ['Product Picked Up'],
    description: 'The item was collected from your address.',
    icon: Truck,
  },
  {
    label: 'Product Received',
    statuses: ['Product Received'],
    description: 'MAISON received your returned item.',
    icon: Package,
  },
  {
    label: 'Refund Initiated',
    statuses: ['Refund Initiated'],
    description: 'Your refund was initiated.',
    icon: CircleDollarSign,
  },
  {
    label: 'Refund Completed',
    statuses: ['Refund Completed'],
    description: 'Your refund was completed successfully.',
    icon: CheckCircle,
  },
];

const getServiceTrackingConfig = (requestType) => {
  if (requestType === 'Replacement') {
    return {
      title: 'Replacement Tracking',
      steps: replacementTrackingSteps,
      icon: RefreshCcw,
    };
  }

  if (requestType === 'Return') {
    return {
      title: 'Return Tracking',
      steps: returnTrackingSteps,
      icon: RotateCcw,
    };
  }

  return {
    title: 'Refund Tracking',
    steps: refundTrackingSteps,
    icon: CircleDollarSign,
  };
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const normalizePhoneNumber = (value) =>
  String(value || '').replace(/\D/g, '').slice(-10);

const getDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTrackingDate = (value) => {
  const date = getDate(value);

  if (!date) return value ? String(value) : '';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const findHistoryEntry = (history, statuses) => {
  const acceptedStatuses = statuses.map(normalizeStatus);

  return [...history]
    .reverse()
    .find((entry) =>
      acceptedStatuses.includes(normalizeStatus(entry?.status))
    );
};

const getCurrentStepIndex = (steps, currentStatus, history) => {
  const normalizedCurrentStatus = normalizeStatus(currentStatus);
  const directIndex = steps.findIndex((step) =>
    step.statuses.map(normalizeStatus).includes(normalizedCurrentStatus)
  );

  if (directIndex >= 0) return directIndex;

  return steps.reduce((highestIndex, step, index) => {
    return findHistoryEntry(history, step.statuses)
      ? Math.max(highestIndex, index)
      : highestIndex;
  }, 0);
};

function TrackingTimeline({
  steps,
  currentStatus,
  history = [],
  createdAt,
  updatedAt,
  rejected = false,
}) {
  const currentStepIndex = getCurrentStepIndex(
    steps,
    currentStatus,
    history
  );

  return (
    <div className="track-order-timeline">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const historyEntry = findHistoryEntry(history, step.statuses);
        const isCompleted = index <= currentStepIndex;
        const isCurrent = !rejected && index === currentStepIndex;
        const fallbackDate =
          index === 0
            ? createdAt
            : isCurrent
              ? updatedAt
              : null;
        const trackingDate = historyEntry?.date || fallbackDate;

        return (
          <div
            className={`track-order-timeline-item ${
              isCompleted ? 'completed' : ''
            } ${isCurrent ? 'current' : ''}`}
            key={`${step.label}-${index}`}
          >
            <div className="track-order-timeline-icon">
              <StepIcon size={20} />
            </div>

            <div className="track-order-timeline-content">
              {step.journeyLabel && (
                <span className="track-order-journey-label">
                  {step.journeyLabel}
                </span>
              )}

              <h3>{step.label}</h3>
              <p>{historyEntry?.description || step.description}</p>

              {trackingDate && isCompleted && (
                <time className="track-order-timeline-date">
                  {formatTrackingDate(trackingDate)}
                </time>
              )}

              {isCurrent && (
                <span className="track-order-current-label">
                  CURRENT STATUS
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackOrder() {
  const location = useLocation();
  const linkedOrderId = String(
    location.state?.orderId || ''
  ).trim().toUpperCase();
  const linkedPhone = normalizePhoneNumber(location.state?.phone);
  const linkedUserId = auth.currentUser?.uid || '';
  const canAutoTrackLinkedOrder = Boolean(
    location.state?.autoTrack &&
    linkedOrderId &&
    linkedPhone.length === 10 &&
    linkedUserId
  );
  const [orderId, setOrderId] = useState(linkedOrderId);
  const [phone, setPhone] = useState(linkedPhone);
  const [order, setOrder] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [searched, setSearched] = useState(canAutoTrackLinkedOrder);
  const [searching, setSearching] = useState(canAutoTrackLinkedOrder);
  const [trackingSearch, setTrackingSearch] = useState(
    canAutoTrackLinkedOrder
      ? {
          orderId: linkedOrderId,
          phone: linkedPhone,
          userId: linkedUserId,
        }
      : null
  );

  useEffect(() => {
    if (!trackingSearch) return undefined;

    const orderRef = doc(db, 'orders', trackingSearch.orderId);

    return onSnapshot(
      orderRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setOrder(null);
          setSearching(false);
          return;
        }

        const orderData = snapshot.data();
        const registeredPhone = normalizePhoneNumber(
          orderData.customer?.phone
        );

        if (
          registeredPhone !== trackingSearch.phone ||
          orderData.userId !== trackingSearch.userId
        ) {
          setOrder(null);
          setSearching(false);
          return;
        }

        setOrder({
          firestoreId: snapshot.id,
          ...orderData,
        });
        setSearching(false);
      },
      (error) => {
        console.error('Track order error:', error);
        setOrder(null);
        setSearching(false);
        toast.error('Unable to retrieve this order. Please try again.');
      }
    );
  }, [trackingSearch]);

  useEffect(() => {
    if (!order || !trackingSearch) return undefined;

    const requestsQuery = query(
      collection(db, 'returnRequests'),
      where('userId', '==', trackingSearch.userId)
    );

    return onSnapshot(
      requestsQuery,
      (snapshot) => {
        const orderReferences = new Set(
          [order.firestoreId, order.orderId, trackingSearch.orderId]
            .filter(Boolean)
            .map((value) => String(value).toUpperCase())
        );

        const matchingRequests = snapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
          .filter((request) =>
            [request.orderId, request.orderReference]
              .filter(Boolean)
              .some((reference) =>
                orderReferences.has(String(reference).toUpperCase())
              )
          )
          .sort(
            (first, second) =>
              (getDate(first.createdAt)?.getTime() || 0) -
              (getDate(second.createdAt)?.getTime() || 0)
          );

        setServiceRequests(matchingRequests);
      },
      (error) => {
        console.error('Return tracking error:', error);
        setServiceRequests([]);
        toast.error('Unable to load replacement or refund tracking.');
      }
    );
  }, [order, trackingSearch]);

  const orderHistory = Array.isArray(order?.trackingHistory)
    ? order.trackingHistory
    : [];

  const handleTrackOrder = (event) => {
    event.preventDefault();

    const currentUser = auth.currentUser;
    const enteredOrderId = orderId.trim().toUpperCase();
    const enteredPhone = normalizePhoneNumber(phone);

    if (!enteredOrderId || enteredPhone.length !== 10) {
      toast.error('Please enter your order ID and 10-digit phone number.');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to track your order.');
      return;
    }

    setOrder(null);
    setServiceRequests([]);
    setSearched(true);
    setSearching(true);
    setTrackingSearch({
      orderId: enteredOrderId,
      phone: enteredPhone,
      userId: currentUser.uid,
    });
  };

  return (
    <div className="track-order-page">
      <SEO
        title="Track Your Order | MAISON"
        description="Track your original MAISON order, replacements, returns and refunds in real time."
        robots="noindex, nofollow"
      />

      <section className="track-order-hero">
        <span className="track-order-eyebrow">
          MAISON · ORDER TRACKING
        </span>
        <h1>
          Every Order, <span>One Step Closer.</span>
        </h1>
        <p>
          Track the original delivery and every replacement, return or refund
          from one order reference.
        </p>
      </section>

      <section className="track-order-search-section">
        <div className="track-order-search-card">
          <div className="track-order-search-icon">
            <Package size={27} />
          </div>
          <h2>Track Your Order</h2>
          <p>Enter the original order ID and registered phone number.</p>

          <form onSubmit={handleTrackOrder}>
            <div className="track-order-field">
              <label htmlFor="track-order-id">Original Order ID</label>
              <input
                id="track-order-id"
                type="text"
                placeholder="Example: MAI12345678"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                required
              />
            </div>

            <div className="track-order-field">
              <label htmlFor="track-order-phone">
                Registered Phone Number
              </label>
              <input
                id="track-order-phone"
                type="tel"
                placeholder="Enter your 10-digit phone number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]{10}"
                title="Enter a valid 10-digit phone number"
                required
              />
            </div>

            <button
              type="submit"
              className="track-order-button"
              disabled={searching}
            >
              {searching ? 'CHECKING ORDER...' : 'TRACK MY ORDER'}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>

      {searched && !order && !searching && (
        <div className="track-order-not-found">
          <Package size={38} />
          <h2>We Couldn't Find Your Order</h2>
          <p>
            Check the original order ID, phone number and signed-in account.
          </p>
        </div>
      )}

      {searching && (
        <div className="track-order-not-found">
          <Clock size={38} />
          <h2>Checking Your Order</h2>
          <p>Please wait while we retrieve the complete order journey.</p>
        </div>
      )}

      {order && (
        <section className="track-order-result track-order-result-compact">
          <article className="track-order-original-summary">
            <div className="track-order-summary-main">
              <div className="track-order-summary-visual">
                {order.products?.[0]?.image ? (
                  <img
                    src={order.products[0].image}
                    alt={order.products[0].name || 'MAISON product'}
                  />
                ) : (
                  <Package size={25} />
                )}
              </div>

              <div className="track-order-summary-copy">
                <span>ORIGINAL ORDER</span>
                <h2>
                  Original Order – {order.orderStatus || 'Order Placed'}
                </h2>
                <p>
                  {order.products?.length || 0}{' '}
                  {(order.products?.length || 0) === 1 ? 'item' : 'items'}
                  {' · '}
                  Order {order.orderId || order.firestoreId}
                </p>
              </div>
            </div>

            <div className="track-order-summary-meta">
              <div>
                <span>ORDER DATE</span>
                <strong>
                  {order.orderDate || formatTrackingDate(order.createdAt)}
                </strong>
              </div>
              <div>
                <span>
                  {normalizeStatus(order.orderStatus) === 'delivered'
                    ? 'DELIVERED TO'
                    : 'DELIVERY TO'}
                </span>
                <strong>
                  {order.customer?.fullName || 'Customer'}
                  {order.customer?.city ? `, ${order.customer.city}` : ''}
                </strong>
              </div>
              <div>
                <span>ORDER TOTAL</span>
                <strong>
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </article>

          {serviceRequests.length === 0 && (
            <div className="track-order-after-sales">
              <article className="track-order-service-card track-order-order-card">
                <div className="track-order-service-header">
                  <div>
                    <span>COMPLETE ORDER JOURNEY</span>
                    <h3>Order Tracking</h3>
                    <p>Live updates for your original MAISON order.</p>
                  </div>

                  <div className="track-order-service-status">
                    <Package size={15} />
                    {order.orderStatus || 'Order Placed'}
                  </div>
                </div>

                <TrackingTimeline
                  steps={originalOrderTrackingSteps}
                  currentStatus={order.orderStatus || 'Order Placed'}
                  history={orderHistory}
                  createdAt={order.createdAt}
                  updatedAt={order.updatedAt}
                />
              </article>
            </div>
          )}

          {serviceRequests.length > 0 && (
            <div className="track-order-after-sales">
              {serviceRequests.map((request) => {
                const trackingConfig = getServiceTrackingConfig(
                  request.requestType
                );
                const StatusIcon = trackingConfig.icon;
                const requestHistory = Array.isArray(request.trackingHistory)
                  ? request.trackingHistory
                  : [];
                const completeJourneySteps = [
                  ...originalOrderTrackingSteps,
                  ...trackingConfig.steps,
                ];
                const completeJourneyHistory = [
                  ...orderHistory,
                  ...requestHistory,
                ];
                const rejected = request.status === 'Rejected';

                return (
                  <article
                    className="track-order-service-card"
                    key={request.id}
                  >
                    <div className="track-order-service-header">
                      <div>
                        <span>AFTER-SALES UPDATE</span>
                        <h3>{trackingConfig.title}</h3>
                        <p>
                          {request.product?.name || 'MAISON product'}
                          {' · '}
                          Request {request.id.slice(0, 12).toUpperCase()}
                        </p>
                      </div>

                      <div
                        className={`track-order-service-status ${
                          rejected ? 'rejected' : ''
                        }`}
                      >
                        <StatusIcon size={15} />
                        {request.status || 'Return Requested'}
                      </div>
                    </div>

                    <div className="track-order-service-meta">
                      <div>
                        <span>REQUEST TYPE</span>
                        <strong>{request.requestType}</strong>
                      </div>
                      <div>
                        <span>REASON</span>
                        <strong>{request.reason || 'Not specified'}</strong>
                      </div>
                      <div>
                        <span>REQUESTED ON</span>
                        <strong>{formatTrackingDate(request.createdAt)}</strong>
                      </div>
                    </div>

                    {rejected && (
                      <div className="track-order-service-rejected">
                        <XCircle size={18} />
                        <span>
                          This request was not accepted. Contact MAISON support
                          if you need more information.
                        </span>
                      </div>
                    )}

                    <TrackingTimeline
                      steps={completeJourneySteps}
                      currentStatus={request.status || 'Return Requested'}
                      history={completeJourneyHistory}
                      createdAt={order.createdAt}
                      updatedAt={request.updatedAt}
                      rejected={rejected}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="track-order-bottom">
        <p>Need help with your order?</p>
        <Link to="/help">
          VISIT HELP CENTRE
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default TrackOrder;
