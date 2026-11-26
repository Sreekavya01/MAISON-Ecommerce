import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

import {
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  AlertCircle,
} from 'lucide-react';

import { db } from '../firebase';

import './AdminReturnRequests.css';

const baseStatuses = [
  'Return Requested',
  'Under Review',
  'Approved',
  'Rejected',
];

const refundStatuses = [
  'Pickup Scheduled',
  'Product Picked Up',
  'Product Received',
  'Refund Initiated',
  'Refund Completed',
];

const returnStatuses = [
  'Pickup Scheduled',
  'Product Picked Up',
  'Product Received',
  'Return Completed',
];

const replacementStatuses = [
  'Replacement Processing',
  'Replacement Shipped',
  'Replacement In Transit',
  'Replacement Out for Delivery',
  'Replacement Delivered',
];

const getRequestStatuses = (requestType) => {
  if (requestType === 'Replacement') {
    return [...baseStatuses, ...replacementStatuses];
  }

  if (['Return Only', 'Return'].includes(requestType)) {
    return [...baseStatuses, ...returnStatuses];
  }

  return [...baseStatuses, ...refundStatuses];
};

const statusDescriptions = {
  'Return Requested': 'Your request was received by MAISON.',
  'Under Review': 'The MAISON support team is reviewing your request.',
  Approved: 'Your request has been accepted by MAISON.',
  Rejected: 'Your request could not be accepted.',
  'Pickup Scheduled': 'Pickup has been scheduled for your returned item.',
  'Product Picked Up': 'The returned item has been collected from you.',
  'Product Received': 'MAISON has received your returned item.',
  'Return Completed': 'Your return has been completed.',
  'Refund Initiated': 'Your refund has been initiated.',
  'Refund Completed': 'Your refund has been completed.',
  'Replacement Processing': 'Your replacement item is being prepared.',
  'Replacement Shipped': 'Your replacement item has been shipped.',
  'Replacement In Transit': 'Your replacement is moving toward your address.',
  'Replacement Out for Delivery':
    'Your replacement is out for delivery.',
  'Replacement Delivered': 'Your replacement has been delivered.',
};

function AdminReturnRequests() {
  const location = useLocation();
  const relatedDocumentId = location.state?.relatedDocumentId;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [highlightedRequestId, setHighlightedRequestId] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const snapshot = await getDocs(
        collection(db, 'returnRequests')
      );

      const requestList = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      requestList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;

        return dateB - dateA;
      });

      setRequests(requestList);
    } catch (err) {
      console.error('Error fetching return requests:', err);
      setError('Unable to load return requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => fetchRequests());

    return () => window.cancelAnimationFrame(frame);
  }, [fetchRequests]);

  useEffect(() => {
    if (
      !relatedDocumentId ||
      loading ||
      !requests.some((request) => request.id === relatedDocumentId)
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setFilter('All');
      setHighlightedRequestId(relatedDocumentId);
      document
        .getElementById(`return-request-${relatedDocumentId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loading, relatedDocumentId, requests]);

  const updateRequestStatus = async (requestId, newStatus) => {
    const currentRequest = requests.find(
      (request) => request.id === requestId
    );

    if (!currentRequest || currentRequest.status === newStatus) return;

    const historyEntry = {
      status: newStatus,
      date: new Date().toISOString(),
      description:
        statusDescriptions[newStatus] ||
        `Your request status changed to ${newStatus}.`,
    };

    try {
      setUpdatingId(requestId);

      await updateDoc(
        doc(db, 'returnRequests', requestId),
        {
          status: newStatus,
          trackingHistory: arrayUnion(historyEntry),
          updatedAt: serverTimestamp(),
        }
      );

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: newStatus,
                trackingHistory: [
                  ...(request.trackingHistory || []),
                  historyEntry,
                ],
              }
            : request
        )
      );
    } catch (err) {
      console.error('Error updating return request:', err);
      alert('Unable to update the request. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === 'All') return true;

    if (filter === 'Pending') {
      return [
        'Return Requested',
        'Under Review',
      ].includes(request.status);
    }

    if (filter === 'Approved') {
      return request.status === 'Approved';
    }

    if (filter === 'Rejected') {
      return request.status === 'Rejected';
    }

    if (filter === 'Completed') {
      return [
        'Return Completed',
        'Refund Completed',
        'Replacement Delivered',
      ].includes(request.status);
    }

    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date unavailable';

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status) => {
    if (status === 'Rejected') return 'rejected';
    if (status === 'Approved') return 'approved';

    if (
      status === 'Return Completed' ||
      status === 'Refund Completed' ||
      status === 'Replacement Delivered'
    ) {
      return 'completed';
    }

    return 'pending';
  };

  const pendingCount = requests.filter((request) =>
    ['Return Requested', 'Under Review'].includes(request.status)
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === 'Approved'
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === 'Rejected'
  ).length;

  const completedCount = requests.filter((request) =>
    [
      'Return Completed',
      'Refund Completed',
      'Replacement Delivered',
    ].includes(
      request.status
    )
  ).length;

  return (
    <div className="return-admin-page">

      {/* PAGE HEADER */}
      <div className="return-admin-header">
        <div>
          <span className="return-admin-eyebrow">
            MAISON ADMINISTRATION
          </span>

          <h1>Return Requests</h1>

          <p>
            Review and manage customer return and replacement requests.
          </p>
        </div>

        <button
          className="return-refresh-button"
          onClick={fetchRequests}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="return-summary-grid">

        <div className="return-summary-card">
          <div className="return-summary-icon total">
            <RotateCcw size={21} />
          </div>

          <div>
            <span>Total Requests</span>
            <h2>{requests.length}</h2>
          </div>
        </div>

        <div className="return-summary-card">
          <div className="return-summary-icon pending">
            <Clock size={21} />
          </div>

          <div>
            <span>Pending Review</span>
            <h2>{pendingCount}</h2>
          </div>
        </div>

        <div className="return-summary-card">
          <div className="return-summary-icon approved">
            <CheckCircle size={21} />
          </div>

          <div>
            <span>Approved</span>
            <h2>{approvedCount}</h2>
          </div>
        </div>

        <div className="return-summary-card">
          <div className="return-summary-icon rejected">
            <XCircle size={21} />
          </div>

          <div>
            <span>Rejected</span>
            <h2>{rejectedCount}</h2>
          </div>
        </div>

        <div className="return-summary-card">
          <div className="return-summary-icon completed">
            <Package size={21} />
          </div>

          <div>
            <span>Completed</span>
            <h2>{completedCount}</h2>
          </div>
        </div>

      </div>

      {/* FILTERS */}
      <div className="return-filter-section">

        <div>
          <h2>Customer Requests</h2>
          <p>View and manage submitted requests.</p>
        </div>

        <div className="return-filter-buttons">
          {[
            'All',
            'Pending',
            'Approved',
            'Rejected',
            'Completed',
          ].map((item) => (
            <button
              key={item}
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

      </div>

      {/* LOADING */}
      {loading && (
        <div className="return-empty-state">
          <RefreshCw size={30} className="return-loading-icon" />
          <p>Loading return requests...</p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="return-error-state">
          <AlertCircle size={22} />
          <p>{error}</p>

          <button onClick={fetchRequests}>
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && filteredRequests.length === 0 && (
        <div className="return-empty-state">
          <RotateCcw size={38} />

          <h3>No return requests found</h3>

          <p>
            Customer return and replacement requests will appear here.
          </p>
        </div>
      )}

      {/* REQUEST LIST */}
      {!loading && !error && filteredRequests.length > 0 && (

        <div className="return-request-list">

          {filteredRequests.map((request) => {

            const product = request.product || {};
            const canDecide = [
              'Return Requested',
              'Under Review',
            ].includes(request.status);

            return (
              <div
                id={`return-request-${request.id}`}
                className={`return-request-card ${
                  highlightedRequestId === request.id
                    ? 'notification-highlight'
                    : ''
                }`}
                key={request.id}
              >

                {/* CARD HEADER */}
                <div className="return-request-top">

                  <div>
                    <span className="return-order-label">
                      ORDER REFERENCE
                    </span>

                    <h3>
                      {request.orderReference || request.orderId}
                    </h3>
                  </div>

                  <span
                    className={`return-status-badge ${getStatusClass(
                      request.status
                    )}`}
                  >
                    {request.status || 'Return Requested'}
                  </span>

                </div>

                {/* CUSTOMER AND PRODUCT */}
                <div className="return-request-details">

                  {/* CUSTOMER */}
                  <div className="return-detail-section">

                    <h4>
                      <User size={17} />
                      Customer Details
                    </h4>

                    <p>
                      <strong>Name:</strong>{' '}
                      {request.customerName || 'Not provided'}
                    </p>

                    <p>
                      <strong>Email:</strong>{' '}
                      {request.customerEmail || 'Not provided'}
                    </p>

                    <p>
                      <strong>Phone:</strong>{' '}
                      {request.customerPhone || 'Not provided'}
                    </p>

                    <p>
                      <strong>Customer ID:</strong>{' '}
                      {request.userId || 'Not available'}
                    </p>

                  </div>

                  {/* PRODUCT */}
                  <div className="return-detail-section">

                    <h4>
                      <Package size={17} />
                      Returned Product
                    </h4>

                    <div className="return-product-info">

                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name || 'Product'}
                        />
                      )}

                      <div>
                        <strong>
                          {product.name || 'Product information unavailable'}
                        </strong>

                        <p>
                          Quantity: {product.quantity || 1}
                        </p>

                        <p>
                          Price: ₹
                          {Number(product.price || 0).toLocaleString('en-IN')}
                        </p>

                        {product.selectedColor && (
                          <p>Colour: {product.selectedColor}</p>
                        )}

                        {product.selectedSize && (
                          <p>Size: {product.selectedSize}</p>
                        )}
                      </div>

                    </div>

                  </div>

                </div>

                {/* REQUEST INFORMATION */}
                <div className="return-reason-section">

                  <div>
                    <span>REQUEST TYPE</span>
                    <strong>{request.requestType || 'Not specified'}</strong>
                  </div>

                  <div>
                    <span>REASON</span>
                    <strong>{request.reason || 'Not specified'}</strong>
                  </div>

                  <div>
                    <span>REQUESTED ON</span>
                    <strong>
                      {formatDate(request.createdAt)}
                    </strong>
                  </div>

                </div>

                {/* CUSTOMER COMMENTS */}
                {request.comments && (
                  <div className="return-customer-comments">
                    <strong>Customer Comments</strong>
                    <p>{request.comments}</p>
                  </div>
                )}

                {/* ADMIN ACTIONS */}
                <div className="return-admin-actions">

                  <div className="return-status-control">

                    <label htmlFor={`status-${request.id}`}>
                      Update Request Status
                    </label>

                    <select
                      id={`status-${request.id}`}
                      value={request.status || 'Return Requested'}
                      disabled={updatingId === request.id}
                      onChange={(event) =>
                        updateRequestStatus(
                          request.id,
                          event.target.value
                        )
                      }
                    >
                      {getRequestStatuses(request.requestType).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                  </div>

                  <div className="return-action-buttons">

                    <button
                      className="return-approve-button"
                      disabled={
                        updatingId === request.id ||
                        !canDecide
                      }
                      onClick={() =>
                        updateRequestStatus(request.id, 'Approved')
                      }
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>

                    <button
                      className="return-reject-button"
                      disabled={
                        updatingId === request.id ||
                        !canDecide
                      }
                      onClick={() => {
                        const confirmed = window.confirm(
                          'Are you sure you want to reject this return request?'
                        );

                        if (confirmed) {
                          updateRequestStatus(
                            request.id,
                            'Rejected'
                          );
                        }
                      }}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>

                  </div>

                  {updatingId === request.id && (
                    <span className="return-updating-message">
                      Updating...
                    </span>
                  )}

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

export default AdminReturnRequests;
