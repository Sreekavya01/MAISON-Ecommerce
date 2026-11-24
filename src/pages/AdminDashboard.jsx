
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
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  CalendarDays,
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

import './AdminDashboard.css';

function AdminDashboard() {
  const salesData = [
    { month: 'Jan', sales: 18000 },
    { month: 'Feb', sales: 25000 },
    { month: 'Mar', sales: 21000 },
    { month: 'Apr', sales: 32000 },
    { month: 'May', sales: 28000 },
    { month: 'Jun', sales: 42000 },
    { month: 'Jul', sales: 38000 },
    { month: 'Aug', sales: 51000 },
    { month: 'Sep', sales: 45000 },
    { month: 'Oct', sales: 62000 },
    { month: 'Nov', sales: 58000 },
    { month: 'Dec', sales: 75000 },
  ];

  const orders = [
    {
      id: '#MSN1025',
      customer: 'Ananya Sharma',
      product: 'Elegant Summer Dress',
      date: '08 Nov 2026',
      amount: 1899,
      status: 'Delivered',
    },
    {
      id: '#MSN1024',
      customer: 'Rahul Verma',
      product: 'Classic Sneakers',
      date: '08 Nov 2026',
      amount: 2299,
      status: 'Processing',
    },
    {
      id: '#MSN1023',
      customer: 'Priya Reddy',
      product: 'Premium Handbag',
      date: '07 Nov 2026',
      amount: 2999,
      status: 'Shipped',
    },
    {
      id: '#MSN1022',
      customer: 'Arjun Kumar',
      product: 'Wireless Headphones',
      date: '07 Nov 2026',
      amount: 3499,
      status: 'Pending',
    },
    {
      id: '#MSN1021',
      customer: 'Meera Nair',
      product: 'Smart Watch',
      date: '06 Nov 2026',
      amount: 2599,
      status: 'Delivered',
    },
  ];

  const topProducts = [
    {
      name: 'Elegant Summer Dress',
      category: "Women's Fashion",
      sold: 128,
      revenue: 243072,
      image:
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200',
    },
    {
      name: 'Classic Sneakers',
      category: 'Footwear',
      sold: 96,
      revenue: 220704,
      image:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    },
    {
      name: 'Premium Handbag',
      category: 'Accessories',
      sold: 84,
      revenue: 251916,
      image:
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200',
    },
  ];

  const formatPrice = (amount) =>
    `₹${amount.toLocaleString('en-IN')}`;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Delivered':
        return 'status-delivered';

      case 'Processing':
        return 'status-processing';

      case 'Shipped':
        return 'status-shipped';

      default:
        return 'status-pending';
    }
  };

  return (
    <main className="admin-main" id="overview">

      {/* TOP HEADER */}

      <header className="admin-header">

        <div>
          <span className="admin-breadcrumb">
            MAISON / ADMIN
          </span>

          <h1>Dashboard Overview</h1>

          <p>
            Welcome back! Here's what's happening with your store.
          </p>
        </div>

        <div className="admin-header-actions">

          <label className="admin-date">
  <CalendarDays size={17} />

  <input
    type="date"
    defaultValue="2026-11-16"
    aria-label="Select dashboard date"
  />
</label>

          {/* STORE OVERVIEW BUTTON */}

          <Link
            to="/admin-dashboard"
            className="admin-view-store"
          >
            <Eye size={17} />
            Store Overview
          </Link>

        </div>

      </header>

      {/* STATISTICS */}

      <section className="admin-stats-grid">

        <div className="admin-stat-card">
          <div className="admin-stat-top">

            <div className="admin-stat-icon navy-icon">
              <IndianRupee size={21} />
            </div>

            <span className="admin-stat-change positive">
              <TrendingUp size={14} /> 12.8%
            </span>

          </div>

          <span className="admin-stat-label">
            Total Revenue
          </span>

          <h2>₹8,45,600</h2>

          <p>Compared to previous month</p>
        </div>


        <div className="admin-stat-card">
          <div className="admin-stat-top">

            <div className="admin-stat-icon gold-icon">
              <ShoppingBag size={21} />
            </div>

            <span className="admin-stat-change positive">
              <TrendingUp size={14} /> 8.4%
            </span>

          </div>

          <span className="admin-stat-label">
            Total Orders
          </span>

          <h2>1,284</h2>

          <p>Compared to previous month</p>
        </div>


        <div className="admin-stat-card">
          <div className="admin-stat-top">

            <div className="admin-stat-icon green-icon">
              <Users size={21} />
            </div>

            <span className="admin-stat-change positive">
              <TrendingUp size={14} /> 15.2%
            </span>

          </div>

          <span className="admin-stat-label">
            Total Customers
          </span>

          <h2>3,842</h2>

          <p>Compared to previous month</p>
        </div>


        <div className="admin-stat-card">
          <div className="admin-stat-top">

            <div className="admin-stat-icon orange-icon">
              <Package size={21} />
            </div>

            <span className="admin-stat-change negative">
              <TrendingDown size={14} /> 2.1%
            </span>

          </div>

          <span className="admin-stat-label">
            Products Sold
          </span>

          <h2>2,456</h2>

          <p>Compared to previous month</p>
        </div>

      </section>

      {/* SALES CHART AND ORDER SUMMARY */}

      <section className="admin-middle-grid" id="sales">

        <div className="admin-panel admin-sales-panel">

          <div className="admin-panel-heading">

            <div>
              <span>PERFORMANCE</span>
              <h3>Sales Overview</h3>
            </div>

            <select defaultValue="2026">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

          </div>

          <div className="admin-chart-summary">

            <h2>₹8,45,600</h2>

            <span>
              <ArrowUpRight size={15} />
              12.8% this year
            </span>

          </div>

          <div className="admin-chart">

            <ResponsiveContainer width="100%" height={260}>

              <AreaChart data={salesData}>

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
                  tickFormatter={(value) => `${value / 1000}k`}
                />

                <Tooltip
                  formatter={(value) => formatPrice(value)}
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

          </div>

        </div>


        {/* ORDER SUMMARY */}

        <div className="admin-panel admin-order-summary">

          <div className="admin-panel-heading">

            <div>
              <span>ORDER ACTIVITY</span>
              <h3>Order Summary</h3>
            </div>

            <MoreHorizontal size={22} />

          </div>


          <div className="admin-order-status">

            <div className="order-status-icon delivered-icon">
              <CheckCircle size={19} />
            </div>

            <div>
              <strong>Delivered</strong>
              <span>Successfully completed</span>
            </div>

            <h3>845</h3>

          </div>


          <div className="admin-order-status">

            <div className="order-status-icon processing-icon">
              <Clock size={19} />
            </div>

            <div>
              <strong>Processing</strong>
              <span>Currently being prepared</span>
            </div>

            <h3>216</h3>

          </div>


          <div className="admin-order-status">

            <div className="order-status-icon shipped-icon">
              <Truck size={19} />
            </div>

            <div>
              <strong>Shipped</strong>
              <span>On the way to customers</span>
            </div>

            <h3>145</h3>

          </div>


          <div className="admin-order-status">

            <div className="order-status-icon pending-icon">
              <AlertCircle size={19} />
            </div>

            <div>
              <strong>Pending</strong>
              <span>Waiting for confirmation</span>
            </div>

            <h3>78</h3>

          </div>

        </div>

      </section>


      {/* RECENT ORDERS */}

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

              {orders.map((order) => (

                <tr key={order.id}>

                  <td className="admin-order-id">
                    {order.id}
                  </td>

                  <td>{order.customer}</td>

                  <td>{order.product}</td>

                  <td>{order.date}</td>

                  <td className="admin-order-amount">
                    {formatPrice(order.amount)}
                  </td>

                  <td>
                    <span
                      className={`admin-order-badge ${getStatusClass(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* TOP PRODUCTS */}

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
              key={product.name}
            >

              <span className="admin-product-rank">
                0{index + 1}
              </span>

              <img
                src={product.image}
                alt={product.name}
              />

              <div className="admin-product-info">
                <strong>{product.name}</strong>
                <span>{product.category}</span>
              </div>

              <div className="admin-product-sold">
                <strong>{product.sold}</strong>
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

        </div>

      </section>


      {/* FOOTER */}

      <footer className="admin-footer">
        <span>MAISON Admin Dashboard</span>
        <span>Own Your Style. Elevate Your Lifestyle.</span>
      </footer>

    </main>
  );
}

export default AdminDashboard;
