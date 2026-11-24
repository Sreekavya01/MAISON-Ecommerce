import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Truck,
  TrendingUp,
  Bell,
  Store,
  ShoppingCart,
  LogOut,
  MessageSquare,
  RotateCcw,
  FileText,
  Star,
} from 'lucide-react';

import { auth, db } from '../firebase';
import SEO from '../components/SEO';
import './AdminLayout.css';

const EMPTY_UNREAD_COUNTS = {
  all: 0,
  orders: 0,
  customers: 0,
  quotations: 0,
  returns: 0,
  contacts: 0,
  reviews: 0,
};

const NOTIFICATION_SIDEBAR_GROUPS = {
  order_placed: 'orders',
  order_cancelled: 'orders',
  customer_registered: 'customers',
  quotation_requested: 'quotations',
  quotation_accepted: 'quotations',
  quotation_rejected: 'quotations',
  bulk_order_requested: 'quotations',
  return_requested: 'returns',
  contact_message: 'contacts',
  customer_review: 'reviews',
};

function SidebarNotificationBadge({ count, label }) {
  if (!count) return null;

  return (
    <span
      className="admin-notification-badge"
      aria-label={`${count} unread ${label}`}
      title={`${count} unread ${label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const [unreadCounts, setUnreadCounts] = useState(EMPTY_UNREAD_COUNTS);

  useEffect(() => {
    const unreadQuery = query(
      collection(db, 'adminNotifications'),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        const nextCounts = {
          ...EMPTY_UNREAD_COUNTS,
          all: snapshot.size,
        };

        snapshot.docs.forEach((notificationDocument) => {
          const notificationType = notificationDocument.data().type;
          const sidebarGroup =
            NOTIFICATION_SIDEBAR_GROUPS[notificationType];

          if (sidebarGroup) {
            nextCounts[sidebarGroup] += 1;
          }
        });

        setUnreadCounts(nextCounts);
      },
      (error) => {
        console.error('Admin notification badge error:', error);
        setUnreadCounts(EMPTY_UNREAD_COUNTS);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Unable to logout. Please try again.');
    }
  };

  return (
    <div className="admin-layout">

      <SEO
        title="Admin Dashboard | MAISON"
        description="MAISON administration dashboard for managing products, orders, customers, shipping and reports."
        robots="noindex, nofollow"
      />

      {/* PERMANENT SIDEBAR */}

      <aside className="admin-sidebar">

        <div className="admin-sidebar-scroll">

        <Link to="/admin-dashboard" className="admin-logo">
          <h2>MAISON<span>.</span></h2>
          <p>ADMINISTRATION</p>
        </Link>

        <div className="admin-sidebar-label">MAIN MENU</div>

        <nav className="admin-sidebar-nav">

          <NavLink
            to="/admin-dashboard"
            end
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin-orders"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <ShoppingBag size={19} />
            <span>Orders</span>
            <SidebarNotificationBadge
              count={unreadCounts.orders}
              label="order notifications"
            />
          </NavLink>

          <NavLink
            to="/admin-products"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Package size={19} />
            <span>Products</span>
          </NavLink>

          <NavLink
            to="/admin-customers"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Users size={19} />
            <span>Customers</span>
            <SidebarNotificationBadge
              count={unreadCounts.customers}
              label="customer notifications"
            />
          </NavLink>

        </nav>

        <div className="admin-sidebar-label">MANAGEMENT</div>

        <nav className="admin-sidebar-nav">

          <NavLink
            to="/admin-shipping"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Truck size={19} />
            <span>Shipping</span>
          </NavLink>

          <NavLink
            to="/admin-sales-reports"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <TrendingUp size={19} />
            <span>Sales Reports</span>
          </NavLink>

          <NavLink
            to="/admin-notifications"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Bell size={19} />
            <span>Notifications</span>
            <SidebarNotificationBadge
              count={unreadCounts.all}
              label="notifications"
            />
          </NavLink>

          <NavLink
            to="/admin-abandoned-carts"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <ShoppingCart size={19} />
            <span>Abandoned Carts</span>
          </NavLink>

          <NavLink
            to="/admin-contact-messages"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <MessageSquare size={19} />
            <span>Contact Messages</span>
            <SidebarNotificationBadge
              count={unreadCounts.contacts}
              label="contact message notifications"
            />
          </NavLink>

          <NavLink
            to="/admin-quotations"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <FileText size={19} />
            <span>Quotations</span>
            <SidebarNotificationBadge
              count={unreadCounts.quotations}
              label="quotation notifications"
            />
          </NavLink>

          {/* RETURN REQUESTS */}

          <NavLink
            to="/admin-return-requests"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <RotateCcw size={19} />
            <span>Return Requests</span>
            <SidebarNotificationBadge
              count={unreadCounts.returns}
              label="return request notifications"
            />
          </NavLink>

          <NavLink
            to="/admin-customer-reviews"
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Star size={19} />
            <span>Customer Reviews</span>
            <SidebarNotificationBadge
              count={unreadCounts.reviews}
              label="customer review notifications"
            />
          </NavLink>

        </nav>

        </div>

        <div className="admin-sidebar-bottom">

          <div className="admin-profile">
            <div className="admin-avatar">A</div>

            <div>
              <strong>Admin User</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="admin-store-link"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>

          <Link to="/" className="admin-store-link">
            <Store size={17} />
            <span>Visit Store</span>
          </Link>

        </div>

      </aside>

      {/* PAGE CONTENT */}

      <main className="admin-layout-content">
        <Outlet />
      </main>

    </div>
  );
}

export default AdminLayout;
