const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return '';

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return String(value);
};

export const formatInvoiceCurrency = (value) =>
  `₹${asNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const getInvoiceData = (order = {}) => {
  const products = Array.isArray(order.products) ? order.products : [];
  const calculatedSubtotal = products.reduce(
    (total, product) =>
      total + asNumber(product.price) * Math.max(1, asNumber(product.quantity, 1)),
    0
  );
  const subtotal = asNumber(order.subtotal, calculatedSubtotal);
  const shipping = asNumber(order.shipping);
  const discount = asNumber(order.discount);
  const tax = asNumber(order.invoice?.tax ?? order.tax);
  const calculatedTotal = subtotal + shipping + tax - discount;
  const total = asNumber(order.total, calculatedTotal);
  const orderReference = String(order.orderId || order.id || 'ORDER');
  const paymentMethod = order.paymentMethod || 'Payment method unavailable';
  const fallbackPaymentStatus = paymentMethod.toLowerCase().includes('cash on delivery')
    ? 'Due on delivery'
    : 'Paid';
  const customer = order.customer || {};

  return {
    invoiceNumber:
      order.invoice?.number ||
      `MSN-${orderReference.replace(/[^a-z0-9]/gi, '').toUpperCase()}`,
    invoiceDate:
      formatDate(order.invoice?.issuedAt || order.createdAt) ||
      order.orderDate ||
      'Date unavailable',
    orderReference,
    paymentMethod,
    paymentStatus:
      order.invoice?.paymentStatus || order.paymentStatus || fallbackPaymentStatus,
    customer: {
      name: customer.fullName || customer.name || 'MAISON Customer',
      email: customer.email || '',
      phone: customer.phone || '',
      address: [
        customer.address,
        [customer.city, customer.state].filter(Boolean).join(', '),
        customer.pincode,
      ].filter(Boolean),
    },
    products: products.map((product, index) => ({
      id: product.id || product.productId || index,
      name: product.name || 'MAISON product',
      category: product.category || '',
      selectedColor: product.selectedColor || '',
      selectedSize: product.selectedSize || '',
      quantity: Math.max(1, asNumber(product.quantity, 1)),
      unitPrice: asNumber(product.price),
    })),
    subtotal,
    shipping,
    discount,
    tax,
    total,
    couponCode: order.couponCode || '',
  };
};
