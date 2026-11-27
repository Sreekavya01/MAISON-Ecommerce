import { useState, useEffect } from 'react';

import {
  Truck,
  Package,
  Search,
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  ArrowRight,
  Ban,
  Copy,
  Check,
} from 'lucide-react';

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase';
import toast from 'react-hot-toast';

import './ShippingManagement.css';

const statuses = [
  'Processing',
  'Order Placed',
  'Order Confirmed',
  'Shipped',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Delayed',
];

const courierOptions = [
  'BlueDart',
  'Delhivery',
  'DTDC',
  'India Post',
  'Ecom Express',
  'Other',
];

const shipmentProgressSteps = [
  'Order Placed',
  'Processing',
  'Shipped',
  'In Transit',
  'Out for Delivery',
  'Delivered',
];

const formatDateInputValue = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
};

const formatShipmentDate = date =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const writeTextToClipboard = async text => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a temporary text area below.
    }
  }

  const textArea = document.createElement('textarea');

  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);

  try {
    textArea.select();

    if (!document.execCommand('copy')) {
      throw new Error('COPY_FAILED');
    }
  } finally {
    textArea.remove();
  }
};

const getShipmentProgressIndex = shipment => {
  const getIndex = status => {
    const normalisedStatus = String(status || '').toLowerCase();

    if (
      [
        'pending',
        'confirmed',
        'order confirmed',
      ].includes(normalisedStatus)
    ) {
      return 0;
    }

    return shipmentProgressSteps.findIndex(
      step => step.toLowerCase() === normalisedStatus
    );
  };

  const currentIndex = getIndex(shipment.status);

  if (currentIndex >= 0) return currentIndex;

  return (shipment.trackingHistory || []).reduce(
    (furthestIndex, historyItem) =>
      Math.max(furthestIndex, getIndex(historyItem.status)),
    0
  );
};

const getCreatedAtMillis = createdAt => {
  if (!createdAt) return null;

  try {
    if (typeof createdAt.toMillis === 'function') {
      const milliseconds = createdAt.toMillis();

      return Number.isFinite(milliseconds)
        ? milliseconds
        : null;
    }

    if (typeof createdAt.toDate === 'function') {
      const milliseconds = createdAt.toDate().getTime();

      return Number.isFinite(milliseconds)
        ? milliseconds
        : null;
    }

    if (typeof createdAt.seconds === 'number') {
      const milliseconds =
        createdAt.seconds * 1000 +
        Math.floor((createdAt.nanoseconds || 0) / 1000000);

      return Number.isFinite(milliseconds)
        ? milliseconds
        : null;
    }

    const milliseconds =
      createdAt instanceof Date
        ? createdAt.getTime()
        : new Date(createdAt).getTime();

    return Number.isFinite(milliseconds)
      ? milliseconds
      : null;
  } catch {
    return null;
  }
};

const sortShipmentsNewestFirst = (first, second) => {
  const firstCreatedAt = getCreatedAtMillis(first.createdAt);
  const secondCreatedAt = getCreatedAtMillis(second.createdAt);

  if (firstCreatedAt === null && secondCreatedAt === null) {
    return String(second.firestoreId || second.id).localeCompare(
      String(first.firestoreId || first.id)
    );
  }

  if (firstCreatedAt === null) return 1;
  if (secondCreatedAt === null) return -1;

  return (
    secondCreatedAt - firstCreatedAt ||
    String(second.firestoreId || second.id).localeCompare(
      String(first.firestoreId || first.id)
    )
  );
};

const convertOrderToShipment = (order, documentId) => {
  const customer = order.customer || {};

  const productNames = (order.products || [])
    .map(item => item.name || item.product?.name || 'Product')
    .join(', ');

  return {
    id: `ORDER-${documentId}`,
    firestoreId: documentId,
    createdAt: order.createdAt || null,

    orderId: order.orderId || documentId,

    customer:
      customer.fullName || customer.name || 'Customer',

    customerEmail:
      customer.email ||
      order.customerEmail ||
      order.email ||
      '',

    product: productNames || 'Customer Order',

    courier: order.courier || '',
    trackingId: order.trackingId || '',

    shippedDate: order.shippedDate || '',
    shippedDateISO: order.shippedDateISO || '',

    estimatedDate: order.estimatedDate || '',
    estimatedDateISO: order.estimatedDateISO || '',

    status: order.orderStatus || 'Order Placed',
    trackingHistory: Array.isArray(order.trackingHistory)
      ? order.trackingHistory
      : [],

    cancellationReason: order.cancellationReason || '',
    cancelledAt: order.cancelledAt || null,

    address: [
      customer.address,
      customer.city,
      customer.state,
      customer.pincode,
    ]
      .filter(Boolean)
      .join(', ') || 'Address not available',

    source: 'customer-order',
  };
};

// FORMAT CANCELLATION DATE

const formatCancellationDate = date => {
  if (!date) return 'Date unavailable';

  try {
    const parsedDate = date?.toDate
      ? date.toDate()
      : new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Date unavailable';
  }
};

// SEND CUSTOMER SHIPPING EMAIL THROUGH AN AUTHENTICATED FIREBASE FUNCTION

const requestShippingUpdateEmail = httpsCallable(
  functions,
  'sendShippingUpdateEmail'
);

const sendCustomerShippingUpdateEmail = async (
  shipment,
  newStatus
) => {
  const customerEmail = String(
    shipment.customerEmail || ''
  ).trim();

  if (!customerEmail) {
    return {
      success: false,
      reason: 'missing-email',
    };
  }

  try {
    const response = await requestShippingUpdateEmail({
      orderId: shipment.firestoreId,
      status: newStatus,
    });

    return {
      success: response.data?.success === true,
      providerId: response.data?.providerId || null,
    };
  } catch (error) {
    console.error('Shipping email function error:', {
      code: error.code,
      message: error.message,
    });

    return {
      success: false,
      reason:
        error.message ||
        'The secure shipping email service is unavailable.',
    };
  }
};

function ShippingManagement() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [addressExpanded, setAddressExpanded] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);

  const openShipmentDetails = shipment => {
    setAddressExpanded(false);
    setTrackingCopied(false);
    setSelectedShipment(shipment);
  };

  const copyTrackingId = async () => {
    const trackingId = selectedShipment?.trackingId?.trim();

    if (!trackingId) {
      toast.error('Add a tracking ID before copying.');
      return;
    }

    try {
      await writeTextToClipboard(trackingId);

      setTrackingCopied(true);
      toast.success('Tracking ID copied.');
    } catch (error) {
      console.error('Tracking ID copy error:', error);
      toast.error('Unable to copy the tracking ID.');
    }
  };

  // LOAD CUSTOMER ORDERS FROM FIREBASE

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),

      snapshot => {
        const firebaseShipments = snapshot.docs
          .map(document =>
            convertOrderToShipment(
              document.data(),
              document.id
            )
          )
          .sort(sortShipmentsNewestFirst);

        setShipments(firebaseShipments);

        setSelectedShipment(previous => {
          if (!previous) return previous;

          return (
            firebaseShipments.find(
              shipment => shipment.id === previous.id
            ) || null
          );
        });

        setLoading(false);
      },

      error => {
        console.error('Shipping orders error:', error);

        toast.error('Unable to load shipping orders.');

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // UPDATE SHIPMENT INFORMATION

  const updateShipment = async (shipmentId, changes) => {
    const shipment = shipments.find(
      item => item.id === shipmentId
    );

    if (!shipment) return;

    // NEVER MODIFY CANCELLED SHIPMENTS

    if (shipment.status === 'Cancelled') {
      toast.error(
        'Shipping details cannot be changed for cancelled orders.'
      );

      return;
    }

    if (shipment.source !== 'customer-order') {
      setShipments(previous =>
        previous.map(item =>
          item.id === shipmentId
            ? { ...item, ...changes }
            : item
        )
      );

      setSelectedShipment(previous =>
        previous?.id === shipmentId
          ? { ...previous, ...changes }
          : previous
      );

      return;
    }

    try {
      await updateDoc(
        doc(db, 'orders', shipment.firestoreId),
        {
          ...changes,
          updatedAt: serverTimestamp(),
        }
      );

      toast.success('Shipment details saved.');
    } catch (error) {
      console.error('Shipment update error:', error);

      toast.error('Unable to save shipment details.');
    }
  };

  // UPDATE SHIPMENT STATUS

  const updateStatus = async (shipmentId, newStatus) => {
    const shipment = shipments.find(
      item => item.id === shipmentId
    );

    if (!shipment) return;

    // BLOCK CANCELLED ORDERS

    if (shipment.status === 'Cancelled') {
      toast.error(
        'Cancelled orders cannot be shipped or reactivated.'
      );

      return;
    }

    if (shipment.status === newStatus) return;

    if (shipment.source !== 'customer-order') {
      setShipments(previous =>
        previous.map(item =>
          item.id === shipmentId
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSelectedShipment(previous =>
        previous?.id === shipmentId
          ? { ...previous, status: newStatus }
          : previous
      );

      return;
    }

    const historyEntry = {
      status: newStatus,
      date: new Date().toLocaleString('en-IN'),
      description:
        `Your order status has been updated to ${newStatus}.`,
    };

    try {
      const orderUpdate = {
        orderStatus: newStatus,
        trackingHistory: arrayUnion(historyEntry),
        updatedAt: serverTimestamp(),
      };

      if (
        newStatus === 'Shipped' &&
        !shipment.shippedDateISO &&
        !shipment.shippedDate
      ) {
        const shippedAt = new Date();

        orderUpdate.shippedDateISO =
          formatDateInputValue(shippedAt);
        orderUpdate.shippedDate =
          formatShipmentDate(shippedAt);
      }

      await updateDoc(
        doc(db, 'orders', shipment.firestoreId),
        orderUpdate
      );

      toast.success('Shipment status updated successfully.');

      if (['Shipped', 'Delivered'].includes(newStatus)) {
        const emailResult =
          await sendCustomerShippingUpdateEmail(
            shipment,
            newStatus
          );

        if (emailResult.success) {
          toast.success(
            `Customer ${newStatus.toLowerCase()} email sent.`
          );
        } else if (
          emailResult.reason === 'missing-email'
        ) {
          toast.error(
            'Status saved, but customer email is missing.'
          );
        } else {
          toast.error(
            'Status saved, but the email could not be sent.'
          );
        }
      }
    } catch (error) {
      console.error('Status update error:', error);

      toast.error('Unable to update shipment status.');
    }
  };

  // SEARCH AND FILTER

  const filteredShipments = shipments.filter(shipment => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      String(shipment.orderId || '')
        .toLowerCase()
        .includes(search) ||
      String(shipment.customer || '')
        .toLowerCase()
        .includes(search) ||
      String(shipment.trackingId || '')
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      statusFilter === 'All' ||
      shipment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // STATUS STYLING

  const getStatusClass = status => {
    if (status === 'Cancelled') return 'cancelled';

    return status.toLowerCase().replaceAll(' ', '-');
  };

  // STATISTICS

  const deliveredCount = shipments.filter(
    item => item.status === 'Delivered'
  ).length;

  const transitCount = shipments.filter(
    item =>
      ['Shipped', 'In Transit', 'Out for Delivery'].includes(
        item.status
      )
  ).length;

  const processingCount = shipments.filter(
    item =>
      ['Processing', 'Order Placed', 'Order Confirmed'].includes(
        item.status
      )
  ).length;

  const delayedCount = shipments.filter(
    item => item.status === 'Delayed'
  ).length;

  const cancelledCount = shipments.filter(
    item => item.status === 'Cancelled'
  ).length;

  const selectedProgressIndex = selectedShipment
    ? getShipmentProgressIndex(selectedShipment)
    : 0;

  const selectedProgressPercent =
    shipmentProgressSteps.length > 1
      ? (selectedProgressIndex /
          (shipmentProgressSteps.length - 1)) *
        100
      : 0;

  const selectedAddress =
    selectedShipment?.address || 'Address not available';

  const addressNeedsExpansion = selectedAddress.length > 78;

  const displayedAddress =
    addressExpanded || !addressNeedsExpansion
      ? selectedAddress
      : selectedAddress.slice(0, 78).trimEnd() + '…';

  return (
    <div className="shipping-management">

      {/* PAGE HEADER */}

      <div className="shipping-header">

        <div>
          <span className="shipping-breadcrumb">
            MAISON / ADMIN / SHIPPING
          </span>

          <h1>Shipping Management</h1>

          <p>
            Manage deliveries, monitor shipments and track customer orders.
          </p>
        </div>

        <div className="shipping-header-icon">
          <Truck size={30} />
        </div>

      </div>

      {/* STATISTICS */}

      <section className="shipping-stats">

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon navy">
            <Package size={22} />
          </div>

          <span>Total Shipments</span>
          <h2>{shipments.length}</h2>
        </div>

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon green">
            <CheckCircle size={22} />
          </div>

          <span>Delivered</span>
          <h2>{deliveredCount}</h2>
        </div>

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon gold">
            <Truck size={22} />
          </div>

          <span>On the Way</span>
          <h2>{transitCount}</h2>
        </div>

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon orange">
            <Clock size={22} />
          </div>

          <span>Processing</span>
          <h2>{processingCount}</h2>
        </div>

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon red">
            <AlertCircle size={22} />
          </div>

          <span>Delayed</span>
          <h2>{delayedCount}</h2>
        </div>

        <div className="shipping-stat-card">
          <div className="shipping-stat-icon red">
            <Ban size={22} />
          </div>

          <span>Cancelled</span>
          <h2>{cancelledCount}</h2>
        </div>

      </section>

      {/* SHIPMENT TABLE */}

      <section className="shipping-panel">

        <div className="shipping-panel-heading">

          <div>
            <span>DELIVERY OPERATIONS</span>
            <h2>All Shipments</h2>
          </div>

          <span className="shipment-count">
            {filteredShipments.length} Shipments
          </span>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="shipping-toolbar">

          <div className="shipping-search">

            <Search size={19} />

            <input
              type="text"
              placeholder="Search order, customer or tracking ID..."
              value={searchTerm}
              onChange={event =>
                setSearchTerm(event.target.value)
              }
            />

          </div>

          <select
            value={statusFilter}
            onChange={event =>
              setStatusFilter(event.target.value)
            }
          >

            <option value="All">All Statuses</option>

            {statuses.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}

            <option value="Cancelled">
              Cancelled
            </option>

          </select>

        </div>

        {/* TABLE */}

        <div className="shipping-table-wrapper">

          <table className="shipping-table">

            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>COURIER</th>
                <th>TRACKING ID</th>
                <th>EXPECTED DELIVERY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="7" className="shipping-empty">
                    Loading shipments...
                  </td>
                </tr>

              ) : filteredShipments.length > 0 ? (

                filteredShipments.map(shipment => (

                  <tr key={shipment.id}>

                    <td className="shipping-order-id">
                      {shipment.orderId}
                    </td>

                    <td>
                      <strong>{shipment.customer}</strong>

                      <span className="shipping-product-name">
                        {shipment.product}
                      </span>
                    </td>

                    <td>
                      {shipment.status === 'Cancelled'
                        ? 'Not applicable'
                        : shipment.courier || 'Not assigned'}
                    </td>

                    <td className="shipping-tracking-id">
                      {shipment.status === 'Cancelled'
                        ? 'Cancelled'
                        : shipment.trackingId || 'Not assigned'}
                    </td>

                    <td>
                      {shipment.status === 'Cancelled'
                        ? 'Not applicable'
                        : shipment.estimatedDate || 'To be confirmed'}
                    </td>

                    <td>
                      <span
                        className={`shipping-status ${getStatusClass(
                          shipment.status
                        )}`}
                      >
                        {shipment.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="shipping-view-button"
                        onClick={() =>
                          openShipmentDetails(shipment)
                        }
                        aria-label="View shipment details"
                      >
                        <Eye size={17} />
                      </button>
                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td colSpan="7" className="shipping-empty">
                    No shipments found.
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

        <p className="shipping-demo-note">
          <AlertCircle size={16} />

          Customer order shipment details and status changes are saved
          to Firebase and reflected on Track Order. Cancelled orders
          remain visible for administrative records but cannot be shipped.
        </p>

      </section>

      {/* SHIPMENT DETAILS MODAL */}

      {selectedShipment && (

        <div
          className="shipping-modal-overlay"
          onClick={() => setSelectedShipment(null)}
        >

          <div
            className="shipping-modal"
            onClick={event => event.stopPropagation()}
          >

            <div className="shipping-modal-header">

              <div>
                <span>SHIPMENT DETAILS</span>

                <div className="shipping-modal-title-row">
                  <h2>{selectedShipment.orderId}</h2>

                  <span
                    className={
                      'shipping-status shipping-modal-status ' +
                      getStatusClass(selectedShipment.status)
                    }
                  >
                    {selectedShipment.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedShipment(null)}
                aria-label="Close shipment details"
              >
                <X size={21} />
              </button>

            </div>

            {/* CANCELLED ORDER INFORMATION */}

            {selectedShipment.status === 'Cancelled' && (

              <div className="shipping-cancellation-notice">

                <div>
                  <Ban size={22} />
                  <strong>Order Cancelled</strong>
                </div>

                <p>
                  This order has been cancelled and must not be shipped.
                </p>

                <p>
                  <strong>Cancellation Reason:</strong>{' '}
                  {selectedShipment.cancellationReason ||
                    'Reason not available'}
                </p>

                <p>
                  <strong>Cancelled On:</strong>{' '}
                  {formatCancellationDate(
                    selectedShipment.cancelledAt
                  )}
                </p>

              </div>

            )}

            {/* CUSTOMER INFORMATION */}

            <div className="shipping-detail-grid">

              <div>
                <span>Customer</span>
                <strong>{selectedShipment.customer}</strong>
              </div>

              <div>
                <span>Product</span>
                <strong>{selectedShipment.product}</strong>
              </div>

              <div>
                <span>Shipped Date</span>
                <strong>
                  {selectedShipment.status === 'Cancelled'
                    ? 'Not applicable'
                    : selectedShipment.shippedDate || 'Not shipped'}
                </strong>
              </div>

              <div>
                <span>Expected Delivery</span>
                <strong>
                  {selectedShipment.status === 'Cancelled'
                    ? 'Not applicable'
                    : selectedShipment.estimatedDate ||
                      'To be confirmed'}
                </strong>
              </div>

            </div>

            <section
              className={
                'shipping-progress-card' +
                (selectedShipment.status === 'Cancelled'
                  ? ' cancelled'
                  : '')
              }
              aria-label="Shipment progress"
            >
              <div className="shipping-progress-heading">
                <div>
                  <span>DELIVERY JOURNEY</span>
                  <h3>Shipment Progress</h3>
                </div>

                <strong>
                  {selectedShipment.status === 'Cancelled'
                    ? 'Journey before cancellation'
                    : selectedShipment.status}
                </strong>
              </div>

              <div className="shipping-progress-track">
                <div className="shipping-progress-rail">
                  <div
                    className="shipping-progress-fill"
                    style={{
                      width: selectedProgressPercent + '%',
                    }}
                  />
                </div>

                {shipmentProgressSteps.map((step, index) => {
                  const isComplete = index < selectedProgressIndex;
                  const isCurrent = index === selectedProgressIndex;

                  return (
                    <div
                      className={
                        'shipping-progress-step' +
                        (isComplete ? ' complete' : '') +
                        (isCurrent ? ' current' : '')
                      }
                      key={step}
                    >
                      <div className="shipping-progress-marker">
                        {isComplete ? (
                          <Check size={13} />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SHIPPING CONTROLS - ACTIVE ORDERS ONLY */}

            {selectedShipment.status !== 'Cancelled' ? (

              <>

                <div className="shipping-controls-heading">
                  <span>FULFILMENT DETAILS</span>
                  <h3>Courier & Delivery Information</h3>
                  <p>
                    Changes are saved to Firestore automatically.
                  </p>
                </div>

                <div className="shipping-controls-grid">

                {/* COURIER PARTNER */}

                <div className="shipping-status-update">

                  <label htmlFor="courier-partner">
                    Courier Partner
                  </label>

                  <select
                    id="courier-partner"
                    value={selectedShipment.courier || ''}
                    onChange={event =>
                      updateShipment(selectedShipment.id, {
                        courier: event.target.value,
                      })
                    }
                  >

                    <option value="">
                      Select Courier Partner
                    </option>

                    {courierOptions.map(courier => (
                      <option key={courier} value={courier}>
                        {courier}
                      </option>
                    ))}

                  </select>

                </div>

                {/* TRACKING ID */}

                <div className="shipping-status-update">

                  <label htmlFor="tracking-id">
                    Tracking ID
                  </label>

                  <div className="shipping-tracking-control">
                    <input
                      id="tracking-id"
                      type="text"
                      placeholder="Enter courier tracking ID"
                      value={selectedShipment.trackingId || ''}
                      onChange={event => {
                        setTrackingCopied(false);
                        updateShipment(selectedShipment.id, {
                          trackingId: event.target.value,
                        });
                      }}
                    />

                    <button
                      type="button"
                      className="shipping-copy-button"
                      onClick={copyTrackingId}
                      disabled={!selectedShipment.trackingId?.trim()}
                      aria-label={
                        trackingCopied
                          ? 'Tracking ID copied'
                          : 'Copy tracking ID'
                      }
                      title={
                        trackingCopied
                          ? 'Tracking ID copied'
                          : 'Copy tracking ID'
                      }
                    >
                      {trackingCopied ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                </div>

                {/* SHIPPED DATE */}

                <div className="shipping-status-update">

                  <label htmlFor="shipped-date">
                    Shipped Date
                  </label>

                  <input
                    id="shipped-date"
                    type="date"
                    value={selectedShipment.shippedDateISO || ''}
                    onChange={event =>
                      updateShipment(selectedShipment.id, {
                        shippedDateISO: event.target.value,

                        shippedDate: event.target.value
                          ? new Date(
                              `${event.target.value}T00:00:00`
                            ).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '',
                      })
                    }
                  />

                </div>

                {/* ESTIMATED DELIVERY DATE */}

                <div className="shipping-status-update">

                  <label htmlFor="estimated-date">
                    Estimated Delivery Date
                  </label>

                  <input
                    id="estimated-date"
                    type="date"
                    value={selectedShipment.estimatedDateISO || ''}
                    onChange={event =>
                      updateShipment(selectedShipment.id, {
                        estimatedDateISO: event.target.value,

                        estimatedDate: event.target.value
                          ? new Date(
                              `${event.target.value}T00:00:00`
                            ).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '',
                      })
                    }
                  />

                </div>

                </div>

              </>

            ) : (

              <div className="shipping-cancellation-notice">
                <strong>Shipping actions are disabled.</strong>

                <p>
                  Courier assignment, tracking information and delivery
                  status cannot be changed for this cancelled order.
                </p>
              </div>

            )}

            {/* DELIVERY ADDRESS */}

            <div className="shipping-address">

              <div className="shipping-address-icon">
                <MapPin size={19} />
              </div>

              <div>
                <span>Delivery Address</span>

                <strong>
                  {displayedAddress}
                </strong>

                {addressNeedsExpansion && (
                  <button
                    type="button"
                    className="shipping-address-toggle"
                    onClick={() =>
                      setAddressExpanded(previous => !previous)
                    }
                    aria-expanded={addressExpanded}
                  >
                    {addressExpanded
                      ? 'Show Less'
                      : 'View Full Address'}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

            </div>

            {/* STATUS UPDATE */}

            {selectedShipment.status !== 'Cancelled' && (

              <div className="shipping-status-update">

                <label htmlFor="shipment-status">
                  Update Shipment Status
                </label>

                <select
                  id="shipment-status"
                  value={selectedShipment.status}
                  onChange={event =>
                    updateStatus(
                      selectedShipment.id,
                      event.target.value
                    )
                  }
                >

                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}

                </select>

              </div>

            )}

            <div className="shipping-modal-footer-actions">
              {selectedShipment.status !== 'Cancelled' && (
                <p>
                  <CheckCircle size={16} />
                  Changes sync automatically with Firestore.
                </p>
              )}

              <button
                type="button"
                className="shipping-modal-close"
                onClick={() => setSelectedShipment(null)}
              >
                {selectedShipment.status === 'Cancelled'
                  ? 'Close Details'
                  : 'Save Changes & Close'}
                <ArrowRight size={17} />
              </button>
            </div>

          </div>

        </div>

      )}

      {/* FOOTER */}

      <footer className="shipping-footer">

        <span>MAISON Shipping Management</span>

        <span>
          <CalendarDays size={15} />
          Delivery Operations
        </span>

      </footer>

    </div>
  );
}

export default ShippingManagement;
