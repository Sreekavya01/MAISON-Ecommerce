import {
  Download,
  Printer,
  ArrowLeft,
  CheckCircle,
  Package,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

import './Invoice.css';

function Invoice() {
  const invoice = {
    number: 'MSN-2026-001',
    date: '08 November 2026',
    dueDate: '08 November 2026',
    status: 'Paid',
  };

  const customer = {
    name: 'Sree Kavya',
    email: 'customer@example.com',
    phone: '+91 98765 43210',
    address: 'Chennai, Tamil Nadu, India',
  };

  const items = [
    {
      id: 1,
      name: 'Elegant Summer Dress',
      category: "Women's Fashion",
      quantity: 1,
      price: 1899,
    },
    {
      id: 2,
      name: 'Classic Sneakers',
      category: 'Footwear',
      quantity: 1,
      price: 2299,
    },
    {
      id: 3,
      name: 'Premium Handbag',
      category: 'Bags & Accessories',
      quantity: 1,
      price: 2999,
    },
  ];

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const shipping = 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  const formatPrice = (amount) =>
    `₹${amount.toLocaleString('en-IN')}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-page">

      <SEO
        title="Invoice Details | MAISON"
        description="View your MAISON purchase invoice, including order items, payment summary, invoice details and printable billing information."
        robots="noindex, nofollow"
      />

      {/* PAGE HEADER */}

      <div className="invoice-page-header">
        <div>
          <span className="invoice-eyebrow">ORDER MANAGEMENT</span>
          <h1>Invoice Details</h1>
          <p>View and manage your purchase invoice.</p>
        </div>

        <Link to="/shop" className="invoice-back-link">
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>
      </div>

      {/* INVOICE ACTIONS */}

      <div className="invoice-actions">
        <span className="invoice-status">
          <CheckCircle size={16} />
          {invoice.status}
        </span>

        <div className="invoice-action-buttons">
          <button onClick={handlePrint} className="invoice-print-button">
            <Printer size={17} />
            Print Invoice
          </button>

          <button onClick={handlePrint} className="invoice-download-button">
            <Download size={17} />
            Download PDF
          </button>
        </div>
      </div>

      {/* INVOICE DOCUMENT */}

      <div className="invoice-document">

        {/* INVOICE TOP */}

        <div className="invoice-top">
          <div className="invoice-brand">
            <h2>MAISON<span>.</span></h2>
            <p>THE ART OF SHOPPING</p>
          </div>

          <div className="invoice-title">
            <span>PAYMENT DOCUMENT</span>
            <h2>INVOICE</h2>
            <p>#{invoice.number}</p>
          </div>
        </div>

        <div className="invoice-divider"></div>

        {/* BUSINESS AND CUSTOMER DETAILS */}

        <div className="invoice-details-grid">
          <div className="invoice-detail-block">
            <span className="invoice-detail-label">BILLED TO</span>
            <h3>{customer.name}</h3>
            <p>{customer.email}</p>
            <p>{customer.phone}</p>
            <p>{customer.address}</p>
          </div>

          <div className="invoice-detail-block invoice-date-block">
            <div>
              <span className="invoice-detail-label">INVOICE DATE</span>
              <p>{invoice.date}</p>
            </div>

            <div>
              <span className="invoice-detail-label">DUE DATE</span>
              <p>{invoice.dueDate}</p>
            </div>

            <div>
              <span className="invoice-detail-label">INVOICE STATUS</span>
              <p className="invoice-paid-text">Paid</p>
            </div>
          </div>
        </div>

        {/* PRODUCTS TABLE */}

        <div className="invoice-items-section">
          <div className="invoice-section-heading">
            <div>
              <span className="invoice-detail-label">PURCHASE SUMMARY</span>
              <h3>Order Items</h3>
            </div>

            <span className="invoice-item-count">
              <Package size={15} />
              {items.length} Items
            </span>
          </div>

          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>QUANTITY</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.category}</span>
                    </td>

                    <td>{item.quantity}</td>

                    <td>{formatPrice(item.price)}</td>

                    <td className="invoice-line-total">
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT SUMMARY */}

        <div className="invoice-bottom">
          <div className="invoice-note">
            <span className="invoice-detail-label">THANK YOU FOR SHOPPING</span>
            <h3>We appreciate your purchase.</h3>
            <p>
              Thank you for choosing MAISON. We hope you enjoy your
              shopping experience.
            </p>
          </div>

          <div className="invoice-total-box">
            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div>
              <span>Shipping</span>
              <strong>
                {shipping === 0 ? 'FREE' : formatPrice(shipping)}
              </strong>
            </div>

            <div>
              <span>Estimated Tax (5%)</span>
              <strong>{formatPrice(tax)}</strong>
            </div>

            <div className="invoice-grand-total">
              <span>Total Amount</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="invoice-footer">
          <p>MAISON — Own Your Style. Elevate Your Lifestyle.</p>
          <span>This is a sample invoice for demonstration purposes.</span>
        </div>

      </div>
    </div>
  );
}

export default Invoice;