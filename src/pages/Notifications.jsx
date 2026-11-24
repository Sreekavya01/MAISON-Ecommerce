import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Trash2,
  Users,
  X,
  XCircle,
  Star,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import './Notifications.css';

const initialSettings = [
  {
    id: 1,
    title: 'New Order Alerts',
    description: 'Get notified whenever a customer places an order.',
    email: true,
    whatsapp: true,
  },
  {
    id: 2,
    title: 'Quotation Updates',
    description: 'Receive new quotation and customer decision alerts.',
    email: true,
    whatsapp: false,
  },
  {
    id: 3,
    title: 'Customer Support',
    description: 'Receive return, replacement and contact request alerts.',
    email: true,
    whatsapp: false,
  },
];

const notificationIcons = {
  customer_registered: Users,
  order_placed: ShoppingBag,
  order_cancelled: XCircle,
  quotation_requested: FileText,
  quotation_accepted: CheckCircle2,
  quotation_rejected: XCircle,
  bulk_order_requested: Package,
  return_requested: RotateCcw,
  contact_message: MessageSquare,
  customer_review: Star,
};

const notificationLabels = {
  customer_registered: 'Customer',
  order_placed: 'Order',
  order_cancelled: 'Cancelled order',
  quotation_requested: 'Quotation',
  quotation_accepted: 'Accepted quotation',
  quotation_rejected: 'Rejected quotation',
  bulk_order_requested: 'Bulk order',
  return_requested: 'Return / replacement',
  contact_message: 'Contact message',
  customer_review: 'Customer review',
};

const getDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTimestamp = (value) => {
  const date = getDate(value);
  if (!date) return 'Just now';

  const elapsed = Date.now() - date.getTime();
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatExactTimestamp = (value) => {
  const date = getDate(value);
  if (!date) return 'Timestamp pending';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyNotificationId, setBusyNotificationId] = useState('');
  const [bulkActionRunning, setBulkActionRunning] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const notificationsQuery = query(
      collection(db, 'adminNotifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs.map((notificationDocument) => ({
            id: notificationDocument.id,
            ...notificationDocument.data(),
          }))
        );
        setLoading(false);
        setError('');
      },
      (firebaseError) => {
        console.error('Admin notifications loading error:', firebaseError);
        setError(
          'Unable to load notifications. Confirm that this account has administrator access.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );
  const readCount = notifications.length - unreadNotifications.length;
  const todayCount = useMemo(() => {
    const today = new Date();

    return notifications.filter((notification) => {
      const date = getDate(notification.createdAt);

      return (
        date &&
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Unread' && !notification.isRead) ||
        (activeTab === 'Read' && notification.isRead);
      const matchesSearch =
        !search ||
        notification.title?.toLowerCase().includes(search) ||
        notification.message?.toLowerCase().includes(search) ||
        notificationLabels[notification.type]
          ?.toLowerCase()
          .includes(search);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, notifications, searchTerm]);

  const markAsRead = async (notification) => {
    if (notification.isRead) return;

    await updateDoc(doc(db, 'adminNotifications', notification.id), {
      isRead: true,
      readAt: serverTimestamp(),
    });
  };

  const handleMarkAsRead = async (notification) => {
    try {
      setBusyNotificationId(notification.id);
      await markAsRead(notification);
      toast.success('Notification marked as read.');
    } catch (firebaseError) {
      console.error('Mark notification as read error:', firebaseError);
      toast.error('Unable to update this notification.');
    } finally {
      setBusyNotificationId('');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0 || bulkActionRunning) return;

    try {
      setBulkActionRunning(true);

      for (let index = 0; index < unreadNotifications.length; index += 450) {
        const batch = writeBatch(db);

        unreadNotifications.slice(index, index + 450).forEach((item) => {
          batch.update(doc(db, 'adminNotifications', item.id), {
            isRead: true,
            readAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }

      toast.success('All notifications marked as read.');
    } catch (firebaseError) {
      console.error('Mark all notifications as read error:', firebaseError);
      toast.error('Unable to update all notifications.');
    } finally {
      setBulkActionRunning(false);
    }
  };

  const handleDelete = async (notification) => {
    const confirmed = window.confirm(
      `Delete “${notification.title}”? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setBusyNotificationId(notification.id);
      await deleteDoc(doc(db, 'adminNotifications', notification.id));
      toast.success('Notification deleted.');
    } catch (firebaseError) {
      console.error('Delete notification error:', firebaseError);
      toast.error('Unable to delete this notification.');
    } finally {
      setBusyNotificationId('');
    }
  };

  const openNotification = async (notification) => {
    try {
      setBusyNotificationId(notification.id);
      await markAsRead(notification);

      navigate(notification.targetPage || '/admin-notifications', {
        state: {
          relatedDocumentId: notification.relatedDocumentId || null,
          notificationType: notification.type || null,
          sourceCollection: notification.sourceCollection || null,
        },
      });
    } catch (firebaseError) {
      console.error('Open notification error:', firebaseError);
      toast.error('Unable to open this notification.');
    } finally {
      setBusyNotificationId('');
    }
  };

  const toggleSetting = (id, channel) => {
    setSettings((current) =>
      current.map((setting) =>
        setting.id === id
          ? { ...setting, [channel]: !setting[channel] }
          : setting
      )
    );
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div>
          <span className="notifications-eyebrow">
            COMMUNICATION CENTER
          </span>
          <h1>Notifications</h1>
          <p>
            Monitor live customer activity and open the relevant admin
            workflow directly.
          </p>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="notifications-header-badge">
            <Bell size={18} />
            <span>{unreadNotifications.length} Unread</span>
          </div>
        )}
      </header>

      <section className="notification-stats-grid">
        <article className="notification-stat-card">
          <div className="notification-stat-icon navy">
            <Bell size={21} />
          </div>
          <div>
            <span>Total Notifications</span>
            <h2>{notifications.length}</h2>
            <small>Live Firestore records</small>
          </div>
        </article>

        <article className="notification-stat-card">
          <div className="notification-stat-icon red">
            <Mail size={21} />
          </div>
          <div>
            <span>Unread</span>
            <h2>{unreadNotifications.length}</h2>
            <small>Needs attention</small>
          </div>
        </article>

        <article className="notification-stat-card">
          <div className="notification-stat-icon green">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Read</span>
            <h2>{readCount}</h2>
            <small>Reviewed activity</small>
          </div>
        </article>

        <article className="notification-stat-card">
          <div className="notification-stat-icon gold">
            <CalendarDays size={21} />
          </div>
          <div>
            <span>Today</span>
            <h2>{todayCount}</h2>
            <small>New activity today</small>
          </div>
        </article>
      </section>

      <section className="notification-history-panel">
        <div className="notification-panel-header">
          <div>
            <span className="notifications-section-label">ACTIVITY</span>
            <h2>Notification History</h2>
            <p>Newest customer events are shown first.</p>
          </div>

          <button
            type="button"
            className="notification-mark-all"
            onClick={handleMarkAllAsRead}
            disabled={
              unreadNotifications.length === 0 || bulkActionRunning
            }
          >
            <CheckCheck size={16} />
            {bulkActionRunning ? 'Updating...' : 'Mark All as Read'}
          </button>
        </div>

        <div className="notification-toolbar">
          <label className="notification-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Search notifications"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <div className="notification-tabs" role="tablist">
            {['All', 'Unread', 'Read'].map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="notification-empty" role="status">
              <Bell className="notification-loading-icon" size={30} />
              <h3>Loading notifications</h3>
              <p>Connecting to the MAISON activity stream...</p>
            </div>
          ) : error ? (
            <div className="notification-empty notification-error-state">
              <XCircle size={30} />
              <h3>Notifications unavailable</h3>
              <p>{error}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={30} />
              <h3>No notifications found</h3>
              <p>
                {notifications.length === 0
                  ? 'Customer activity will appear here in real time.'
                  : 'Try another filter or search term.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const NotificationIcon =
                notificationIcons[notification.type] || Bell;
              const busy = busyNotificationId === notification.id;

              return (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.isRead ? 'read' : 'unread'
                  }`}
                  onClick={() => openNotification(notification)}
                >
                  <div className="notification-item-icon">
                    <NotificationIcon size={20} />
                  </div>

                  <div className="notification-item-content">
                    <div className="notification-item-title">
                      <h3>{notification.title || 'Admin notification'}</h3>
                      {!notification.isRead && (
                        <span
                          className="notification-new-dot"
                          aria-label="Unread"
                        />
                      )}
                    </div>

                    <p>{notification.message || 'New customer activity.'}</p>

                    <div className="notification-item-meta">
                      <span className="notification-channel">
                        <NotificationIcon size={12} />
                        {notificationLabels[notification.type] || 'Activity'}
                      </span>
                      <span title={formatExactTimestamp(notification.createdAt)}>
                        <Clock size={12} />
                        {formatTimestamp(notification.createdAt)}
                      </span>
                      {notification.relatedDocumentId && (
                        <span>
                          ID: {notification.relatedDocumentId.slice(0, 12)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="notification-item-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span
                      className={`notification-status ${
                        notification.isRead ? 'read' : 'unread'
                      }`}
                    >
                      {notification.isRead ? 'Read' : 'Unread'}
                    </span>

                    <div className="notification-action-buttons">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification)}
                          disabled={busy}
                          title="Mark as read"
                          aria-label={`Mark ${notification.title} as read`}
                        >
                          <CheckCheck size={15} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        disabled={busy}
                        title="Open related page"
                        aria-label={`Open ${notification.title}`}
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        className="notification-delete-button"
                        onClick={() => handleDelete(notification)}
                        disabled={busy}
                        title="Delete notification"
                        aria-label={`Delete ${notification.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {!loading && !error && (
          <div className="notification-history-footer">
            Showing {filteredNotifications.length} of {notifications.length}{' '}
            notifications
          </div>
        )}
      </section>

      <section className="notification-settings-panel">
        <div className="notification-panel-header">
          <div>
            <span className="notifications-section-label">PREFERENCES</span>
            <h2>External Delivery Preferences</h2>
            <p>
              In-app alerts are live. Email and WhatsApp require separate
              provider integrations.
            </p>
          </div>

          <button
            type="button"
            className="notification-settings-toggle"
            onClick={() => setShowSettings((current) => !current)}
          >
            {showSettings ? <X size={15} /> : <Settings size={15} />}
            {showSettings ? 'Hide Settings' : 'Manage Settings'}
          </button>
        </div>

        {showSettings && (
          <div className="notification-settings-content">
            <div className="notification-settings-heading">
              <span>NOTIFICATION TYPE</span>
              <span>
                <Mail size={15} /> EMAIL
              </span>
              <span>
                <MessageCircle size={15} /> WHATSAPP
              </span>
            </div>

            {settings.map((setting) => (
              <div className="notification-setting-row" key={setting.id}>
                <div className="notification-setting-info">
                  <h3>{setting.title}</h3>
                  <p>{setting.description}</p>
                </div>

                {['email', 'whatsapp'].map((channel) => (
                  <div
                    className="notification-setting-control"
                    key={channel}
                  >
                    <button
                      type="button"
                      role="switch"
                      aria-checked={setting[channel]}
                      aria-label={`${setting.title} ${channel}`}
                      className={`notification-switch ${
                        setting[channel] ? 'enabled' : ''
                      }`}
                      onClick={() => toggleSetting(setting.id, channel)}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="notification-page-footer">
        <div>
          <Send size={15} />
          MAISON Communication Center
        </div>
        <p>Real-time in-app notifications powered by Cloud Firestore.</p>
      </footer>
    </div>
  );
}

export default Notifications;
