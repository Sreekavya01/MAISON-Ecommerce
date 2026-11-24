import { useState, useEffect, useMemo } from 'react';

import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Users,
  Download,
  CalendarDays,
  ArrowUpRight,
  Package,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { db } from '../firebase';

import './SalesReports.css';

const categoryColors = [
  '#172B4D',
  '#C6A15B',
  '#7B91B2',
  '#B8A58A',
  '#D9DDE5',
];

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const getOrderDate = (order) => {
  if (order.createdAt?.toDate) {
    return order.createdAt.toDate();
  }

  if (order.createdAt instanceof Date) {
    return order.createdAt;
  }

  if (order.orderDate) {
    const parts = String(order.orderDate).split('/');

    if (parts.length === 3) {
      const date = new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0])
      );

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    const parsed = new Date(order.orderDate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const getProductName = (product) =>
  product.name ||
  product.productName ||
  product.title ||
  'Unnamed Product';

const getProductCategory = (product) =>
  product.category ||
  product.categoryName ||
  'Others';

const getProductQuantity = (product) =>
  Number(product.quantity || product.qty || 1);

const getProductPrice = (product) =>
  Number(
    product.price ||
    product.salePrice ||
    product.unitPrice ||
    0
  );

const isCancelled = (order) =>
  ['cancelled', 'canceled', 'refunded'].includes(
    String(order.orderStatus || '').toLowerCase()
  );

function SalesReports() {
  const [dateRange, setDateRange] = useState('7 Days');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const orderData = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setOrders(orderData);
        setLoading(false);
        setError('');
      },
      (firebaseError) => {
        console.error('Sales Reports error:', firebaseError);
        setError('Unable to load sales data. Please check your access permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const reportData = useMemo(() => {
    const today = new Date();

    const validOrders = orders.filter(
      (order) => !isCancelled(order)
    );

    const periodOrders = validOrders.filter((order) => {
      const orderDate = getOrderDate(order);

      if (!orderDate) return false;

      if (dateRange === '7 Days') {
        const startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - 6);

        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        return orderDate >= startDate && orderDate <= endDate;
      }

      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 11,
        1
      );

      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      return orderDate >= startDate && orderDate <= endDate;
    });

    const totalRevenue = periodOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const totalOrders = periodOrders.length;

    const averageOrderValue = totalOrders
      ? Math.round(totalRevenue / totalOrders)
      : 0;

    const uniqueCustomers = new Set(
      periodOrders
        .map((order) => order.userId)
        .filter(Boolean)
    );

    // Revenue and order chart data

    let chartData = [];

    if (dateRange === '7 Days') {
      chartData = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));

        const dayOrders = periodOrders.filter((order) => {
          const orderDate = getOrderDate(order);

          return (
            orderDate &&
            orderDate.getFullYear() === date.getFullYear() &&
            orderDate.getMonth() === date.getMonth() &&
            orderDate.getDate() === date.getDate()
          );
        });

        return {
          day: date.toLocaleDateString('en-IN', {
            weekday: 'short',
          }),
          sales: dayOrders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0
          ),
          orders: dayOrders.length,
        };
      });
    } else {
      chartData = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(
          today.getFullYear(),
          today.getMonth() - 11 + index,
          1
        );

        const monthOrders = periodOrders.filter((order) => {
          const orderDate = getOrderDate(order);

          return (
            orderDate &&
            orderDate.getFullYear() === date.getFullYear() &&
            orderDate.getMonth() === date.getMonth()
          );
        });

        return {
          day: date.toLocaleDateString('en-IN', {
            month: 'short',
          }),
          sales: monthOrders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0
          ),
          orders: monthOrders.length,
        };
      });
    }

    // Category-wise revenue

    const categoryTotals = {};

    periodOrders.forEach((order) => {
      (Array.isArray(order.products) ? order.products : []).forEach(
        (product) => {
          const category = getProductCategory(product);
          const quantity = getProductQuantity(product);
          const price = getProductPrice(product);

          const revenue = price * quantity;

          categoryTotals[category] =
            (categoryTotals[category] || 0) + revenue;
        }
      );
    });

    const categoryRevenue = Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const totalCategoryRevenue = categoryRevenue.reduce(
      (sum, category) => sum + category.value,
      0
    );

    const categoryData = categoryRevenue.map((category) => ({
      name: category.name,
      value: totalCategoryRevenue
        ? Math.round(
            (category.value / totalCategoryRevenue) * 100
          )
        : 0,
    }));

    // Top-selling products

    const productTotals = {};

    periodOrders.forEach((order) => {
      (Array.isArray(order.products) ? order.products : []).forEach(
        (product) => {
          const name = getProductName(product);
          const category = getProductCategory(product);
          const quantity = getProductQuantity(product);
          const price = getProductPrice(product);

          if (!productTotals[name]) {
            productTotals[name] = {
              name,
              category,
              sales: 0,
              revenue: 0,
            };
          }

          productTotals[name].sales += quantity;
          productTotals[name].revenue += price * quantity;
        }
      );
    });

    const topProducts = Object.values(productTotals)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers: uniqueCustomers.size,
      chartData,
      categoryData,
      topProducts,
    };
  }, [orders, dateRange]);

  const {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalCustomers,
    chartData,
    categoryData,
    topProducts,
  } = reportData;

  const downloadReport = () => {
    const rows = [
      ['Product', 'Category', 'Units Sold', 'Revenue'],
      ...topProducts.map((product) => [
        product.name,
        product.category,
        product.sales,
        product.revenue,
      ]),
    ];

    rows.push([]);
    rows.push(['Total Revenue', totalRevenue]);
    rows.push(['Total Orders', totalOrders]);
    rows.push(['Average Order Value', averageOrderValue]);
    rows.push(['Customers', totalCustomers]);

    const csvContent = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'maison-sales-report.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="sales-reports-page">
        <div className="sales-page-header">
          <div>
            <span className="sales-eyebrow">
              BUSINESS PERFORMANCE
            </span>
            <h1>Sales Reports</h1>
            <p>Loading your sales data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-reports-page">
        <div className="sales-page-header">
          <div>
            <span className="sales-eyebrow">
              BUSINESS PERFORMANCE
            </span>
            <h1>Sales Reports</h1>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-reports-page">

      {/* PAGE HEADER */}

      <div className="sales-page-header">
        <div>
          <span className="sales-eyebrow">
            BUSINESS PERFORMANCE
          </span>

          <h1>Sales Reports</h1>

          <p>
            Track revenue, understand customer trends and
            monitor your store's performance.
          </p>
        </div>

        <button
          className="sales-export-btn"
          onClick={downloadReport}
        >
          <Download size={17} />
          Export Report
        </button>
      </div>

      {/* DATE FILTER */}

      <div className="sales-filter-bar">
        <div className="sales-filter-label">
          <CalendarDays size={18} />
          <span>Report Period</span>
        </div>

        <div className="sales-filter-options">
          {['7 Days', '12 Months'].map((range) => (
            <button
              key={range}
              className={
                dateRange === range ? 'selected' : ''
              }
              onClick={() => setDateRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <section className="sales-stats-grid">

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span>Total Revenue</span>
            <div className="sales-stat-icon gold">
              <IndianRupee size={20} />
            </div>
          </div>

          <h2>{formatCurrency(totalRevenue)}</h2>

          <div className="sales-stat-change positive">
            <ArrowUpRight size={15} />
            <span>Based on actual orders</span>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span>Total Orders</span>
            <div className="sales-stat-icon blue">
              <ShoppingBag size={20} />
            </div>
          </div>

          <h2>{totalOrders.toLocaleString('en-IN')}</h2>

          <div className="sales-stat-change positive">
            <ArrowUpRight size={15} />
            <span>Orders in selected period</span>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span>Average Order Value</span>
            <div className="sales-stat-icon green">
              <TrendingUp size={20} />
            </div>
          </div>

          <h2>{formatCurrency(averageOrderValue)}</h2>

          <div className="sales-stat-change positive">
            <ArrowUpRight size={15} />
            <span>Average revenue per order</span>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span>Customers</span>
            <div className="sales-stat-icon purple">
              <Users size={20} />
            </div>
          </div>

          <h2>
            {totalCustomers.toLocaleString('en-IN')}
          </h2>

          <div className="sales-stat-change positive">
            <ArrowUpRight size={15} />
            <span>Unique customers who ordered</span>
          </div>
        </div>

      </section>

      {/* REVENUE CHART */}

      <section className="sales-chart-panel">

        <div className="sales-panel-heading">
          <div>
            <h2>Revenue Overview</h2>
            <p>
              Sales performance during the selected period
            </p>
          </div>

          <span className="sales-chart-badge">
            <span></span>
            Revenue
          </span>
        </div>

        <div className="sales-main-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 15,
                right: 15,
                left: 5,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient
                  id="salesGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#C6A15B"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="#C6A15B"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E9EAF0"
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8992A1', fontSize: 12 }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8992A1', fontSize: 12 }}
                tickFormatter={(value) =>
                  `₹${value / 1000}k`
                }
              />

              <Tooltip
                formatter={(value) => [
                  formatCurrency(value),
                  'Revenue',
                ]}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #E7E9ED',
                }}
              />

              <Area
                type="monotone"
                dataKey="sales"
                stroke="#C6A15B"
                strokeWidth={3}
                fill="url(#salesGradient)"
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </section>

      {/* CATEGORY AND ORDER ANALYTICS */}

      <section className="sales-analysis-grid">

        <div className="sales-panel">

          <div className="sales-panel-heading">
            <div>
              <h2>Revenue by Category</h2>
              <p>Category contribution to sales</p>
            </div>
          </div>

          <div className="sales-category-content">

            <div className="sales-pie-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={categoryColors[index % categoryColors.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sales-category-legend">
              {categoryData.map((category, index) => (
                <div
                  className="sales-legend-item"
                  key={category.name}
                >
                  <span
                    className="sales-legend-dot"
                    style={{
                      background: categoryColors[index % categoryColors.length],
                    }}
                  ></span>

                  <span>{category.name}</span>
                  <strong>{category.value}%</strong>
                </div>
              ))}

              {categoryData.length === 0 && (
                <p>No category sales available yet.</p>
              )}
            </div>

          </div>
        </div>

        <div className="sales-panel">

          <div className="sales-panel-heading">
            <div>
              <h2>Order Performance</h2>
              <p>Order volume during the selected period</p>
            </div>
          </div>

          <div className="sales-order-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E9EAF0"
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8992A1', fontSize: 11 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8992A1', fontSize: 11 }}
                />

                <Tooltip />

                <Bar
                  dataKey="orders"
                  fill="#172B4D"
                  radius={[5, 5, 0, 0]}
                  barSize={25}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

      </section>

      {/* TOP SELLING PRODUCTS */}

      <section className="sales-panel sales-products-panel">

        <div className="sales-panel-heading">
          <div>
            <h2>Top Selling Products</h2>
            <p>Products generating the highest sales revenue</p>
          </div>

          <div className="sales-products-label">
            <Package size={16} />
            Best Performers
          </div>
        </div>

        <div className="sales-table-wrapper">
          <table className="sales-products-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>UNITS SOLD</th>
                <th>REVENUE</th>
                <th>PERFORMANCE</th>
              </tr>
            </thead>

            <tbody>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <tr key={product.name}>
                    <td>
                      <div className="sales-product-name">
                        <span className="sales-product-number">
                          0{index + 1}
                        </span>
                        <strong>{product.name}</strong>
                      </div>
                    </td>

                    <td>{product.category}</td>

                    <td>{product.sales} units</td>

                    <td className="sales-product-revenue">
                      {formatCurrency(product.revenue)}
                    </td>

                    <td>
                      <div className="sales-performance">
                        <div>
                          <span
                            style={{
                              width: `${
                                topProducts[0].revenue
                                  ? (product.revenue / topProducts[0].revenue) * 100
                                  : 0
                              }%`,
                            }}
                          ></span>
                        </div>
                        <small>
                          {topProducts[0].revenue
                            ? Math.round(
                                (product.revenue / topProducts[0].revenue) * 100
                              )
                            : 0}%
                        </small>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    No product sales available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

      {/* FOOTER NOTE */}

      <div className="sales-report-footer">
        <span>
          MAISON Sales Analytics
        </span>

        <p>
          Live sales analytics powered by your MAISON Firebase orders.
          Figures update automatically when orders change.
        </p>
      </div>

    </div>
  );
}

export default SalesReports;