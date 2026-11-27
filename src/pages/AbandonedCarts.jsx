import { useEffect, useMemo, useState } from 'react';

import {
  ShoppingCart,
  Users,
  IndianRupee,
  Clock,
  Search,
  ArrowUpRight,
  Mail,
  Eye,
  X,
  Package,
  UserRound,
  Calendar,
  Hash,
  RefreshCw,
} from 'lucide-react';

import {
  collection,
  getDocs,
} from 'firebase/firestore';

import { db } from '../firebase';

import toast from 'react-hot-toast';

import './AbandonedCarts.css';

const ABANDONED_AFTER_HOURS = 24;
const FOLLOW_UP_AFTER_HOURS = 48;
const MAISON_ADMIN_GMAIL = 'sreekavya0125@gmail.com';


// FORMAT CURRENCY

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;


// FORMAT DATE

const formatDate = (date) => {
  if (!date) return 'Not available';

  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


// GET LAST ACTIVITY DATE

const getActivityDate = (timestamp) => {
  if (!timestamp) return null;

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date;
};


function AbandonedCarts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCart, setSelectedCart] = useState(null);

  const [abandonedCartData, setAbandonedCartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  // LOAD REAL ABANDONED CARTS FROM FIREBASE

  const loadAbandonedCarts = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const usersSnapshot = await getDocs(
        collection(db, 'users')
      );

      const currentTime = Date.now();

      const abandonedCarts = [];

      const customerResults = await Promise.all(
        usersSnapshot.docs.map(async (userDocument) => {
          const userId = userDocument.id;
          const userData = userDocument.data();

          // IGNORE ADMIN ACCOUNTS

          if (userData.role === 'admin') {
            return null;
          }

          // LOAD CUSTOMER CART

          const cartRef = collection(
            db,
            'users',
            userId,
            'cart'
          );

          const cartSnapshot = await getDocs(cartRef);

          if (cartSnapshot.empty) {
            return null;
          }

          const products = [];

          let lastActivity = null;
          let totalQuantity = 0;
          let totalAmount = 0;

          cartSnapshot.forEach((cartDocument) => {
            const product = cartDocument.data();

            const quantity = Math.max(
              0,
              Number(product.quantity) || 0
            );

            if (quantity <= 0) return;

            const productActivity = getActivityDate(
              product.lastActivityAt
            );

            if (
              productActivity &&
              (
                !lastActivity ||
                productActivity > lastActivity
              )
            ) {
              lastActivity = productActivity;
            }

            const price = Number(product.price) || 0;

            products.push({
              id: product.id || cartDocument.id,
              name: product.name || 'Unnamed Product',
              image: product.image || '',
              price,
              quantity,
              selectedColor: product.selectedColor || '',
              selectedSize: product.selectedSize || '',
            });

            totalQuantity += quantity;
            totalAmount += price * quantity;
          });

          if (products.length === 0 || !lastActivity) {
            return null;
          }

          const inactiveHours =
            (currentTime - lastActivity.getTime()) /
            (1000 * 60 * 60);

          // ONLY SHOW CARTS INACTIVE FOR 24+ HOURS

          if (inactiveHours < ABANDONED_AFTER_HOURS) {
            return null;
          }

          const status =
            inactiveHours >= FOLLOW_UP_AFTER_HOURS
              ? 'Follow Up'
              : 'Recently Abandoned';

          return {
            id: `AC-${userId.slice(0, 8)}`,
            userId,

            customer:
              userData.name ||
              userData.displayName ||
              'Customer',

            email: userData.email || 'Email unavailable',

            products,

            product: products
              .map((item) => item.name)
              .join(', '),

            quantity: totalQuantity,
            amount: totalAmount,

            date: formatDate(lastActivity),

            lastActivity,
            inactiveHours,

            status,
          };
        })
      );

      customerResults.forEach((customer) => {
        if (customer) {
          abandonedCarts.push(customer);
        }
      });

      abandonedCarts.sort(
        (a, b) => b.lastActivity - a.lastActivity
      );

      setAbandonedCartData(abandonedCarts);

    } catch (error) {
      console.error('Abandoned cart loading error:', error);

      toast.error(
        'Unable to load abandoned carts. Please try again.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // LOAD WHEN PAGE OPENS

  useEffect(() => {
    loadAbandonedCarts();
  }, []);


  // STATISTICS

  const totalValue = abandonedCartData.reduce(
    (total, cart) => total + cart.amount,
    0
  );

  const followUpCount = abandonedCartData.filter(
    (cart) => cart.status === 'Follow Up'
  ).length;


  // SEARCH CARTS

  const filteredCarts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return abandonedCartData.filter((cart) => {
      return (
        cart.id.toLowerCase().includes(search) ||
        cart.customer.toLowerCase().includes(search) ||
        cart.email.toLowerCase().includes(search) ||
        cart.product.toLowerCase().includes(search) ||
        cart.status.toLowerCase().includes(search)
      );
    });
  }, [abandonedCartData, searchTerm]);


  // CONTACT CUSTOMER

  const handleContactCustomer = (cart) => {
    const customerEmail =
      typeof cart.email === 'string'
        ? cart.email.trim()
        : '';

    if (
      !customerEmail ||
      customerEmail === 'Email unavailable'
    ) {
      toast.error('Customer email address is unavailable.');
      return;
    }

    const subject = 'Complete Your MAISON Order';

    const customerName =
      typeof cart.customer === 'string' &&
      cart.customer !== 'Customer'
        ? cart.customer.trim()
        : '';

    const productDetails = Array.isArray(cart.products)
      ? cart.products
          .filter(
            (product) =>
              product?.name &&
              product.name !== 'Unnamed Product'
          )
          .map((product) => {
            const options = [
              product.selectedColor
                ? `Colour: ${product.selectedColor}`
                : '',
              product.selectedSize
                ? `Size: ${product.selectedSize}`
                : '',
            ].filter(Boolean);

            const optionText = options.length
              ? ` (${options.join(', ')})`
              : '';

            return `- ${product.name}${optionText} - Quantity: ${product.quantity}`;
          })
          .join('\n')
      : '';

    const messageLines = [
      customerName ? `Hello ${customerName},` : 'Hello,',
      '',
      'We noticed that you left some items in your MAISON shopping cart. Your selections are still waiting for you, and we would be happy to help if you have any questions before completing your order.',
    ];

    if (productDetails) {
      messageLines.push('', 'Cart details:', productDetails);
    }

    if (Number.isFinite(Number(cart.amount))) {
      messageLines.push(
        '',
        `Estimated cart total: ${formatCurrency(cart.amount)}`
      );
    }

    messageLines.push(
      '',
      'You can return to MAISON whenever you are ready to complete your order.',
      '',
      'Warm regards,',
      'MAISON Customer Care'
    );

    const gmailParameters = new URLSearchParams({
      authuser: MAISON_ADMIN_GMAIL,
      view: 'cm',
      fs: '1',
      to: customerEmail,
      su: subject,
      body: messageLines.join('\n'),
    });

    window.open(
      `https://mail.google.com/mail/?${gmailParameters.toString()}`,
      '_blank',
      'noopener,noreferrer'
    );
  };


  return (
    <div className="abandoned-carts-page">

      {/* HEADER */}

      <div className="abandoned-header">

        <div>
          <span className="abandoned-eyebrow">
            CUSTOMER RETENTION
          </span>

          <h1>Abandoned Carts</h1>

          <p>
            Track incomplete purchases and identify opportunities
            to bring customers back.
          </p>
        </div>

        <div className="abandoned-header-icon">
          <ShoppingCart size={28} />
        </div>

      </div>


      {/* STATISTICS */}

      <div className="abandoned-stats">

        <div className="abandoned-stat-card">

          <div className="abandoned-stat-icon navy">
            <ShoppingCart size={21} />
          </div>

          <div>
            <span>Total Abandoned Carts</span>

            <h2>{abandonedCartData.length}</h2>

            <small>Inactive for 24+ hours</small>
          </div>

        </div>


        <div className="abandoned-stat-card">

          <div className="abandoned-stat-icon gold">
            <IndianRupee size={21} />
          </div>

          <div>
            <span>Potential Revenue</span>

            <h2>{formatCurrency(totalValue)}</h2>

            <small>Value left in carts</small>
          </div>

        </div>


        <div className="abandoned-stat-card">

          <div className="abandoned-stat-icon green">
            <Users size={21} />
          </div>

          <div>
            <span>Customers</span>

            <h2>{abandonedCartData.length}</h2>

            <small>Customers with abandoned carts</small>
          </div>

        </div>


        <div className="abandoned-stat-card">

          <div className="abandoned-stat-icon purple">
            <Clock size={21} />
          </div>

          <div>
            <span>Follow-up Required</span>

            <h2>{followUpCount}</h2>

            <small>Inactive for 48+ hours</small>
          </div>

        </div>

      </div>


      {/* CART TABLE */}

      <div className="abandoned-table-section">

        <div className="abandoned-table-heading">

          <div>
            <h2>Abandoned Cart Details</h2>

            <p>
              Review customers and their incomplete purchases.
            </p>
          </div>


          <div className="abandoned-table-tools">

            <button
              type="button"
              className="abandoned-refresh-button"
              onClick={() => loadAbandonedCarts(true)}
              disabled={loading || refreshing}
              title="Refresh abandoned carts"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing ? 'abandoned-refreshing' : ''
                }
              />
              Refresh
            </button>


            <div className="abandoned-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search carts..."
                aria-label="Search carts"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}

            </div>

          </div>

        </div>


        <div className="abandoned-table-wrapper">

          <table className="abandoned-table">

            <thead>
              <tr>
                <th>Cart ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Cart Value</th>
                <th>Last Activity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>


            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="8" className="abandoned-no-results">
                    Loading abandoned carts from Firebase...
                  </td>
                </tr>

              ) : filteredCarts.length > 0 ? (

                filteredCarts.map((cart) => (

                  <tr key={cart.userId}>

                    <td className="abandoned-cart-id">
                      {cart.id}
                    </td>


                    <td>
                      <div className="abandoned-customer">
                        <strong>{cart.customer}</strong>
                        <span>{cart.email}</span>
                      </div>
                    </td>


                    <td>
                      {cart.products.length > 1
                        ? `${cart.products.length} different products`
                        : cart.product}
                    </td>


                    <td>{cart.quantity}</td>


                    <td className="abandoned-amount">
                      {formatCurrency(cart.amount)}
                    </td>


                    <td>{cart.date}</td>


                    <td>
                      <span
                        className={`abandoned-status ${
                          cart.status.toLowerCase().replaceAll(' ', '-')
                        }`}
                      >
                        {cart.status}
                      </span>
                    </td>


                    <td>
                      <div className="abandoned-actions">

                        <button
                          type="button"
                          title="View cart details"
                          aria-label={`View ${cart.customer}'s cart`}
                          onClick={() => setSelectedCart(cart)}
                        >
                          <Eye size={17} />
                        </button>


                        <button
                          type="button"
                          title="Contact customer"
                          aria-label={`Email ${cart.customer}`}
                          onClick={() => handleContactCustomer(cart)}
                        >
                          <Mail size={17} />
                        </button>

                      </div>
                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td colSpan="8" className="abandoned-no-results">
                    {searchTerm
                      ? 'No matching abandoned carts found.'
                      : 'No abandoned carts found. Customer carts will appear here after 24 hours of inactivity.'}
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>


        <div className="abandoned-table-footer">

          <span>
            Showing {filteredCarts.length} of {abandonedCartData.length} real customer carts
          </span>

          <span className="abandoned-footer-note">
            <ArrowUpRight size={15} />
            Firebase connected
          </span>

        </div>

      </div>


      {/* VIEW CART DETAILS POPUP */}

      {selectedCart && (

        <div
          className="abandoned-modal-overlay"
          onClick={() => setSelectedCart(null)}
        >

          <div
            className="abandoned-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="abandoned-modal-title"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="abandoned-modal-header">

              <div>
                <span>CART INFORMATION</span>

                <h2 id="abandoned-modal-title">
                  Abandoned Cart Details
                </h2>
              </div>


              <button
                type="button"
                onClick={() => setSelectedCart(null)}
                aria-label="Close details"
                className="abandoned-modal-close"
              >
                <X size={21} />
              </button>

            </div>


            <div className="abandoned-modal-body">

              <div className="abandoned-detail-row">
                <span>
                  <Hash size={17} />
                  Cart ID
                </span>

                <strong>{selectedCart.id}</strong>
              </div>


              <div className="abandoned-detail-row">
                <span>
                  <UserRound size={17} />
                  Customer
                </span>

                <strong>{selectedCart.customer}</strong>
              </div>


              <div className="abandoned-detail-row">
                <span>
                  <Mail size={17} />
                  Email Address
                </span>

                <strong>{selectedCart.email}</strong>
              </div>


              <div className="abandoned-products-list">

                <h3>
                  <Package size={17} />
                  Products in Cart
                </h3>

                {selectedCart.products.map((product, index) => (

                  <div
                    className="abandoned-product-detail"
                    key={`${product.id}-${index}`}
                  >

                    <div>
                      <strong>{product.name}</strong>

                      {(product.selectedColor || product.selectedSize) && (
                        <small>
                          {product.selectedColor &&
                            `Colour: ${product.selectedColor} `}

                          {product.selectedSize &&
                            `Size: ${product.selectedSize}`}
                        </small>
                      )}

                      <small>
                        Quantity: {product.quantity}
                      </small>
                    </div>

                    <strong>
                      {formatCurrency(
                        product.price * product.quantity
                      )}
                    </strong>

                  </div>

                ))}

              </div>


              <div className="abandoned-detail-row">
                <span>Total Quantity</span>
                <strong>{selectedCart.quantity}</strong>
              </div>


              <div className="abandoned-detail-row">
                <span>
                  <IndianRupee size={17} />
                  Cart Value
                </span>

                <strong>
                  {formatCurrency(selectedCart.amount)}
                </strong>
              </div>


              <div className="abandoned-detail-row">
                <span>
                  <Calendar size={17} />
                  Last Activity
                </span>

                <strong>{selectedCart.date}</strong>
              </div>


              <div className="abandoned-detail-row">
                <span>
                  <Clock size={17} />
                  Status
                </span>

                <strong>{selectedCart.status}</strong>
              </div>

            </div>


            <div className="abandoned-modal-footer">

              <button
                type="button"
                className="abandoned-modal-secondary"
                onClick={() => setSelectedCart(null)}
              >
                Close
              </button>


              <button
                type="button"
                className="abandoned-modal-primary"
                onClick={() => handleContactCustomer(selectedCart)}
              >
                <Mail size={17} />
                Contact Customer
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AbandonedCarts;
