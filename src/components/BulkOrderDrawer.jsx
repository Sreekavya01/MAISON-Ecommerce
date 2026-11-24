import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgePercent,
  Building2,
  CheckCircle2,
  Minus,
  PackagePlus,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

import { auth, db } from '../firebase';
import { products as localProducts } from '../data/products';
import {
  ADMIN_NOTIFICATION_TYPES,
  addAdminNotificationWrite,
  adminNotificationIds,
} from '../utils/adminNotifications';

import './BulkOrderDrawer.css';

const DEFAULT_MINIMUM_QUANTITY = 10;

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  company: '',
  deliveryAddress: '',
  message: '',
};

const getMinimumQuantity = (product) =>
  Math.max(
    1,
    Number(product?.bulkMinimumQuantity) || DEFAULT_MINIMUM_QUANTITY
  );

const createRow = (item = {}, index = 0) => {
  const product = item.product || item;
  const hasProduct = product?.id !== undefined && product?.id !== null;
  const minimumQuantity = getMinimumQuantity(product);

  return {
    rowId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    product: hasProduct ? product : null,
    productId: hasProduct ? String(product.id) : '',
    quantity: Math.max(
      minimumQuantity,
      Number(item.quantity) || minimumQuantity
    ),
    selectedColor:
      item.selectedColor || product?.selectedColor || product?.colors?.[0] || '',
    selectedSize:
      item.selectedSize || product?.selectedSize || product?.sizes?.[0] || '',
  };
};

function BulkOrderDrawer({
  open,
  onClose,
  initialItems = [],
  source = 'storefront',
}) {
  const initialItemsRef = useRef(initialItems);
  const closeButtonRef = useRef(null);

  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState('');

  useEffect(() => {
    initialItemsRef.current = initialItems;
  }, [initialItems]);

  const catalog = useMemo(() => {
    const productMap = new Map(
      localProducts.map((product) => [String(product.id), product])
    );

    initialItems.forEach((item) => {
      const product = item.product || item;

      if (product?.id !== undefined && product?.id !== null) {
        productMap.set(String(product.id), product);
      }
    });

    return [...productMap.values()];
  }, [initialItems]);

  useEffect(() => {
    if (!open) return;

    const nextItems = initialItemsRef.current
      .map((item, index) => createRow(item, index))
      .filter((item) => item.product);

    setItems(nextItems.length > 0 ? nextItems : [createRow()]);

    setCustomer({
      ...emptyCustomer,
      name: auth.currentUser?.displayName || '',
      email: auth.currentUser?.email || '',
    });

    setSubmittedRequestId('');
    setIsSubmitting(false);

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const selectedItems = items.filter((item) => item.product);

  const totalQuantity = selectedItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const estimatedTotal = selectedItems.reduce(
    (total, item) =>
      total +
      Number(item.product.price || 0) * Number(item.quantity || 0),
    0
  );

  const updateItem = (rowId, changes) => {
    setItems((current) =>
      current.map((item) =>
        item.rowId === rowId ? { ...item, ...changes } : item
      )
    );
  };

  const handleProductChange = (rowId, productId) => {
    const product = catalog.find(
      (item) => String(item.id) === productId
    );

    const minimumQuantity = getMinimumQuantity(product);

    updateItem(rowId, {
      product: product || null,
      productId,
      quantity: Math.max(
        minimumQuantity,
        Number(items.find((item) => item.rowId === rowId)?.quantity) ||
          minimumQuantity
      ),
      selectedColor: product?.colors?.[0] || '',
      selectedSize: product?.sizes?.[0] || '',
    });
  };

  const changeQuantity = (item, amount) => {
    const minimumQuantity = getMinimumQuantity(item.product);

    updateItem(item.rowId, {
      quantity: Math.max(
        minimumQuantity,
        Number(item.quantity) + amount
      ),
    });
  };

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomer((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (selectedItems.length === 0) {
      toast.error('Please select at least one product.');
      return;
    }

    const invalidQuantity = selectedItems.some(
      (item) =>
        Number(item.quantity) < getMinimumQuantity(item.product)
    );

    if (invalidQuantity) {
      toast.error('Please meet the minimum quantity for every product.');
      return;
    }

    if (!/^\d{10}$/.test(customer.phone.trim())) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestRef = doc(collection(db, 'bulkOrderRequests'));

      const requestData = {
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          company: customer.company.trim() || null,
          deliveryAddress: customer.deliveryAddress.trim(),
          message: customer.message.trim() || null,
        },

        products: selectedItems.map((item) => ({
          productId: String(item.product.id),
          name: item.product.name || 'MAISON product',
          category: item.product.category || null,
          image: item.product.image || null,
          unitPrice: Number(item.product.price) || 0,
          quantity: Number(item.quantity),
          selectedColor: item.selectedColor || null,
          selectedSize: item.selectedSize || null,
        })),

        totalQuantity,
        estimatedRegularTotal: estimatedTotal,
        source,
        status: 'pending',
        customerDecision: 'pending',
        createdOrderId: null,
        userId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const requestBatch = writeBatch(db);

      requestBatch.set(requestRef, requestData);

      addAdminNotificationWrite(requestBatch, {
        id: adminNotificationIds.bulkOrder(requestRef.id),
        type: ADMIN_NOTIFICATION_TYPES.BULK_ORDER_REQUESTED,
        message: `${requestData.customer.name} requested bulk pricing for ${requestData.totalQuantity} units.`,
        relatedDocumentId: requestRef.id,
        sourceCollection: 'bulkOrderRequests',
        targetPage: '/admin-quotations',
      });

      await requestBatch.commit();

      setSubmittedRequestId(requestRef.id);

      toast.success('Your bulk pricing request has been sent.');
    } catch (error) {
      console.error('Bulk order request error:', error);
      toast.error('Unable to send your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="bulk-drawer-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <aside
        id="bulk-order-drawer"
        className="bulk-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-drawer-title"
      >
        <header className="bulk-drawer-header">
          <div className="bulk-drawer-heading">
            <span>
              <BadgePercent size={15} />
              MAISON BUSINESS
            </span>

            <h2 id="bulk-drawer-title">
              Request bulk pricing
            </h2>

            <p>
              Tell us what you need. Our team will confirm availability
              and your final quote.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="bulk-drawer-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close bulk order form"
          >
            <X size={21} />
          </button>
        </header>

        {submittedRequestId ? (
          <div className="bulk-drawer-success">
            <span className="bulk-success-icon">
              <CheckCircle2 size={32} />
            </span>

            <span className="bulk-success-eyebrow">
              REQUEST RECEIVED
            </span>

            <h3>We’ll prepare your quote.</h3>

            <p>
              Our business team will review your quantities and delivery
              requirements, then contact you using the details provided.
            </p>

            <div className="bulk-reference">
              Reference{' '}
              <strong>
                {submittedRequestId.slice(0, 10).toUpperCase()}
              </strong>
            </div>

            <button type="button" onClick={onClose}>
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          <form
            className="bulk-drawer-form"
            onSubmit={handleSubmit}
          >
            <div className="bulk-drawer-scroll-area">
              <section className="bulk-drawer-section">
                <div className="bulk-drawer-section-title">
                  <div>
                    <span>01</span>
                    <h3>Products & quantities</h3>
                  </div>

                  <small>Minimum 10 per product</small>
                </div>

                <div className="bulk-drawer-items">
                  {items.map((item) => {
                    const minimumQuantity = getMinimumQuantity(item.product);
                    const colors = item.product?.colors || [];
                    const sizes = item.product?.sizes || [];

                    return (
                      <article
                        className="bulk-drawer-item"
                        key={item.rowId}
                      >
                        <div className="bulk-item-product">
                          {item.product?.image ? (
                            <img
                              src={item.product.image}
                              alt=""
                            />
                          ) : (
                            <span className="bulk-item-placeholder">
                              <PackagePlus size={21} />
                            </span>
                          )}

                          <div>
                            <label htmlFor={`bulk-product-${item.rowId}`}>
                              Product
                            </label>

                            <select
                              id={`bulk-product-${item.rowId}`}
                              value={item.productId}
                              onChange={(event) =>
                                handleProductChange(
                                  item.rowId,
                                  event.target.value
                                )
                              }
                              required
                            >
                              <option value="">
                                Choose a product
                              </option>

                              {catalog.map((product) => (
                                <option
                                  key={product.id}
                                  value={product.id}
                                >
                                  {product.name} — ₹
                                  {Number(product.price || 0).toLocaleString('en-IN')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {(colors.length > 0 || sizes.length > 0) && (
                          <div className="bulk-item-variants">
                            {colors.length > 0 && (
                              <label>
                                Colour

                                <select
                                  value={item.selectedColor}
                                  onChange={(event) =>
                                    updateItem(item.rowId, {
                                      selectedColor: event.target.value,
                                    })
                                  }
                                >
                                  {colors.map((color) => (
                                    <option key={color}>
                                      {color}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}

                            {sizes.length > 0 && (
                              <label>
                                Size / Variant

                                <select
                                  value={item.selectedSize}
                                  onChange={(event) =>
                                    updateItem(item.rowId, {
                                      selectedSize: event.target.value,
                                    })
                                  }
                                >
                                  {sizes.map((size) => (
                                    <option key={size}>
                                      {size}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>
                        )}

                        <div className="bulk-item-footer">
                          <div className="bulk-item-quantity">
                            <span>Quantity</span>

                            <div>
                              <button
                                type="button"
                                onClick={() => changeQuantity(item, -1)}
                                disabled={
                                  Number(item.quantity) <= minimumQuantity
                                }
                                aria-label="Decrease quantity"
                              >
                                <Minus size={14} />
                              </button>

                              <input
                                type="number"
                                min={minimumQuantity}
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(item.rowId, {
                                    quantity: event.target.value,
                                  })
                                }
                                aria-label="Product quantity"
                                required
                              />

                              <button
                                type="button"
                                onClick={() => changeQuantity(item, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="bulk-item-estimate">
                            <span>Regular value</span>

                            <strong>
                              ₹
                              {(
                                Number(item.product?.price || 0) *
                                Number(item.quantity || 0)
                              ).toLocaleString('en-IN')}
                            </strong>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              className="bulk-item-remove"
                              onClick={() =>
                                setItems((current) =>
                                  current.filter(
                                    (currentItem) =>
                                      currentItem.rowId !== item.rowId
                                  )
                                )
                              }
                              aria-label="Remove product"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="bulk-add-another"
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      createRow({}, current.length),
                    ])
                  }
                >
                  <Plus size={16} />
                  ADD ANOTHER PRODUCT
                </button>

                <div className="bulk-drawer-summary">
                  <div>
                    <span>Total units</span>
                    <strong>{totalQuantity}</strong>
                  </div>

                  <div>
                    <span>Estimated regular value</span>
                    <strong>
                      ₹{estimatedTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <p>
                    Final pricing is confirmed after review and may
                    include quantity discounts.
                  </p>
                </div>
              </section>

              <section className="bulk-drawer-section">
                <div className="bulk-drawer-section-title">
                  <div>
                    <span>02</span>
                    <h3>Your details</h3>
                  </div>

                  <small>
                    We’ll use these to send your quote
                  </small>
                </div>

                <div className="bulk-customer-grid">
                  <label>
                    Full name *

                    <input
                      type="text"
                      name="name"
                      value={customer.name}
                      onChange={handleCustomerChange}
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label>
                    Email address *

                    <input
                      type="email"
                      name="email"
                      value={customer.email}
                      onChange={handleCustomerChange}
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label>
                    Phone number *

                    <input
                      type="tel"
                      name="phone"
                      value={customer.phone}
                      onChange={handleCustomerChange}
                      inputMode="numeric"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                      required
                    />
                  </label>

                  <label>
                    Company / organisation

                    <span className="bulk-input-with-icon">
                      <Building2 size={16} />

                      <input
                        type="text"
                        name="company"
                        value={customer.company}
                        onChange={handleCustomerChange}
                        autoComplete="organization"
                      />
                    </span>
                  </label>

                  <label className="bulk-field-full">
                    Delivery address *

                    <textarea
                      name="deliveryAddress"
                      value={customer.deliveryAddress}
                      onChange={handleCustomerChange}
                      rows="3"
                      autoComplete="street-address"
                      required
                    />
                  </label>

                  <label className="bulk-field-full">
                    Additional requirements

                    <textarea
                      name="message"
                      value={customer.message}
                      onChange={handleCustomerChange}
                      rows="3"
                      placeholder="Preferred delivery date, packaging or other requirements"
                    />
                  </label>
                </div>
              </section>
            </div>

            <footer className="bulk-drawer-footer">
              <p>
                This submits a quote request only. No payment will be taken.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'SENDING REQUEST…'
                  : 'REQUEST MY QUOTE'}

                {!isSubmitting && <Send size={17} />}
              </button>
            </footer>
          </form>
        )}
      </aside>
    </div>
  );
}

export default BulkOrderDrawer;