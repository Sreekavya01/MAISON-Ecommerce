import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Mail,
  Phone,
  Eye,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';
import toast from 'react-hot-toast';

import './CustomerManagement.css';

// Convert Firebase dates into readable dates.

const formatDate = (dateValue) => {
  if (!dateValue) return 'Not available';

  try {
    const date = dateValue?.toDate
      ? dateValue.toDate()
      : new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Not available';
  }
};

// Convert Firebase dates into timestamps.

const getTimestamp = (dateValue) => {
  if (!dateValue) return null;

  try {
    const date = dateValue?.toDate
      ? dateValue.toDate()
      : new Date(dateValue);

    return Number.isNaN(date.getTime())
      ? null
      : date.getTime();
  } catch {
    return null;
  }
};

function CustomerManagement() {
  const location = useLocation();
  const relatedDocumentId = location.state?.relatedDocumentId;
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [renderedAt] = useState(Date.now);

  // LOAD CUSTOMERS AND ORDERS FROM FIREBASE.

  useEffect(() => {
    let usersLoaded = false;
    let ordersLoaded = false;

    const checkLoading = () => {
      if (usersLoaded && ordersLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),

      (snapshot) => {
        const customerData = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .filter((user) => user.role !== 'admin');

        setUsers(customerData);

        usersLoaded = true;
        checkLoading();
      },

      (error) => {
        console.error('Customer loading error:', error);
        toast.error('Unable to load customers.');
        setLoading(false);
      }
    );

    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),

      (snapshot) => {
        const orderData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setOrders(orderData);

        ordersLoaded = true;
        checkLoading();
      },

      (error) => {
        console.error('Customer orders error:', error);
        toast.error('Unable to load customer orders.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, []);

  // COMBINE CUSTOMER INFORMATION WITH ORDER INFORMATION.

  const customers = useMemo(
    () =>
      users.map((user) => {
        const customerOrders = orders.filter(
          (order) => order.userId === user.id
        );

        const totalSpent = customerOrders.reduce(
          (total, order) => total + (Number(order.total) || 0),
          0
        );

        const joinedDate = user.createdAt || user.joined;

        return {
          id: user.id,
          name: user.name || user.displayName || 'Customer',
          email: user.email || 'Not available',
          phone: user.phone || 'Not available',
          orders: customerOrders.length,
          spent: totalSpent,
          status: customerOrders.length > 0 ? 'Active' : 'Inactive',
          joined: formatDate(joinedDate),
          joinedTimestamp: getTimestamp(joinedDate),
        };
      }),
    [orders, users]
  );

  useEffect(() => {
    if (!relatedDocumentId || loading) return;

    const relatedCustomer = customers.find(
      (customer) => customer.id === relatedDocumentId
    );

    if (relatedCustomer) {
      const frame = window.requestAnimationFrame(() => {
        setSearchTerm('');
        setStatusFilter('All');
        setSelectedCustomer(relatedCustomer);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [customers, loading, relatedDocumentId]);

  // SEARCH AND FILTER CUSTOMERS.

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'All' || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // CUSTOMER STATISTICS.

  const totalSpent = customers.reduce(
    (total, customer) => total + customer.spent,
    0
  );

  const activeCustomers = customers.filter(
    (customer) => customer.status === 'Active'
  ).length;

  const thirtyDaysAgo =
    renderedAt - 30 * 24 * 60 * 60 * 1000;

  const newCustomers = customers.filter(
    (customer) =>
      customer.joinedTimestamp &&
      customer.joinedTimestamp >= thirtyDaysAgo
  ).length;

  return (
    <div className="customer-management-page">

      {/* PAGE HEADER */}

      <div className="customer-page-header">
        <div>
          <span className="customer-eyebrow">
            ADMINISTRATION
          </span>

          <h1>Customer Management</h1>

          <p>
            Manage your customers and understand their shopping activity.
          </p>
        </div>

        <div className="customer-header-icon">
          <Users size={27} />
        </div>
      </div>

      {/* STATISTICS */}

      <div className="customer-stats-grid">

        <div className="customer-stat-card">
          <div className="customer-stat-icon navy">
            <Users size={22} />
          </div>

          <div>
            <span>Total Customers</span>
            <h2>{customers.length}</h2>
            <small>All registered customers</small>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon green">
            <UserCheck size={22} />
          </div>

          <div>
            <span>Active Customers</span>

            <h2>{activeCustomers}</h2>

            <small>Customers with orders</small>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon gold">
            <UserPlus size={22} />
          </div>

          <div>
            <span>New Customers</span>

            <h2>
              {String(newCustomers).padStart(2, '0')}
            </h2>

            <small>Registered in the last 30 days</small>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon purple">
            <TrendingUp size={22} />
          </div>

          <div>
            <span>Customer Spending</span>

            <h2>
              ₹{totalSpent.toLocaleString('en-IN')}
            </h2>

            <small>Total spending from orders</small>
          </div>
        </div>

      </div>

      {/* CUSTOMER TABLE */}

      <div className="customer-table-section">

        <div className="customer-table-heading">
          <div>
            <h2>All Customers</h2>

            <p>
              View and manage your registered customers.
            </p>
          </div>

          <div className="customer-table-count">
            {filteredCustomers.length} Customers
          </div>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="customer-toolbar">

          <div className="customer-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="customer-status-filter"
          >
            <option value="All">All Customers</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

        </div>

        {/* TABLE */}

        <div className="customer-table-wrapper">

          <table className="customer-table">

            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact Details</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="7" className="customer-empty-state">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (

                filteredCustomers.map((customer) => (

                  <tr key={customer.id}>

                    <td>
                      <div className="customer-name-cell">

                        <div className="customer-avatar">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>

                        <strong>{customer.name}</strong>

                      </div>
                    </td>

                    <td>
                      <div className="customer-contact-cell">

                        <span>
                          <Mail size={14} />
                          {customer.email}
                        </span>

                        <span>
                          <Phone size={14} />
                          {customer.phone}
                        </span>

                      </div>
                    </td>

                    <td>{customer.orders}</td>

                    <td className="customer-spent">
                      ₹{customer.spent.toLocaleString('en-IN')}
                    </td>

                    <td>{customer.joined}</td>

                    <td>
                      <span
                        className={`customer-status ${customer.status.toLowerCase()}`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="customer-view-button"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye size={17} />
                        View
                      </button>
                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td colSpan="7" className="customer-empty-state">
                    No customers found.
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* CUSTOMER DETAILS POPUP */}

      {selectedCustomer && (

        <div
          className="customer-modal-overlay"
          onClick={() => setSelectedCustomer(null)}
        >

          <div
            className="customer-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="customer-modal-close"
              onClick={() => setSelectedCustomer(null)}
            >
              ×
            </button>

            <div className="customer-modal-avatar">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>

            <h2>{selectedCustomer.name}</h2>

            <p className="customer-modal-subtitle">
              Customer Profile
            </p>

            <div className="customer-modal-details">

              <div>
                <Mail size={17} />
                <span>{selectedCustomer.email}</span>
              </div>

              <div>
                <Phone size={17} />
                <span>{selectedCustomer.phone}</span>
              </div>

              <div>
                <ShoppingBag size={17} />
                <span>
                  {selectedCustomer.orders} Orders Placed
                </span>
              </div>

              <div>
                <TrendingUp size={17} />
                <span>
                  ₹{selectedCustomer.spent.toLocaleString('en-IN')} Total Spent
                </span>
              </div>

            </div>

            <span
              className={`customer-status ${selectedCustomer.status.toLowerCase()}`}
            >
              {selectedCustomer.status}
            </span>

          </div>

        </div>

      )}

      <p className="customer-demo-note">
        Customer information and order statistics are synchronized with Firebase.
      </p>

    </div>
  );
}

export default CustomerManagement;
