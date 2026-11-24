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
} from 'lucide-react';

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';
import toast from 'react-hot-toast';

import './ShippingManagement.css';

const EMAIL_SERVICE_URL =
  'https://maison-email-service.sreekavya0125.workers.dev';

const initialShipments = [
  {
    id: 'SHP1001',
    orderId: '#MSN1025',
    customer: 'Ananya Sharma',
    product: 'Elegant Summer Dress',
    courier: 'BlueDart',
    trackingId: 'BD789456123',
    shippedDate: '08 Nov 2026',
    estimatedDate: '11 Nov 2026',
    status: 'Delivered',
    address: 'Anna Nagar, Chennai, Tamil Nadu',
  },
  {
    id: 'SHP1002',
    orderId: '#MSN1024',
    customer: 'Rahul Verma',
    product: 'Classic Sneakers',
    courier: 'Delhivery',
    trackingId: 'DL456789123',
    shippedDate: '08 Nov 2026',
    estimatedDate: '12 Nov 2026',
    status: 'In Transit',
    address: 'Banjara Hills, Hyderabad, Telangana',
  },
  {
    id: 'SHP1003',
    orderId: '#MSN1023',
    customer: 'Priya Reddy',
    product: 'Premium Handbag',
    courier: 'DTDC',
    trackingId: 'DT123456789',
    shippedDate: '07 Nov 2026',
    estimatedDate: '10 Nov 2026',
    status: 'Shipped',
    address: 'T. Nagar, Chennai, Tamil Nadu',
  },
  {
    id: 'SHP1004',
    orderId: '#MSN1022',
    customer: 'Arjun Kumar',
    product: 'Wireless Headphones',
    courier: 'BlueDart',
    trackingId: 'BD987654321',
    shippedDate: 'Not shipped',
    estimatedDate: '14 Nov 2026',
    status: 'Processing',
    address: 'Whitefield, Bengaluru, Karnataka',
  },
  {
    id: 'SHP1005',
    orderId: '#MSN1021',
    customer: 'Meera Nair',
    product: 'Smart Watch',
    courier: 'Delhivery',
    trackingId: 'DL789123456',
    shippedDate: '06 Nov 2026',
    estimatedDate: '09 Nov 2026',
    status: 'Out for Delivery',
    address: 'Adyar, Chennai, Tamil Nadu',
  },
];

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

const convertOrderToShipment = (order, documentId) => {
  const customer = order.customer || {};

  const productNames = (order.products || [])
    .map(item => item.name || item.product?.name || 'Product')
    .join(', ');

  return {
    id: `ORDER-${documentId}`,
    firestoreId: documentId,

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

// SEND CUSTOMER SHIPPING EMAIL

const sendCustomerShippingUpdateEmail = async (
  shipment,
  newStatus
) => {
  const customerEmail = String(
    shipment.customerEmail || ''
  ).trim();

  if (!customerEmail) {
    console.warn(
      'Customer email missing for order:',
      shipment.orderId
    );

    return {
      success: false,
      reason: 'missing-email',
    };
  }

  const isShipped = newStatus === 'Shipped';

  const subject = isShipped
    ? `MAISON - Your order ${shipment.orderId} has been shipped`
    : `MAISON - Your order ${shipment.orderId} has been delivered`;

  const heading = isShipped
    ? 'Your order is on its way!'
    : 'Your order has been delivered!';

  const message = isShipped
    ? 'Good news! Your MAISON order has been shipped and is on its way to you.'
    : 'Your MAISON order has been marked as delivered. We hope you enjoy your purchase.';

  const trackingDetails = [
    shipment.courier
      ? `<p><strong>Courier:</strong> ${shipment.courier}</p>`
      : '',

    shipment.trackingId
      ? `<p><strong>Tracking ID:</strong> ${shipment.trackingId}</p>`
      : '',

    shipment.estimatedDate
      ? `<p><strong>Estimated delivery:</strong> ${shipment.estimatedDate}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const html = `
    <div style="margin:0;padding:32px 12px;background:#f8f7f4;font-family:Arial,sans-serif;color:#172b4d;">
      <div style="max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e9e3d8;">
        <p style="margin:0 0 20px;color:#c6a15b;font-size:13px;font-weight:bold;letter-spacing:3px;">MAISON</p>

        <h1 style="margin:0 0 16px;font-size:25px;">${heading}</h1>

        <p style="font-size:15px;line-height:1.7;">
          Hello ${shipment.customer || 'Customer'},
        </p>

        <p style="font-size:15px;line-height:1.7;">
          ${message}
        </p>

        <div style="margin:24px 0;padding:18px;background:#f8f7f4;border-left:3px solid #c6a15b;">
          <p><strong>Order ID:</strong> ${shipment.orderId}</p>
          <p><strong>Product:</strong> ${shipment.product}</p>
          <p><strong>Status:</strong> ${newStatus}</p>
          ${trackingDetails}
        </div>

        <p>Thank you for shopping with MAISON.</p>

        <p style="margin-top:28px;font-size:13px;color:#777;">
          MAISON Customer Support
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: customerEmail,
        subject,
        html,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Shipping email failed:', result);

      return {
        success: false,
        reason:
          result?.message ||
          result?.error ||
          `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Shipping email error:', error);

    return {
      success: false,
      reason: error.message || 'Network error',
    };
  }
};

function ShippingManagement() {
  const [shipments, setShipments] = useState(initialShipments);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedShipment, setSelectedShipment] = useState(null);

  // LOAD CUSTOMER ORDERS FROM FIREBASE

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),

      snapshot => {
        const firebaseShipments = snapshot.docs.map(document =>
          convertOrderToShipment(
            document.data(),
            document.id
          )
        );

        setShipments([
          ...firebaseShipments,
          ...initialShipments,
        ]);

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
      await updateDoc(
        doc(db, 'orders', shipment.firestoreId),
        {
          orderStatus: newStatus,
          trackingHistory: arrayUnion(historyEntry),
          updatedAt: serverTimestamp(),
        }
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
                          setSelectedShipment(shipment)
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
                <h2>{selectedShipment.orderId}</h2>
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
                <span>Current Status</span>
                <strong>{selectedShipment.status}</strong>
              </div>

            </div>

            {/* SHIPPING CONTROLS - ACTIVE ORDERS ONLY */}

            {selectedShipment.status !== 'Cancelled' ? (

              <>

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

                  <input
                    id="tracking-id"
                    type="text"
                    placeholder="Enter courier tracking ID"
                    value={selectedShipment.trackingId || ''}
                    onChange={event =>
                      updateShipment(selectedShipment.id, {
                        trackingId: event.target.value,
                      })
                    }
                  />

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

              <MapPin size={19} />

              <div>
                <span>Delivery Address</span>

                <strong>
                  {selectedShipment.address}
                </strong>
              </div>

            </div>

            {/* CURRENT STATUS */}

            <div className="shipping-current-status">

              <span>Current Shipment Status</span>

              <span
                className={`shipping-status ${getStatusClass(
                  selectedShipment.status
                )}`}
              >
                {selectedShipment.status}
              </span>

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

            <button
              className="shipping-modal-close"
              onClick={() => setSelectedShipment(null)}
            >
              Close Details
              <ArrowRight size={17} />
            </button>

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