
import { useState } from 'react';

import {
  Package,
  Plus,
  Minus,
  Trash2,
  Send,
  Truck,
  BadgePercent,
  Headset,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { products } from '../data/products';
import SEO from '../components/SEO';

import './BulkOrders.css';

function BulkOrders() {
  const [orderItems, setOrderItems] = useState([
    { productId: '', quantity: 10 },
  ]);

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    deliveryAddress: '',
    message: '',
  });

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;

    setCustomer(previous => ({
      ...previous,
      [name]: value,
    }));
  };

  const updateOrderItem = (index, field, value) => {
    setOrderItems(previous =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addOrderItem = () => {
    setOrderItems(previous => [
      ...previous,
      { productId: '', quantity: 10 },
    ]);
  };

  const removeOrderItem = (index) => {
    setOrderItems(previous =>
      previous.filter((_, i) => i !== index)
    );
  };

  const getSelectedProducts = () => {
    return orderItems
      .filter(item => item.productId !== '')
      .map(item => {
        const product = products.find(
          product => product.id === Number(item.productId)
        );

        return {
          ...product,
          quantity: Number(item.quantity),
        };
      })
      .filter(item => item.id);
  };

  const selectedProducts = getSelectedProducts();

  const totalQuantity = selectedProducts.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const estimatedTotal = selectedProducts.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product.');
      return;
    }

    if (selectedProducts.some(item => item.quantity < 10)) {
      toast.error('Minimum bulk quantity is 10 per product.');
      return;
    }

    if (!/^\d{10}$/.test(customer.phone)) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    toast.success('Bulk order request submitted successfully!');

    console.log('Bulk Order Request:', {
      customer,
      products: selectedProducts,
      totalQuantity,
      estimatedTotal,
    });

    setCustomer({
      name: '',
      email: '',
      phone: '',
      company: '',
      deliveryAddress: '',
      message: '',
    });

    setOrderItems([
      { productId: '', quantity: 10 },
    ]);
  };

  return (
    <main className="bulk-orders-page">

      <SEO
        title="Bulk Orders & Business Enquiries | MAISON"
        description="Explore MAISON bulk ordering for businesses, teams and special occasions. Select products, enter quantities and submit a request for custom bulk pricing."
      />

      <section className="bulk-hero">
        <div className="bulk-hero-overlay"></div>

        <div className="bulk-hero-content">
          <span className="bulk-eyebrow">
            MAISON BUSINESS SERVICES
          </span>

          <h1>Bulk Orders, Better Value.</h1>

          <p>
            Shopping for your business, team or a special occasion?
            Enjoy a convenient ordering experience with custom bulk
            pricing options.
          </p>
        </div>
      </section>

      <section className="bulk-benefits">
        <div className="bulk-benefit">
          <BadgePercent size={28} />
          <div>
            <h3>Special Pricing</h3>
            <p>Request quantity-based pricing.</p>
          </div>
        </div>

        <div className="bulk-benefit">
          <Package size={28} />
          <div>
            <h3>Large Quantities</h3>
            <p>Order multiple products together.</p>
          </div>
        </div>

        <div className="bulk-benefit">
          <Truck size={28} />
          <div>
            <h3>Delivery Support</h3>
            <p>Discuss your delivery requirements.</p>
          </div>
        </div>

        <div className="bulk-benefit">
          <Headset size={28} />
          <div>
            <h3>Personal Assistance</h3>
            <p>Get help with your bulk order.</p>
          </div>
        </div>
      </section>

      <section className="bulk-intro">
        <span className="bulk-section-label">
          SHOP MORE. SAVE MORE.
        </span>

        <h2>Make Every Order Count.</h2>

        <p>
          Tell us what you need and how many pieces you require.
          Our team can review your request and provide a suitable quote.
        </p>
      </section>

      <section className="bulk-form-section" id="bulk-order-form">

        <div className="bulk-form-heading">
          <div>
            <span className="bulk-section-label">
              YOUR REQUIREMENTS
            </span>
            <h2>Request a Bulk Order</h2>
            <p>Select your products and enter the required quantities.</p>
          </div>

          <div className="bulk-minimum">
            Minimum quantity
            <strong>10 units</strong>
          </div>
        </div>

        <form className="bulk-order-form" onSubmit={handleSubmit}>

          <div className="bulk-products-heading">
            <h3>01. Select Products</h3>
            <span>{orderItems.length} product entries</span>
          </div>

          <div className="bulk-product-list">

            {orderItems.map((item, index) => {
              const selectedProduct = products.find(
                product => product.id === Number(item.productId)
              );

              return (
                <div className="bulk-product-row" key={index}>

                  <div className="bulk-product-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="bulk-product-select">
                    <label>Select Product</label>

                    <select
                      value={item.productId}
                      onChange={e =>
                        updateOrderItem(
                          index,
                          'productId',
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">Choose a product</option>

                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} — ₹{product.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bulk-quantity-control">
                    <label>Quantity</label>

                    <div className="bulk-quantity-box">
                      <button
                        type="button"
                        onClick={() =>
                          updateOrderItem(
                            index,
                            'quantity',
                            Math.max(10, Number(item.quantity) - 1)
                          )
                        }
                        aria-label="Decrease quantity"
                      >
                        <Minus size={15} />
                      </button>

                      <input
                        type="number"
                        min="10"
                        value={item.quantity}
                        onChange={e =>
                          updateOrderItem(
                            index,
                            'quantity',
                            e.target.value
                          )
                        }
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          updateOrderItem(
                            index,
                            'quantity',
                            Number(item.quantity) + 1
                          )
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="bulk-item-total">
                    <label>Estimated Amount</label>

                    <strong>
                      {selectedProduct
                        ? `₹${(
                            selectedProduct.price *
                            Number(item.quantity || 0)
                          ).toLocaleString('en-IN')}`
                        : '—'}
                    </strong>
                  </div>

                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      className="bulk-remove-button"
                      onClick={() => removeOrderItem(index)}
                      aria-label="Remove product"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                </div>
              );
            })}

          </div>

          <button
            type="button"
            className="bulk-add-product"
            onClick={addOrderItem}
          >
            <Plus size={17} />
            ADD ANOTHER PRODUCT
          </button>

          <div className="bulk-summary">
            <div>
              <span>Total Units</span>
              <strong>{totalQuantity}</strong>
            </div>

            <div>
              <span>Estimated Product Value</span>
              <strong>
                ₹{estimatedTotal.toLocaleString('en-IN')}
              </strong>
            </div>

            <p>
              Final bulk pricing will be confirmed after reviewing
              your request. The displayed amount is an estimate
              based on regular product prices.
            </p>
          </div>

          <div className="bulk-customer-section">

            <div className="bulk-products-heading">
              <h3>02. Your Contact Details</h3>
              <span>Required information</span>
            </div>

            <div className="bulk-input-grid">

              <div className="bulk-input-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={customer.name}
                  onChange={handleCustomerChange}
                  required
                />
              </div>

              <div className="bulk-input-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={customer.email}
                  onChange={handleCustomerChange}
                  required
                />
              </div>

              <div className="bulk-input-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile number"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                  maxLength="10"
                  required
                />
              </div>

              <div className="bulk-input-group">
                <label>Company / Organization</label>
                <input
                  type="text"
                  name="company"
                  placeholder="Company name (optional)"
                  value={customer.company}
                  onChange={handleCustomerChange}
                />
              </div>

              <div className="bulk-input-group bulk-full-width">
                <label>Delivery Address *</label>
                <textarea
                  name="deliveryAddress"
                  placeholder="Enter your complete delivery address"
                  rows="3"
                  value={customer.deliveryAddress}
                  onChange={handleCustomerChange}
                  required
                />
              </div>

              <div className="bulk-input-group bulk-full-width">
                <label>Additional Requirements</label>
                <textarea
                  name="message"
                  placeholder="Tell us about your delivery date, preferences or other requirements..."
                  rows="4"
                  value={customer.message}
                  onChange={handleCustomerChange}
                />
              </div>

            </div>
          </div>

          <button type="submit" className="bulk-submit-button">
            SUBMIT BULK ORDER REQUEST
            <Send size={17} />
          </button>

          <p className="bulk-form-note">
            Submitting this form creates a frontend demo request only.
            No order or payment is processed yet.
          </p>

        </form>
      </section>

    </main>
  );
}

export default BulkOrders;
