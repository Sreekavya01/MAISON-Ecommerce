import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
  CheckCircle,
  Package,
  MapPin,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Truck,
  FileText,
} from 'lucide-react';

import SEO from '../components/SEO';
import InvoiceDrawer from '../components/InvoiceDrawer';
import ProductRating from '../components/ProductRating';
import './OrderConfirmation.css';

function OrderConfirmation() {
  const location = useLocation();
  const order = location.state?.order;
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const isQuotationOrder = order?.source === 'quotation';
  const paymentCompleted = Boolean(order?.checkoutCompletedAt);

  if (!order) {
    return (
      <div className="confirmation-empty">
        <SEO
          title="Order Confirmation | MAISON"
          description="View your MAISON order confirmation details."
          robots="noindex, nofollow"
        />

        <ShoppingBag size={48} />
        <h2>No order details found</h2>
        <p>Please complete checkout to view your order confirmation.</p>
        <Link to="/shop">EXPLORE SHOP</Link>
      </div>
    );
  }

  return (
    <div className="confirmation-page">

      <SEO
        title="Order Confirmation | MAISON"
        description="Review your MAISON order confirmation, order reference, selected products, delivery information and payment summary."
        robots="noindex, nofollow"
      />

      <div className="confirmation-card">

        <div className="confirmation-success-icon">
          <CheckCircle size={48} />
        </div>

        <span className="confirmation-eyebrow">
          MAISON · ORDER CONFIRMATION
        </span>

        <h1>
          {isQuotationOrder && !paymentCompleted
            ? 'Quotation Accepted — Order Confirmed!'
            : 'Thank You for Your Order!'}
        </h1>

        <p className="confirmation-message">
          {isQuotationOrder && !paymentCompleted
            ? 'Your approved quotation is now a confirmed order. Review the final amount below and continue to secure payment.'
            : 'Your order has been placed successfully. We appreciate your choice of MAISON.'}
        </p>

        <div className="confirmation-order-number">
          <span>ORDER REFERENCE</span>
          <strong>{order.orderId}</strong>
        </div>

        <div className="confirmation-divider"></div>

        <div className="confirmation-details">

          <div className="confirmation-detail-heading">
            <Package size={20} />
            <h2>Order Details</h2>
          </div>

          {order.products.map((product, index) => (
            <div
              className="confirmation-product"
              key={
                product.id ||
                `${product.productId || product.name}-${index}`
              }
            >
              <div className="confirmation-product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <Package size={27} aria-hidden="true" />
                )}
                <span>{product.quantity}</span>
              </div>

              <div className="confirmation-product-info">
                <strong>{product.name}</strong>
                <ProductRating productId={product.id || product.productId} size="compact" />
                <span>{product.category}</span>
                <small>Quantity: {product.quantity}</small>
              </div>

              <strong>
                ₹{(product.price * product.quantity).toLocaleString('en-IN')}
              </strong>
            </div>
          ))}

        </div>

        <div className="confirmation-divider"></div>

        <div className="confirmation-detail-heading">
          <MapPin size={20} />
          <h2>Delivery Information</h2>
        </div>

        {order.customer?.address ? (
          <div className="confirmation-address">
            <strong>{order.customer.fullName}</strong>
            <p>{order.customer.address}</p>
            {(order.customer.city || order.customer.state) && (
              <p>
                {[order.customer.city, order.customer.state]
                  .filter(Boolean)
                  .join(', ')}
                {order.customer.pincode
                  ? ` - ${order.customer.pincode}`
                  : ''}
              </p>
            )}
            <p>{order.customer.phone}</p>
            <p>{order.customer.email}</p>
          </div>
        ) : (
          <div className="confirmation-address confirmation-address-pending">
            <strong>Delivery details required</strong>
            <p>
              Your delivery address will be collected when you proceed to
              payment.
            </p>
          </div>
        )}

        <div className="confirmation-payment">
          <div>
            <CreditCard size={19} />
            <span>Payment Method</span>
          </div>

          <strong>{order.paymentMethod || 'Awaiting payment'}</strong>
        </div>

        <div className="confirmation-total">
          <span>Total Amount</span>
          <strong>₹{order.total.toLocaleString('en-IN')}</strong>
        </div>

        <button
          type="button"
          className="confirmation-invoice-button"
          onClick={() => setInvoiceOpen(true)}
        >
          <FileText size={18} />
          {isQuotationOrder && !paymentCompleted
            ? 'VIEW ORDER DOCUMENT'
            : 'VIEW & DOWNLOAD INVOICE'}
        </button>

        <div className="confirmation-delivery-note">
          <Truck size={21} />
          <p>
            Your delivery and tracking details will be available
            after shipping integration.
          </p>
        </div>

        {isQuotationOrder && !paymentCompleted ? (
          <Link
            to={`/checkout?quotationOrder=${encodeURIComponent(
              order.orderId
            )}`}
            state={{ quotationOrder: order }}
            className="confirmation-payment-button"
          >
            PROCEED TO PAYMENT · ₹{order.total.toLocaleString('en-IN')}
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Link to="/shop" className="confirmation-shop-button">
            CONTINUE SHOPPING
            <ArrowRight size={18} />
          </Link>
        )}

        <Link to="/" className="confirmation-home-link">
          Back to Home
        </Link>

      </div>

      <InvoiceDrawer
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        order={order}
      />

    </div>
  );
}

export default OrderConfirmation;
