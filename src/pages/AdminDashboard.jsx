import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ShoppingBag,
  Users,
  IndianRupee,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Database,
  WifiOff,
  Eye,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';
import './AdminDashboard.css';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const BASE_ORDER_STATUSES = [
  'Delivered',
  'Processing',
  'Shipped',
  'Pending',
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const percentageFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
});

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toDate = (value) => {
  if (!value) return null;

  try {
    const date = value?.toDate
      ? value.toDate()
      : value instanceof Date
        ? value
        : typeof value?.seconds === 'number'
          ? new Date(value.seconds * 1000)
          : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getOrderDate = (order) => {
  const createdAt = toDate(order.createdAt);

  if (createdAt) return createdAt;

  if (typeof order.orderDate === 'string') {
    const dateParts = order.orderDate.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (dateParts) {
      const parsedDate = new Date(
        Number(dateParts[3]),
        Number(dateParts[2]) - 1,
        Number(dateParts[1])
      );

      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }

  return toDate(order.orderDate);
};

const getProductName = (product) =>
  product?.name ||
  product?.productName ||
  product?.title ||
  'Unnamed Product';

const getProductCategory = (product) =>
  product?.category ||
  product?.categoryName ||
  'Uncategorised';

const getProductQuantity = (product) => {
  const value = product?.quantity ?? product?.qty ?? 1;
  const quantity = toFiniteNumber(value);

  return quantity > 0 ? quantity : 0;
};

const getProductPrice = (product) =>
  toFiniteNumber(
    product?.price ??
    product?.salePrice ??
    product?.unitPrice ??
    product?.originalPrice ??
    0
  );

const getOrderStatus = (order) =>
  String(order.orderStatus || 'Order Placed').trim() ||
  'Order Placed';

const normaliseStatus = (status) =>
  String(status || '').trim().toLowerCase();

const isExcludedSale = (order) => {
  const orderStatus = normaliseStatus(order.orderStatus);
  const paymentStatus = normaliseStatus(order.paymentStatus);

  return [
    'cancelled',
    'canceled',
    'refunded',
  ].includes(orderStatus) || paymentStatus === 'refunded';
};

const formatPrice = (amount) =>
  currencyFormatter.format(toFiniteNumber(amount));

const formatOrderDate = (order) => {
  const date = getOrderDate(order);

  if (!date) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const calculateGrowth = (currentValue, previousValue) => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : null;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
};

const getStatusClass = (status) => {
  const value = normaliseStatus(status);

  if (value === 'delivered') return 'status-delivered';

  if (['processing', 'confirmed', 'order confirmed'].includes(value)) {
    return 'status-processing';
  }

  if (
    [
      'shipped',
      'in transit',
      'out for delivery',
    ].includes(value)
  ) {
    return 'status-shipped';
  }

  if (
    [
      'cancelled',
      'canceled',
      'refunded',
    ].includes(value)
  ) {
    return 'status-cancelled';
  }

  return 'status-pending';
};

const getStatusPresentation = (status) => {
  const value = normaliseStatus(status);

  if (value === 'delivered') {
    return {
      Icon: CheckCircle,
      iconClass: 'delivered-icon',
      description: 'Successfully completed',
    };
  }

  if (['processing', 'confirmed', 'order confirmed'].includes(value)) {
    return {
      Icon: Clock,
      iconClass: 'processing-icon',
      description: 'Currently being prepared',
    };
  }

  if (
    [
      'shipped',
      'in transit',
      'out for delivery',
    ].includes(value)
  ) {
    return {
      Icon: Truck,
      iconClass: 'shipped-icon',
      description: 'Moving through delivery',
    };
  }

  if (
    [
      'cancelled',
      'canceled',
      'refunded',
    ].includes(value)
  ) {
    return {
      Icon: AlertCircle,
      iconClass: 'cancelled-icon',
      description: 'Not counted as a sale',
    };
  }

  return {
    Icon: AlertCircle,
    iconClass: 'pending-icon',
    description:
      value === 'pending' || value === 'order placed'
        ? 'Waiting for confirmation'
        : 'Current order status',
  };
};

function ChangeIndicator({ value }) {
  if (value === null) {
    return (
      <span
        className="admin-stat-change neutral"
        title="The previous period has no data to use as a baseline."
      >
        No baseline
      </span>
    );
  }

  const isPositive = value >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={
        'admin-stat-change ' +
        (isPositive ? 'positive' : 'negative')
      }
    >
      <TrendIcon size={14} />
      {percentageFormatter.format(Math.abs(value))}%
    </span>
  );
}

function DashboardHeader({ connectionStatus }) {
  const statusContent = {
    connected: {
      Icon: Database,
      label: 'Firestore connected',
      title: 'Live data is connected to Firebase Firestore.',
    },
    cached: {
      Icon: Database,
      label: 'Using cached Firestore data',
      title:
        'Firestore has returned cached data while the live connection is unavailable.',
    },
    disconnected: {
      Icon: WifiOff,
      label: 'Firestore disconnected',
      title:
        'The dashboard is not currently connected to Firebase Firestore.',
    },
    connecting: {
      Icon: RefreshCw,
      label: 'Connecting to Firestore',
      title: 'The dashboard is establishing its Firestore connection.',
    },
  }[connectionStatus];

  const ConnectionIcon = statusContent.Icon;

  return (
    <header className="admin-header">
      <div>
        <span className="admin-breadcrumb">
          MAISON / ADMIN
        </span>

        <h1>Dashboard Overview</h1>

        <p>
          Live store performance from Firebase Firestore.
        </p>
      </div>

      <div className="admin-header-actions">
        <div
          className={
            'admin-date admin-live-data ' + connectionStatus
          }
          role="status"
          title={statusContent.title}
        >
          <ConnectionIcon
            size={17}
            className={
              connectionStatus === 'connecting'
                ? 'admin-connection-spinner'
                : undefined
            }
          />
          <span>{statusContent.label}</span>
        </div>

        <Link
          to="/"
          className="admin-view-store"
          title="Open the MAISON storefront"
        >
          <Eye size={17} />
          Store Overview
        </Link>
      </div>
    </header>
  );
}

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loaded, setLoaded] = useState({
    orders: false,
    customers: false,
  });
  const [error, setError] = useState('');
  const [listenerStatus, setListenerStatus] = useState({
    orders: 'connecting',
    customers: 'connecting',
  });
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const orderMenuRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!orderMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!orderMenuRef.current?.contains(event.target)) {
        setOrderMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOrderMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [orderMenuOpen]);

  useEffect(() => {
    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const firestoreOrders = snapshot.docs.map((document) => ({
          firestoreId: document.id,
          ...document.data(),
        }));

        setOrders(firestoreOrders);
        setLoaded((previous) => ({
          ...previous,
          orders: true,
        }));
        setListenerStatus((previous) => ({
          ...previous,
          orders: snapshot.metadata.fromCache
            ? 'cached'
            : 'connected',
        }));
      },
      (firebaseError) => {
        console.error('Admin dashboard orders error:', firebaseError);
        setError(
          'Unable to load dashboard orders from Firestore. Please check your access permissions and try again.'
        );
        setLoaded((previous) => ({
          ...previous,
          orders: true,
        }));
        setListenerStatus((previous) => ({
          ...previous,
          orders: 'disconnected',
        }));
      }
    );

    const unsubscribeCustomers = onSnapshot(
      collection(db, 'users'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const firestoreCustomers = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .filter((user) => user.role !== 'admin');

        setCustomers(firestoreCustomers);
        setLoaded((previous) => ({
          ...previous,
          customers: true,
        }));
        setListenerStatus((previous) => ({
          ...previous,
          customers: snapshot.metadata.fromCache
            ? 'cached'
            : 'connected',
        }));
      },
      (firebaseError) => {
        console.error('Admin dashboard customers error:', firebaseError);
        setError(
          'Unable to load dashboard customers from Firestore. Please check your access permissions and try again.'
        );
        setLoaded((previous) => ({
          ...previous,
          customers: true,
        }));
        setListenerStatus((previous) => ({
          ...previous,
          customers: 'disconnected',
        }));
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
    };
  }, [refreshKey]);

  const loading = !loaded.orders || !loaded.customers;
  const connectionStatus = useMemo(() => {
    const statuses = Object.values(listenerStatus);

    if (
      !isBrowserOnline ||
      error ||
      statuses.includes('disconnected')
    ) {
      return 'disconnected';
    }

    if (statuses.every((status) => status === 'connected')) {
      return 'connected';
    }

    if (
      loaded.orders &&
      loaded.customers &&
      statuses.includes('cached')
    ) {
      return 'cached';
    }

    return 'connecting';
  }, [
    error,
    isBrowserOnline,
    listenerStatus,
    loaded.customers,
    loaded.orders,
  ]);

  const refreshDashboard = () => {
    setOrderMenuOpen(false);
    setError('');
    setLoaded({
      orders: false,
      customers: false,
    });
    setListenerStatus({
      orders: 'connecting',
      customers: 'connecting',
    });
    setRefreshKey((previous) => previous + 1);
  };

  const validSalesOrders = useMemo(
    () => orders.filter((order) => !isExcludedSale(order)),
    [orders]
  );

  const availableYears = useMemo(() => {
    const years = new Set();

    validSalesOrders.forEach((order) => {
      const date = getOrderDate(order);

      if (date) years.add(date.getFullYear());
    });

    if (years.size === 0) {
      return [new Date().getFullYear()];
    }

    return Array.from(years).sort((first, second) => second - first);
  }, [validSalesOrders]);

  const dashboardYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0];

  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
    const nextMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const isInPeriod = (date, start, end) =>
      date && date >= start && date < end;

    const orderTotal = (order) => toFiniteNumber(order.total);

    const countUnits = (order) =>
      (Array.isArray(order.products) ? order.products : [])
        .reduce(
          (sum, product) =>
            sum + getProductQuantity(product),
          0
        );

    const currentMonthSales = validSalesOrders.filter((order) =>
      isInPeriod(
        getOrderDate(order),
        currentMonthStart,
        nextMonthStart
      )
    );

    const previousMonthSales = validSalesOrders.filter((order) =>
      isInPeriod(
        getOrderDate(order),
        previousMonthStart,
        currentMonthStart
      )
    );

    const currentMonthOrders = orders.filter((order) =>
      isInPeriod(
        getOrderDate(order),
        currentMonthStart,
        nextMonthStart
      )
    );

    const previousMonthOrders = orders.filter((order) =>
      isInPeriod(
        getOrderDate(order),
        previousMonthStart,
        currentMonthStart
      )
    );

    const currentMonthCustomers = customers.filter((customer) =>
      isInPeriod(
        toDate(customer.createdAt || customer.joined),
        currentMonthStart,
        nextMonthStart
      )
    );

    const previousMonthCustomers = customers.filter((customer) =>
      isInPeriod(
        toDate(customer.createdAt || customer.joined),
        previousMonthStart,
        currentMonthStart
      )
    );

    const totalRevenue = validSalesOrders.reduce(
      (sum, order) => sum + orderTotal(order),
      0
    );

    const productsSold = validSalesOrders.reduce(
      (sum, order) => sum + countUnits(order),
      0
    );

    const currentRevenue = currentMonthSales.reduce(
      (sum, order) => sum + orderTotal(order),
      0
    );

    const previousRevenue = previousMonthSales.reduce(
      (sum, order) => sum + orderTotal(order),
      0
    );

    const currentUnits = currentMonthSales.reduce(
      (sum, order) => sum + countUnits(order),
      0
    );

    const previousUnits = previousMonthSales.reduce(
      (sum, order) => sum + countUnits(order),
      0
    );

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalCustomers: customers.length,
      productsSold,
      revenueGrowth: calculateGrowth(
        currentRevenue,
        previousRevenue
      ),
      orderGrowth: calculateGrowth(
        currentMonthOrders.length,
        previousMonthOrders.length
      ),
      customerGrowth: calculateGrowth(
        currentMonthCustomers.length,
        previousMonthCustomers.length
      ),
      productGrowth: calculateGrowth(
        currentUnits,
        previousUnits
      ),
    };
  }, [customers, orders, validSalesOrders]);

  const salesOverview = useMemo(() => {
    const salesData = MONTHS.map((month) => ({
      month,
      sales: 0,
    }));

    let selectedYearRevenue = 0;
    let previousYearRevenue = 0;

    validSalesOrders.forEach((order) => {
      const date = getOrderDate(order);

      if (!date) return;

      const total = toFiniteNumber(order.total);

      if (date.getFullYear() === dashboardYear) {
        salesData[date.getMonth()].sales += total;
        selectedYearRevenue += total;
      }

      if (date.getFullYear() === dashboardYear - 1) {
        previousYearRevenue += total;
      }
    });

    return {
      salesData,
      revenue: selectedYearRevenue,
      growth: calculateGrowth(
        selectedYearRevenue,
        previousYearRevenue
      ),
    };
  }, [dashboardYear, validSalesOrders]);

  const statusSummary = useMemo(() => {
    const counts = new Map();

    orders.forEach((order) => {
      const label = getOrderStatus(order);
      const key = normaliseStatus(label);
      const current = counts.get(key);

      counts.set(key, {
        label: current?.label || label,
        count: (current?.count || 0) + 1,
      });
    });

    const baseKeys = new Set(
      BASE_ORDER_STATUSES.map(normaliseStatus)
    );

    const primaryStatuses = BASE_ORDER_STATUSES.map((label) => ({
      label,
      count: counts.get(normaliseStatus(label))?.count || 0,
    }));

    const additionalStatuses = Array.from(counts.entries())
      .filter(([key]) => !baseKeys.has(key))
      .map(([, value]) => value)
      .sort(
        (first, second) =>
          second.count - first.count ||
          first.label.localeCompare(second.label)
      );

    return [...primaryStatuses, ...additionalStatuses];
  }, [orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((first, second) => {
          const firstDate = getOrderDate(first)?.getTime() || 0;
          const secondDate = getOrderDate(second)?.getTime() || 0;

          return secondDate - firstDate;
        })
        .slice(0, 5),
    [orders]
  );

  const topProducts = useMemo(() => {
    const productTotals = new Map();

    validSalesOrders.forEach((order) => {
      const products = Array.isArray(order.products)
        ? order.products
        : [];

      products.forEach((product) => {
        const name = getProductName(product);
        const productId =
          product?.id || product?.productId || name.toLowerCase();
        const key = String(productId);
        const quantity = getProductQuantity(product);
        const revenue = getProductPrice(product) * quantity;
        const existing = productTotals.get(key);

        productTotals.set(key, {
          key,
          name: existing?.name || name,
          category:
            existing?.category || getProductCategory(product),
          image:
            existing?.image ||
            product?.image ||
            product?.imageUrl ||
            product?.priorityImage ||
            '',
          sold: (existing?.sold || 0) + quantity,
          revenue: (existing?.revenue || 0) + revenue,
        });
      });
    });

    return Array.from(productTotals.values())
      .sort(
        (first, second) =>
          second.sold - first.sold ||
          second.revenue - first.revenue
      )
      .slice(0, 5);
  }, [validSalesOrders]);

  if (error) {
    return (
      <main className="admin-main" id="overview">
        <DashboardHeader connectionStatus={connectionStatus} />

        <section
          className="admin-panel admin-dashboard-state admin-dashboard-error"
          role="alert"
        >
          <AlertCircle size={28} />
          <h2>Dashboard data could not be loaded</h2>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="admin-main" id="overview">
        <DashboardHeader connectionStatus={connectionStatus} />

        <section
          className="admin-panel admin-dashboard-state"
          aria-live="polite"
        >
          <div className="admin-state-spinner" />
          <h2>Loading live dashboard data</h2>
          <p>Connecting to Firestore orders and customers...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-main" id="overview">
      <DashboardHeader connectionStatus={connectionStatus} />

      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <div className="admin-stat-icon navy-icon">
              <IndianRupee size={21} />
            </div>

            <ChangeIndicator value={dashboardData.revenueGrowth} />
          </div>

          <span className="admin-stat-label">
            Total Revenue
          </span>

          <h2>{formatPrice(dashboardData.totalRevenue)}</h2>

          <p>Current month vs previous month</p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <div className="admin-stat-icon gold-icon">
              <ShoppingBag size={21} />
            </div>

            <ChangeIndicator value={dashboardData.orderGrowth} />
          </div>

          <span className="admin-stat-label">
            Total Orders
          </span>

          <h2>{numberFormatter.format(dashboardData.totalOrders)}</h2>

          <p>Current month vs previous month</p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <div className="admin-stat-icon green-icon">
              <Users size={21} />
            </div>

            <ChangeIndicator value={dashboardData.customerGrowth} />
          </div>

          <span className="admin-stat-label">
            Total Customers
          </span>

          <h2>{numberFormatter.format(dashboardData.totalCustomers)}</h2>

          <p>Current month vs previous month</p>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <div className="admin-stat-icon orange-icon">
              <Package size={21} />
            </div>

            <ChangeIndicator value={dashboardData.productGrowth} />
          </div>

          <span className="admin-stat-label">
            Products Sold
          </span>

          <h2>{numberFormatter.format(dashboardData.productsSold)}</h2>

          <p>Current month vs previous month</p>
        </div>
      </section>

      <section className="admin-middle-grid" id="sales">
        <div className="admin-panel admin-sales-panel">
          <div className="admin-panel-heading">
            <div>
              <span>PERFORMANCE</span>
              <h3>Sales Overview</h3>
            </div>

            <select
              value={dashboardYear}
              onChange={(event) =>
                setSelectedYear(Number(event.target.value))
              }
              aria-label="Select sales year"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-chart-summary">
            <h2>{formatPrice(salesOverview.revenue)}</h2>

            <span
              className={
                salesOverview.growth === null
                  ? 'neutral'
                  : salesOverview.growth >= 0
                    ? 'positive'
                    : 'negative'
              }
            >
              {salesOverview.growth !== null &&
                (salesOverview.growth >= 0 ? (
                  <ArrowUpRight size={15} />
                ) : (
                  <TrendingDown size={15} />
                ))}

              {salesOverview.growth === null
                ? 'No prior-year baseline'
                : percentageFormatter.format(
                    Math.abs(salesOverview.growth)
                  ) +
                  '% vs ' +
                  (dashboardYear - 1)}
            </span>
          </div>

          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={salesOverview.salesData}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#C6A15B"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="100%"
                      stopColor="#C6A15B"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E7E9ED"
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#7B8491', fontSize: 11 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#7B8491', fontSize: 11 }}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? numberFormatter.format(value / 1000) + 'k'
                      : numberFormatter.format(value)
                  }
                />

                <Tooltip
                  formatter={(value) => [
                    formatPrice(value),
                    'Revenue',
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#C6A15B"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>

            {salesOverview.revenue === 0 && (
              <p className="admin-chart-empty">
                No non-cancelled sales recorded for {dashboardYear}.
              </p>
            )}
          </div>
        </div>

        <div className="admin-panel admin-order-summary">
          <div className="admin-panel-heading">
            <div>
              <span>ORDER ACTIVITY</span>
              <h3>Order Summary</h3>
            </div>

            <div
              className="admin-order-actions"
              ref={orderMenuRef}
            >
              <button
                type="button"
                className="admin-order-menu-trigger"
                onClick={() =>
                  setOrderMenuOpen((previous) => !previous)
                }
                aria-label="Open order activity actions"
                aria-haspopup="menu"
                aria-expanded={orderMenuOpen}
              >
                <MoreHorizontal size={22} />
              </button>

              {orderMenuOpen && (
                <div
                  className="admin-order-menu"
                  role="menu"
                  aria-label="Order activity actions"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={refreshDashboard}
                  >
                    <RefreshCw size={15} />
                    Refresh data
                  </button>

                  <Link
                    to="/admin-orders"
                    role="menuitem"
                    onClick={() => setOrderMenuOpen(false)}
                  >
                    <ShoppingBag size={15} />
                    View All Orders
                  </Link>
                </div>
              )}
            </div>
          </div>

          {statusSummary.map((status) => {
            const presentation = getStatusPresentation(status.label);
            const StatusIcon = presentation.Icon;

            return (
              <div
                className="admin-order-status"
                key={normaliseStatus(status.label)}
              >
                <div
                  className={
                    'order-status-icon ' +
                    presentation.iconClass
                  }
                >
                  <StatusIcon size={19} />
                </div>

                <div>
                  <strong>{status.label}</strong>
                  <span>{presentation.description}</span>
                </div>

                <h3>{numberFormatter.format(status.count)}</h3>
              </div>
            );
          })}

          {orders.length === 0 && (
            <p className="admin-inline-empty">
              No orders found in Firestore.
            </p>
          )}
        </div>
      </section>

      <section
        className="admin-panel admin-recent-orders"
        id="orders"
      >
        <div className="admin-panel-heading">
          <div>
            <span>STORE ACTIVITY</span>
            <h3>Recent Orders</h3>
          </div>

          <Link
            to="/admin-orders"
            className="admin-view-all"
          >
            View All Orders
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>PRODUCT</th>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((order) => {
                const products = Array.isArray(order.products)
                  ? order.products
                  : [];
                const productNames = products
                  .map(getProductName)
                  .filter(Boolean);
                const orderId =
                  order.orderId || order.firestoreId;
                const status = getOrderStatus(order);

                return (
                  <tr key={order.firestoreId || orderId}>
                    <td className="admin-order-id">
                      {orderId}
                    </td>

                    <td>
                      {order.customer?.fullName ||
                        order.customer?.name ||
                        'Customer name unavailable'}
                    </td>

                    <td>
                      {productNames.length > 0
                        ? productNames.join(', ')
                        : 'No product details'}
                    </td>

                    <td>{formatOrderDate(order)}</td>

                    <td className="admin-order-amount">
                      {formatPrice(order.total)}
                    </td>

                    <td>
                      <span
                        className={
                          'admin-order-badge ' +
                          getStatusClass(status)
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="admin-table-empty"
                  >
                    No customer orders found in Firestore.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="admin-panel admin-top-products"
        id="products"
      >
        <div className="admin-panel-heading">
          <div>
            <span>PRODUCT PERFORMANCE</span>
            <h3>Top Selling Products</h3>
          </div>

          <Link
            to="/admin-products"
            className="admin-view-all"
          >
            Manage Products
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="admin-products-list">
          {topProducts.map((product, index) => (
            <div
              className="admin-product-row"
              key={product.key}
            >
              <span className="admin-product-rank">
                {String(index + 1).padStart(2, '0')}
              </span>

              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                />
              ) : (
                <div
                  className="admin-product-image-empty"
                  aria-hidden="true"
                >
                  <Package size={23} />
                </div>
              )}

              <div className="admin-product-info">
                <strong>{product.name}</strong>
                <span>{product.category}</span>
              </div>

              <div className="admin-product-sold">
                <strong>
                  {numberFormatter.format(product.sold)}
                </strong>
                <span>Units Sold</span>
              </div>

              <div className="admin-product-revenue">
                <strong>
                  {formatPrice(product.revenue)}
                </strong>
                <span>Revenue</span>
              </div>
            </div>
          ))}

          {topProducts.length === 0 && (
            <div className="admin-products-empty">
              <Package size={25} />
              <p>
                No non-cancelled product sales found in Firestore.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="admin-footer">
        <span>MAISON Admin Dashboard</span>
        <span>Own Your Style. Elevate Your Lifestyle.</span>
      </footer>
    </main>
  );
}

export default AdminDashboard;
