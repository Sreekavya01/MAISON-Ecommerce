const asNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const roundMoney = (value) =>
  Math.round((asNumber(value) + Number.EPSILON) * 100) / 100;

const findCatalogueProduct = (catalogue, productId) =>
  catalogue.find(
    (product) => String(product.id) === String(productId)
  );

export const getQuotationReference = (quotation) =>
  `${quotation.requestType === 'bulk' ? 'BO' : 'QT'}-${quotation.id
    .slice(0, 8)
    .toUpperCase()}`;

export const getQuotationOrderId = (quotation) =>
  `MAIQ-${quotation.id.toUpperCase()}`;

const buildNormalProducts = (quotation, catalogue) => {
  const catalogueProduct = findCatalogueProduct(
    catalogue,
    quotation.productId
  );

  return [
    {
      id: String(quotation.productId || quotation.id),
      productId: String(quotation.productId || quotation.id),
      name: quotation.productName || 'MAISON product',
      category: quotation.productCategory || '',
      image: quotation.productImage || catalogueProduct?.image || '',
      quantity: Math.max(1, asNumber(quotation.quantity, 1)),
      originalPrice: roundMoney(quotation.unitPrice),
      price: roundMoney(quotation.finalUnitPrice),
    },
  ];
};

const buildBulkProducts = (quotation, catalogue) => {
  const originalProducts = Array.isArray(quotation.products)
    ? quotation.products
    : [];
  const finalProducts = Array.isArray(quotation.finalProducts)
    ? quotation.finalProducts
    : [];

  return originalProducts.map((product, index) => {
    const finalProduct = finalProducts[index] || {};
    const productId =
      finalProduct.productId || product.productId || `${quotation.id}-${index}`;
    const catalogueProduct = findCatalogueProduct(catalogue, productId);

    return {
      id: String(productId),
      productId: String(productId),
      name:
        finalProduct.name || product.name || `MAISON product ${index + 1}`,
      category: finalProduct.category || product.category || '',
      image:
        finalProduct.image || product.image || catalogueProduct?.image || '',
      selectedColor:
        finalProduct.selectedColor || product.selectedColor || '',
      selectedSize:
        finalProduct.selectedSize || product.selectedSize || '',
      quantity: Math.max(
        1,
        asNumber(finalProduct.quantity ?? product.quantity, 1)
      ),
      originalPrice: roundMoney(
        finalProduct.originalUnitPrice ?? product.unitPrice
      ),
      price: roundMoney(
        finalProduct.finalUnitPrice ??
          product.finalUnitPrice ??
          quotation.finalUnitPrice ??
          product.unitPrice
      ),
    };
  });
};

export const buildQuotationOrder = ({
  quotation,
  requestCollection,
  user,
  catalogue = [],
}) => {
  const isBulk = quotation.requestType === 'bulk';
  const products = isBulk
    ? buildBulkProducts(quotation, catalogue)
    : buildNormalProducts(quotation, catalogue);

  if (
    products.length === 0 ||
    products.some(
      (product) =>
        !Number.isFinite(product.price) ||
        product.price <= 0 ||
        !Number.isFinite(product.quantity) ||
        product.quantity <= 0
    )
  ) {
    throw new Error('INVALID_QUOTATION_PRICING');
  }

  const calculatedFinalSubtotal = roundMoney(
    products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0
    )
  );
  const discount = roundMoney(quotation.finalDiscountAmount);
  const finalTotal = roundMoney(
    asNumber(quotation.finalTotal, calculatedFinalSubtotal)
  );
  const subtotal = roundMoney(
    isBulk
      ? asNumber(
          quotation.originalSubtotal,
          finalTotal + Math.max(0, discount)
        )
      : asNumber(quotation.finalSubtotal, calculatedFinalSubtotal)
  );

  if (finalTotal <= 0) {
    throw new Error('INVALID_QUOTATION_TOTAL');
  }

  const nestedCustomer = quotation.customer || {};
  const customerName =
    quotation.customerName || nestedCustomer.name || user.displayName || 'Customer';
  const customerEmail =
    quotation.customerEmail || nestedCustomer.email || user.email || '';
  const customerPhone = quotation.customerPhone || nestedCustomer.phone || '';
  const orderId = getQuotationOrderId(quotation);
  const reference = getQuotationReference(quotation);
  const now = new Date();

  return {
    orderId,
    userId: user.uid,
    customer: {
      fullName: customerName,
      email: customerEmail,
      phone: customerPhone,
      company: quotation.company || nestedCustomer.company || null,
      address:
        quotation.deliveryAddress || nestedCustomer.deliveryAddress || '',
      city: '',
      state: '',
      pincode: '',
    },
    products,
    checkoutMode: 'quotation',
    source: 'quotation',
    quotation: {
      id: quotation.id,
      collection: requestCollection,
      reference,
      requestType: quotation.requestType,
    },
    paymentMethod: 'Awaiting payment',
    paymentStatus: 'Pending',
    subtotal,
    shipping: 0,
    couponCode: null,
    discount,
    discountPercent: roundMoney(quotation.finalDiscountPercent),
    total: finalTotal,
    invoice: {
      number: `MSN-${now.getFullYear()}-${orderId
        .replace(/[^a-z0-9]/gi, '')
        .slice(-12)}`,
      issuedAt: now.toISOString(),
      paymentStatus: 'Pending',
      tax: 0,
    },
    orderDate: now.toLocaleDateString('en-IN'),
    orderStatus: 'Confirmed',
    trackingHistory: [
      {
        status: 'Confirmed',
        date: now.toISOString(),
        description: `Quotation ${reference} was accepted and converted into an order.`,
      },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

