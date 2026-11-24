import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle,
  Search,
  Eye,
  X,
  Package,
  IndianRupee,
  CalendarDays,
  MapPin,
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

import './OrderManagement.css';

function OrderManagement() {
  const location = useLocation();
  const relatedDocumentId = location.state?.relatedDocumentId;

  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // LOAD ORDERS FROM FIREBASE

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const firebaseOrders = snapshot.docs.map((document) => {
          const data = document.data();

          const products = data.products || [];

          const productNames = products
            .map((product) => product.name)
            .filter(Boolean);

          const quantity = products.reduce(
            (total, product) =>
              total + (Number(product.quantity) || 0),
            0
          );

          const address = [
            data.customer?.address,
            data.customer?.city,
            data.customer?.state,
            data.customer?.pincode,
          ]
            .filter(Boolean)
            .join(', ');

          return {
            ...data,

            firestoreId: document.id,

            id: data.orderId || document.id,

            customer:
              data.customer?.fullName || 'Customer',

            email: data.customer?.email || '',

            phone: data.customer?.phone || '',

            product:
              productNames.join(', ') || 'Product',

            products,

            quantity,

            amount: Number(data.total) || 0,

            date: data.orderDate || 'Date unavailable',

            status: data.orderStatus || 'Order Placed',

            payment: data.paymentStatus || 'Pending',

            paymentMethod:
              data.paymentMethod || 'Not specified',

            address: address || 'Address unavailable',

            cancellationReason:
              data.cancellationReason || '',

            cancelledAt: data.cancelledAt || null,
          };
        });

        firebaseOrders.sort((a, b) => {
          const dateA = a.createdAt?.toMillis?.() || 0;
          const dateB = b.createdAt?.toMillis?.() || 0;

          return dateB - dateA;
        });

        setOrders(firebaseOrders);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading orders:', error);

        toast.error('Unable to load customer orders.');

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // OPEN ORDER FROM RELATED NOTIFICATION

  useEffect(() => {
    if (!relatedDocumentId || loading) return;

    const relatedOrder = orders.find(
      (order) =>
        order.firestoreId === relatedDocumentId ||
        order.id === relatedDocumentId
    );

    if (relatedOrder) {
      const frame = window.requestAnimationFrame(() => {
        setSearchTerm('');
        setStatusFilter('All');
        setSelectedOrder(relatedOrder);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [loading, orders, relatedDocumentId]);

  // FORMAT PRICE

  const formatPrice = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  // FORMAT CANCELLATION DATE

  const formatCancellationDate = (date) => {
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
    } catch (error) {
      return 'Date unavailable';
    }
  };

  // SEARCH AND FILTER

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.customer
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // UPDATE ORDER STATUS IN FIREBASE

  const updateOrderStatus = async (orderId, newStatus) => {
    const previousOrder = orders.find(
      (order) => order.id === orderId
    );

    if (!previousOrder) return;

    // CANCELLED ORDERS CANNOT BE REACTIVATED

    if (previousOrder.status === 'Cancelled') {
      toast.error(
        'Cancelled orders cannot be moved to another status.'
      );
      return;
    }

    // PREVENT INVALID SHIPPING STATUS CHANGES

    const shippingStatuses = [
      'Shipped',
      'In Transit',
      'Out for Delivery',
      'Delivered',
    ];

    if (
      shippingStatuses.includes(newStatus) &&
      previousOrder.status === 'Cancelled'
    ) {
      toast.error(
        'Cancelled orders cannot be shipped.'
      );
      return;
    }

    try {
      const historyEntry = {
        status: newStatus,
        date: new Date().toLocaleString('en-IN'),
        description: `Order status updated to ${newStatus}.`,
      };

      const orderUpdate = {
        orderStatus: newStatus,
        trackingHistory: arrayUnion(historyEntry),
        updatedAt: serverTimestamp(),
      };

      // RECORD ADMIN CANCELLATION DETAILS

      if (newStatus === 'Cancelled') {
        orderUpdate.cancellationReason =
          previousOrder.cancellationReason ||
          'Cancelled by administrator';

        orderUpdate.cancelledAt = serverTimestamp();
      }

      await updateDoc(
        doc(db, 'orders', previousOrder.firestoreId),
        orderUpdate
      );

      // UPDATE LOCAL TRACKING DATA

      const existingOrders = JSON.parse(
        localStorage.getItem('maison-orders') || '[]'
      );

      const updatedLocalOrders = existingOrders.map(
        (order) =>
          order.orderId === orderId
            ? {
                ...order,
                orderStatus: newStatus,
                cancellationReason:
                  orderUpdate.cancellationReason ||
                  order.cancellationReason,
                cancelledAt:
                  newStatus === 'Cancelled'
                    ? new Date().toISOString()
                    : order.cancelledAt,
                trackingHistory: [
                  ...(order.trackingHistory || []),
                  historyEntry,
                ],
              }
            : order
      );

      localStorage.setItem(
        'maison-orders',
        JSON.stringify(updatedLocalOrders)
      );

      // UPDATE SELECTED ORDER DETAILS

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((previous) => ({
          ...previous,
          status: newStatus,
          orderStatus: newStatus,
          cancellationReason:
            orderUpdate.cancellationReason ||
            previous.cancellationReason,
          cancelledAt:
            newStatus === 'Cancelled'
              ? new Date().toISOString()
              : previous.cancelledAt,
          trackingHistory: [
            ...(previous.trackingHistory || []),
            historyEntry,
          ],
        }));
      }

      toast.success('Order status updated successfully!');
    } catch (error) {
      console.error('Error updating order:', error);

      toast.error('Unable to update order status.');
    }
  };

  // STATUS STYLING

  const getStatusClass = (status) => {
    switch (status) {
      case 'Delivered':
        return 'order-status-delivered';

      case 'Processing':
      case 'Confirmed':
        return 'order-status-processing';

      case 'Shipped':
      case 'In Transit':
      case 'Out for Delivery':
        return 'order-status-shipped';

      case 'Cancelled':
        return 'order-status-cancelled';

      default:
        return 'order-status-pending';
    }
  };

  // STATISTICS

  const activeOrders = orders.filter(
    (order) => order.status !== 'Cancelled'
  );

  const totalRevenue = activeOrders
    .filter((order) => order.payment === 'Paid')
    .reduce(
      (total, order) => total + order.amount,
      0
    );

  const pendingCount = orders.filter(
    (order) =>
      order.status === 'Pending' ||
      order.status === 'Order Placed' ||
      order.status === 'Confirmed'
  ).length;

  const processingCount = orders.filter(
    (order) => order.status === 'Processing'
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.status === 'Delivered'
  ).length;

  const shippedCount = orders.filter(
    (order) => order.status === 'Shipped'
  ).length;

  const cancelledCount = orders.filter(
    (order) => order.status === 'Cancelled'
  ).length;

  const cancelledValue = orders
    .filter((order) => order.status === 'Cancelled')
    .reduce(
      (total, order) => total + order.amount,
      0
    );

  return (
    <div className="order-management-page">

      {/* PAGE HEADER */}

      <div className="order-page-header">

        <div>
          <span className="order-breadcrumb">
            MAISON / ADMIN / ORDERS
          </span>

          <h1>Order Management</h1>

          <p>
            Manage customer orders, monitor deliveries and track payments.
          </p>
        </div>

        <div className="order-header-date">
          <CalendarDays size={18} />

          {new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </div>

      </div>

      {/* STATISTICS */}

      <section className="order-stats-grid">

        <div className="order-stat-card">

          <div className="order-stat-icon navy-order-icon">
            <ShoppingBag size={21} />
          </div>

          <span>Total Orders</span>

          <h2>{orders.length}</h2>

          <p>All customer orders</p>

        </div>

        <div className="order-stat-card">

          <div className="order-stat-icon gold-order-icon">
            <IndianRupee size={21} />
          </div>

          <span>Paid Revenue</span>

          <h2>{formatPrice(totalRevenue)}</h2>

          <p>Excluding cancelled orders</p>

        </div>

        <div className="order-stat-card">

          <div className="order-stat-icon orange-order-icon">
            <Clock size={21} />
          </div>

          <span>Pending Orders</span>

          <h2>{pendingCount}</h2>

          <p>Awaiting confirmation</p>

        </div>

        <div className="order-stat-card">

          <div className="order-stat-icon green-order-icon">
            <CheckCircle size={21} />
          </div>

          <span>Delivered Orders</span>

          <h2>{deliveredCount}</h2>

          <p>Successfully completed</p>

        </div>

        <div className="order-stat-card">

          <div className="order-stat-icon orange-order-icon">
            <Ban size={21} />
          </div>

          <span>Cancelled Orders</span>

          <h2>{cancelledCount}</h2>

          <p>
            Cancelled value: {formatPrice(cancelledValue)}
          </p>

        </div>

      </section>

      {/* ORDER STATUS OVERVIEW */}

      <section className="order-status-overview">

        <div className="order-overview-heading">

          <div>
            <span>ORDER ACTIVITY</span>

            <h3>Order Status Overview</h3>
          </div>

        </div>

        <div className="order-overview-items">

          <div className="order-overview-item">

            <div className="overview-icon processing-overview">
              <Package size={19} />
            </div>

            <div>
              <strong>{processingCount}</strong>
              <span>Processing</span>
            </div>

          </div>

          <div className="order-overview-item">

            <div className="overview-icon shipped-overview">
              <Truck size={19} />
            </div>

            <div>
              <strong>{shippedCount}</strong>
              <span>Shipped</span>
            </div>

          </div>

          <div className="order-overview-item">

            <div className="overview-icon delivered-overview">
              <CheckCircle size={19} />
            </div>

            <div>
              <strong>{deliveredCount}</strong>
              <span>Delivered</span>
            </div>

          </div>

          <div className="order-overview-item">

            <div className="overview-icon">
              <Ban size={19} />
            </div>

            <div>
              <strong>{cancelledCount}</strong>
              <span>Cancelled</span>
            </div>

          </div>

        </div>

      </section>

      {/* ORDERS TABLE */}

      <section className="orders-table-section">

        <div className="orders-table-heading">

          <div>
            <span>STORE ACTIVITY</span>

            <h3>All Orders</h3>

            <p>
              Review and manage your customer orders.
            </p>
          </div>

        </div>

        {/* SEARCH AND FILTER */}

        <div className="orders-toolbar">

          <div className="orders-search">

            <Search size={19} />

            <input
              type="text"
              placeholder="Search by order ID or customer..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

          </div>

          <select
            className="orders-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >

            <option value="All">All Orders</option>
            <option value="Confirmed">Confirmed Quotations</option>
            <option value="Order Placed">Order Placed</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="In Transit">In Transit</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled Orders</option>

          </select>

        </div>

        {/* ORDERS TABLE */}

        <div className="orders-table-wrapper">

          <table className="orders-management-table">

            <thead>

              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>PRODUCT</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="8" className="no-orders-found">
                    Loading customer orders...
                  </td>
                </tr>

              ) : filteredOrders.length > 0 ? (

                filteredOrders.map((order) => (

                  <tr key={order.firestoreId}>

                    <td className="management-order-id">
                      #{order.id}
                    </td>

                    <td>
                      <strong>{order.customer}</strong>
                    </td>

                    <td>{order.product}</td>

                    <td>{order.date}</td>

                    <td className="management-order-amount">
                      {formatPrice(order.amount)}
                    </td>

                    <td>

                      <span
                        className={`payment-badge ${
                          order.payment === 'Paid'
                            ? 'payment-paid'
                            : order.payment === 'Refunded'
                              ? 'payment-refunded'
                              : 'payment-pending'
                        }`}
                      >
                        {order.payment}
                      </span>

                    </td>

                    <td>

                      {order.status === 'Cancelled' ? (

                        <span
                          className={`management-status-select ${getStatusClass(
                            order.status
                          )}`}
                        >
                          Cancelled
                        </span>

                      ) : (

                        <select
                          className={`management-status-select ${getStatusClass(
                            order.status
                          )}`}
                          value={order.status}
                          onChange={(event) =>
                            updateOrderStatus(
                              order.id,
                              event.target.value
                            )
                          }
                        >

                          <option value="Order Placed">
                            Order Placed
                          </option>

                          <option value="Confirmed">
                            Confirmed
                          </option>

                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Processing">
                            Processing
                          </option>

                          <option value="Shipped">
                            Shipped
                          </option>

                          <option value="In Transit">
                            In Transit
                          </option>

                          <option value="Out for Delivery">
                            Out for Delivery
                          </option>

                          <option value="Delivered">
                            Delivered
                          </option>

                          <option value="Cancelled">
                            Cancelled
                          </option>

                        </select>

                      )}

                    </td>

                    <td>

                      <button
                        className="order-view-button"
                        onClick={() => setSelectedOrder(order)}
                        aria-label={`View order ${order.id}`}
                      >
                        <Eye size={17} />
                      </button>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td colSpan="8" className="no-orders-found">
                    No orders found.
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

        <div className="orders-table-footer">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>

      </section>

      {/* ORDER DETAILS MODAL */}

      {selectedOrder && (

        <div
          className="order-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >

          <div
            className="order-details-modal"
            onClick={(event) => event.stopPropagation()}
          >

            {/* MODAL HEADER */}

            <div className="order-modal-header">

              <div>
                <span>ORDER DETAILS</span>

                <h2>#{selectedOrder.id}</h2>
              </div>

              <button
                className="order-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>

            </div>

            {/* ORDER STATUS */}

            <div className="order-modal-status">

              <span className={getStatusClass(selectedOrder.status)}>
                {selectedOrder.status}
              </span>

              <span>{selectedOrder.date}</span>

            </div>

            {/* CANCELLATION INFORMATION */}

            {selectedOrder.status === 'Cancelled' && (

              <div className="order-detail-group">

                <h4>
                  <Ban size={17} />
                  Cancellation Information
                </h4>

                <p>
                  <strong>Cancellation Status:</strong>{' '}
                  Cancelled
                </p>

                <p>
                  <strong>Cancellation Reason:</strong>{' '}
                  {selectedOrder.cancellationReason ||
                    'Reason not available'}
                </p>

                <p>
                  <strong>Cancelled On:</strong>{' '}
                  {formatCancellationDate(
                    selectedOrder.cancelledAt
                  )}
                </p>

                <p>
                  <strong>Shipping:</strong>{' '}
                  This order must not be shipped.
                </p>

              </div>

            )}

            {/* CUSTOMER INFORMATION */}

            <div className="order-detail-group">

              <h4>Customer Information</h4>

              <p>
                <strong>Name:</strong>{' '}
                {selectedOrder.customer}
              </p>

              <p>
                <strong>Email:</strong>{' '}
                {selectedOrder.email}
              </p>

              <p>
                <strong>Phone:</strong>{' '}
                {selectedOrder.phone}
              </p>

              <p>
                <MapPin size={15} />
                {selectedOrder.address}
              </p>

            </div>

            {/* PRODUCT INFORMATION */}

            <div className="order-detail-group">

              <h4>Product Information</h4>

              {selectedOrder.source === 'quotation' && (

                <p>
                  <strong>Quotation:</strong>{' '}
                  {selectedOrder.quotation?.reference ||
                    'Accepted quotation'}
                </p>

              )}

              {selectedOrder.products.map((product, index) => (

                <div
                  className="order-modal-product"
                  key={product.id || index}
                >

                  <div className="order-modal-product-icon">
                    <Package size={22} />
                  </div>

                  <div>
                    <strong>{product.name}</strong>

                    <span>
                      Quantity: {product.quantity}
                    </span>

                    <span>
                      {formatPrice(
                        Number(product.price) *
                          Number(product.quantity)
                      )}
                    </span>
                  </div>

                </div>

              ))}

            </div>

            {/* PAYMENT INFORMATION */}

            <div className="order-detail-group">

              <h4>Payment Information</h4>

              <p>
                <strong>Method:</strong>{' '}
                {selectedOrder.paymentMethod}
              </p>

              <p>
                <strong>Payment Status:</strong>{' '}
                {selectedOrder.payment}
              </p>

              {selectedOrder.status === 'Cancelled' &&
                selectedOrder.payment === 'Paid' && (

                  <p>
                    <strong>Refund:</strong>{' '}
                    Refund processing must be handled separately.
                  </p>

                )}

            </div>

            {/* ORDER TOTAL */}

            <div className="order-modal-total">

              <span>Total Amount</span>

              <strong>
                {formatPrice(selectedOrder.amount)}
              </strong>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default OrderManagement;