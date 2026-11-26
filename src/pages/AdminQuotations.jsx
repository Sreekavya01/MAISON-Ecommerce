import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  IndianRupee,
  LoaderCircle,
  Mail,
  Package,
  Phone,
  Save,
  Search,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { auth, db } from '../firebase';
import SEO from '../components/SEO';
import './AdminQuotations.css';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
];

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundCurrency = (value) =>
  Math.round((toFiniteNumber(value) + Number.EPSILON) * 100) / 100;

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(amount));

const formatPercentage = (amount) =>
  `${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(amount))}%`;

const formatDiscountAmount = (amount) => {
  const value = roundCurrency(amount);

  if (value > 0) return `- ${formatPrice(value)}`;
  if (value < 0) return `+ ${formatPrice(Math.abs(value))}`;

  return formatPrice(0);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now';

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timestampValue = (timestamp) => {
  if (!timestamp) return 0;
  if (timestamp.toMillis) return timestamp.toMillis();

  return new Date(timestamp).getTime() || 0;
};

const getReference = (id, type) =>
  `${type === 'bulk' ? 'BO' : 'QT'}-${id.slice(0, 8).toUpperCase()}`;

const getBulkProductLineId = (product, index) =>
  [
    product.productId || 'product',
    product.selectedColor || 'no-colour',
    product.selectedSize || 'no-size',
    index,
  ].join('-');

function AdminQuotations() {
  const location = useLocation();

  const relatedDocumentId = location.state?.relatedDocumentId;
  const notificationSourceCollection = location.state?.sourceCollection;

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState({
    finalUnitPrice: '',
    finalDiscountPercent: '',
    bulkProductPrices: [],
    status: 'pending',
    adminNotes: '',
  });

  // LOAD NORMAL AND BULK QUOTATION REQUESTS

  useEffect(() => {
    let normalRequests = [];
    let bulkRequests = [];

    let normalLoaded = false;
    let bulkLoaded = false;

    const updateRequests = () => {
      const combined = [
        ...normalRequests,
        ...bulkRequests,
      ].sort(
        (first, second) =>
          timestampValue(second.createdAt) -
          timestampValue(first.createdAt)
      );

      setQuotations(combined);

      if (normalLoaded && bulkLoaded) {
        setLoading(false);
      }
    };

    const handleError = (error) => {
      console.error('Quotation requests loading error:', error);

      setLoadError(
        'Some quotation requests could not be loaded.'
      );

      setLoading(false);
    };

    const unsubscribeNormal = onSnapshot(
      collection(db, 'quotationRequests'),
      (snapshot) => {
        normalRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          requestType: 'normal',
        }));

        normalLoaded = true;
        updateRequests();
      },
      handleError
    );

    const unsubscribeBulk = onSnapshot(
      collection(db, 'bulkOrderRequests'),
      (snapshot) => {
        bulkRequests = snapshot.docs.map((item) => {
          const data = item.data();

          const customer = data.customer || {};

          const products = Array.isArray(data.products)
            ? data.products
            : [];

          return {
            id: item.id,
            ...data,
            requestType: 'bulk',

            customerName: customer.name || 'Customer',
            customerEmail: customer.email || '',
            customerPhone: customer.phone || '',
            company: customer.company || '',
            deliveryAddress: customer.deliveryAddress || '',
            message: customer.message || '',

            productName: `${products.length} selected product(s)`,

            productCategory: 'Bulk Order',

            quantity: data.totalQuantity || 0,

            unitPrice:
              data.totalQuantity > 0
                ? (Number(data.estimatedRegularTotal) || 0) /
                  data.totalQuantity
                : 0,

            estimatedTotal:
              Number(data.estimatedRegularTotal) || 0,

            estimatedDiscountPercent: 0,
            estimatedDiscountAmount: 0,

            products,
          };
        });

        bulkLoaded = true;
        updateRequests();
      },
      handleError
    );

    return () => {
      unsubscribeNormal();
      unsubscribeBulk();
    };
  }, []);

  // STATISTICS

  const counts = useMemo(
    () => ({
      total: quotations.length,

      pending: quotations.filter(
        (item) => item.status === 'pending'
      ).length,

      reviewed: quotations.filter(
        (item) => item.status === 'reviewed'
      ).length,

      approved: quotations.filter(
        (item) => item.status === 'approved'
      ).length,

      bulk: quotations.filter(
        (item) => item.requestType === 'bulk'
      ).length,
    }),
    [quotations]
  );

  // FILTER QUOTATIONS

  const filteredQuotations = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return quotations.filter((quotation) => {
      const matchesStatus =
        statusFilter === 'all' ||
        quotation.status === statusFilter;

      const matchesType =
        typeFilter === 'all' ||
        quotation.requestType === typeFilter;

      const matchesSearch =
        !search ||
        quotation.customerName?.toLowerCase().includes(search) ||
        quotation.customerEmail?.toLowerCase().includes(search) ||
        quotation.customerPhone?.includes(search) ||
        quotation.productName?.toLowerCase().includes(search) ||
        quotation.company?.toLowerCase().includes(search) ||
        getReference(
          quotation.id,
          quotation.requestType
        )
          .toLowerCase()
          .includes(search);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [
    quotations,
    searchTerm,
    statusFilter,
    typeFilter,
  ]);

  const isBulkRequest =
    selectedQuotation?.requestType === 'bulk';

  const selectedBulkProducts =
    isBulkRequest &&
    Array.isArray(selectedQuotation?.products)
      ? selectedQuotation.products
      : [];

  const draftUnitPrice = toFiniteNumber(
    draft.finalUnitPrice
  );

  const draftDiscount = toFiniteNumber(
    draft.finalDiscountPercent
  );

  const draftQuantity = toFiniteNumber(
    selectedQuotation?.quantity
  );

  const draftSubtotal = roundCurrency(
    draftUnitPrice * draftQuantity
  );

  const draftDiscountAmount = roundCurrency(
    (draftSubtotal * draftDiscount) / 100
  );

  const draftTotal = roundCurrency(
    draftSubtotal - draftDiscountAmount
  );

  // BULK PRICE CALCULATIONS

  const bulkOriginalSubtotal = roundCurrency(
    selectedBulkProducts.reduce(
      (total, product) =>
        total +
        toFiniteNumber(product.unitPrice) *
          toFiniteNumber(product.quantity),
      0
    )
  );

  const bulkFinalSubtotal = roundCurrency(
    selectedBulkProducts.reduce(
      (total, product, index) =>
        total +
        toFiniteNumber(
          draft.bulkProductPrices[index]
        ) *
          toFiniteNumber(product.quantity),
      0
    )
  );

  const bulkDiscountAmount = roundCurrency(
    bulkOriginalSubtotal - bulkFinalSubtotal
  );

  const bulkDiscountPercent =
    bulkOriginalSubtotal > 0
      ? roundCurrency(
          (bulkDiscountAmount / bulkOriginalSubtotal) * 100
        )
      : 0;

  const summarySubtotal = isBulkRequest
    ? bulkOriginalSubtotal
    : draftSubtotal;

  const summaryDiscountPercent = isBulkRequest
    ? bulkDiscountPercent
    : draftDiscount;

  const summaryDiscountAmount = isBulkRequest
    ? bulkDiscountAmount
    : draftDiscountAmount;

  const summaryFinalTotal = isBulkRequest
    ? bulkFinalSubtotal
    : draftTotal;

  // OPEN QUOTATION FOR REVIEW

  const openReview = useCallback((quotation) => {
    const existingUnitPrice =
      quotation.finalUnitPrice ??
      quotation.unitPrice ??
      0;

    const products = Array.isArray(quotation.products)
      ? quotation.products
      : [];

    const savedProducts = Array.isArray(
      quotation.finalProducts
    )
      ? quotation.finalProducts
      : [];

    setSelectedQuotation(quotation);

    setDraft({
      finalUnitPrice: String(existingUnitPrice),

      finalDiscountPercent: String(
        quotation.finalDiscountPercent ??
          quotation.estimatedDiscountPercent ??
          0
      ),

      bulkProductPrices: products.map(
        (product, index) => {
          const lineId = getBulkProductLineId(
            product,
            index
          );

          const savedProduct =
            savedProducts.find(
              (item) => item.lineId === lineId
            ) || savedProducts[index];

          return String(
            savedProduct?.finalUnitPrice ??
              product.finalUnitPrice ??
              product.unitPrice ??
              0
          );
        }
      ),

      // Bulk requests will be approved when saved.
      status:
        quotation.requestType === 'bulk'
          ? 'approved'
          : quotation.status || 'pending',

      adminNotes: quotation.adminNotes || '',
    });
  }, []);

  // OPEN REQUEST FROM ADMIN NOTIFICATION

  useEffect(() => {
    if (!relatedDocumentId || loading) return;

    const relatedQuotation = quotations.find(
      (quotation) =>
        quotation.id === relatedDocumentId &&
        (!notificationSourceCollection ||
          (notificationSourceCollection ===
          'bulkOrderRequests'
            ? quotation.requestType === 'bulk'
            : quotation.requestType === 'normal'))
    );

    if (relatedQuotation) {
      const frame = window.requestAnimationFrame(() => {
        setSearchTerm('');
        setStatusFilter('all');
        setTypeFilter('all');

        openReview(relatedQuotation);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [
    loading,
    notificationSourceCollection,
    openReview,
    quotations,
    relatedDocumentId,
  ]);

  const closeReview = () => {
    if (!saving) {
      setSelectedQuotation(null);
    }
  };

  // SAVE FINAL QUOTATION

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selectedQuotation || saving) return;

    // VALIDATE BULK PRODUCTS

    if (isBulkRequest) {
      if (selectedBulkProducts.length === 0) {
        toast.error(
          'This bulk request has no products to price.'
        );

        return;
      }

      const invalidProductIndex =
        selectedBulkProducts.findIndex(
          (_, index) => {
            const price = Number(
              draft.bulkProductPrices[index]
            );

            return (
              !Number.isFinite(price) ||
              price <= 0
            );
          }
        );

      if (invalidProductIndex !== -1) {
        toast.error(
          `Enter a valid final price for ${
            selectedBulkProducts[
              invalidProductIndex
            ].name ||
            `product ${invalidProductIndex + 1}`
          }.`
        );

        return;
      }
    } else {
      if (
        !Number.isFinite(
          Number(draft.finalUnitPrice)
        ) ||
        draftUnitPrice <= 0
      ) {
        toast.error(
          'Enter a valid final unit price.'
        );

        return;
      }

      if (
        !Number.isFinite(
          Number(draft.finalDiscountPercent)
        ) ||
        draftDiscount < 0 ||
        draftDiscount > 100
      ) {
        toast.error(
          'Discount must be between 0% and 100%.'
        );

        return;
      }
    }

    const collectionName =
      selectedQuotation.requestType === 'bulk'
        ? 'bulkOrderRequests'
        : 'quotationRequests';

    try {
      setSaving(true);

      let pricingData;

      // BULK QUOTATION PRICING

      if (isBulkRequest) {
        const finalProducts =
          selectedBulkProducts.map(
            (product, index) => {
              const quantity = toFiniteNumber(
                product.quantity
              );

              const originalUnitPrice =
                roundCurrency(product.unitPrice);

              const finalUnitPrice =
                roundCurrency(
                  draft.bulkProductPrices[index]
                );

              return {
                lineId: getBulkProductLineId(
                  product,
                  index
                ),

                productId:
                  product.productId || null,

                name:
                  product.name || 'MAISON product',

                category:
                  product.category || null,

                selectedColor:
                  product.selectedColor || null,

                selectedSize:
                  product.selectedSize || null,

                quantity,

                originalUnitPrice,

                finalUnitPrice,

                originalLineTotal: roundCurrency(
                  originalUnitPrice * quantity
                ),

                finalLineTotal: roundCurrency(
                  finalUnitPrice * quantity
                ),
              };
            }
          );

        const totalQuantity =
          finalProducts.reduce(
            (total, product) =>
              total + product.quantity,
            0
          );

        const finalAverageUnitPrice =
          totalQuantity > 0
            ? roundCurrency(
                bulkFinalSubtotal / totalQuantity
              )
            : 0;

        pricingData = {
          pricingMode: 'product-wise',

          finalProducts,

          originalSubtotal:
            bulkOriginalSubtotal,

          finalUnitPrice:
            finalAverageUnitPrice,

          finalAverageUnitPrice,

          finalDiscountPercent:
            bulkDiscountPercent,

          finalSubtotal:
            bulkFinalSubtotal,

          finalDiscountAmount:
            bulkDiscountAmount,

          finalTotal:
            bulkFinalSubtotal,
        };
      } else {
        // NORMAL QUOTATION PRICING

        pricingData = {
          finalUnitPrice: draftUnitPrice,

          finalDiscountPercent: draftDiscount,

          finalSubtotal: draftSubtotal,

          finalDiscountAmount:
            draftDiscountAmount,

          finalTotal: draftTotal,
        };
      }

      // IMPORTANT FIX:
      // Every successfully saved bulk quotation
      // will automatically become APPROVED.

      const finalStatus = isBulkRequest
        ? 'approved'
        : draft.status;

      await updateDoc(
        doc(
          db,
          collectionName,
          selectedQuotation.id
        ),
        {
          ...pricingData,

          status: finalStatus,

          adminNotes: draft.adminNotes.trim(),

          reviewedBy:
            auth.currentUser?.email ||
            auth.currentUser?.uid ||
            'admin',

          reviewedAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      toast.success(
        isBulkRequest
          ? 'Bulk quotation approved and updated successfully!'
          : 'Quotation pricing updated successfully!'
      );

      setSelectedQuotation(null);
    } catch (error) {
      console.error(
        'Quotation update error:',
        error
      );

      toast.error(
        'Unable to save the quotation. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-quotes-page">
      <SEO
        title="Quotation Requests | MAISON Admin"
        description="Review normal and bulk quotation requests."
        robots="noindex, nofollow"
      />

      <header className="admin-quotes-header">
        <div>
          <span>SALES &amp; PRICING</span>

          <h1>Quotation Requests</h1>

          <p>
            Review customer requirements, bulk orders
            and confirm final pricing.
          </p>
        </div>

        <div className="admin-quotes-header-icon">
          <FileText size={28} />
        </div>
      </header>

      {/* STATISTICS */}

      <section className="admin-quotes-stats">
        <article>
          <div className="quote-stat-icon total">
            <FileText size={20} />
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{counts.total}</strong>
          </div>
        </article>

        <article>
          <div className="quote-stat-icon pending">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Pending Review</span>
            <strong>{counts.pending}</strong>
          </div>
        </article>

        <article>
          <div className="quote-stat-icon reviewed">
            <Eye size={20} />
          </div>

          <div>
            <span>Reviewed</span>
            <strong>{counts.reviewed}</strong>
          </div>
        </article>

        <article>
          <div className="quote-stat-icon approved">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Approved</span>
            <strong>{counts.approved}</strong>
          </div>
        </article>

        <article>
          <div className="quote-stat-icon total">
            <Package size={20} />
          </div>

          <div>
            <span>Bulk Requests</span>
            <strong>{counts.bulk}</strong>
          </div>
        </article>
      </section>

      {/* QUOTATION TABLE */}

      <section className="admin-quotes-panel">
        <div className="admin-quotes-toolbar">
          <label className="admin-quotes-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search reference, customer or product…"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </label>

          <select
            aria-label="Filter request type"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="all">
              All request types
            </option>

            <option value="normal">
              Normal Quotations
            </option>

            <option value="bulk">
              Bulk Orders
            </option>
          </select>

          <select
            aria-label="Filter quotations by status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All statuses</option>

            {STATUS_OPTIONS.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="admin-quotes-state">
            <LoaderCircle
              className="admin-quotes-spinner"
              size={30}
            />

            <p>Loading quotation requests…</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="admin-quotes-state error">
            <XCircle size={30} />
            <p>{loadError}</p>
          </div>
        )}

        {!loading &&
          !loadError &&
          filteredQuotations.length === 0 && (
            <div className="admin-quotes-state">
              <FileText size={32} />
              <p>
                No quotation requests match this view.
              </p>
            </div>
          )}

        {!loading &&
          !loadError &&
          filteredQuotations.length > 0 && (
            <div className="admin-quotes-table-wrap">
              <table className="admin-quotes-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Product / Request</th>
                    <th>Estimate</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredQuotations.map(
                    (quotation) => (
                      <tr
                        key={`${quotation.requestType}-${quotation.id}`}
                      >
                        <td data-label="Reference">
                          <strong className="quote-reference">
                            {getReference(
                              quotation.id,
                              quotation.requestType
                            )}
                          </strong>

                          <span className="quote-date">
                            {formatDate(
                              quotation.createdAt
                            )}
                          </span>

                          <span>
                            {quotation.requestType ===
                            'bulk'
                              ? 'Bulk Order'
                              : 'Normal Quotation'}
                          </span>
                        </td>

                        <td data-label="Customer">
                          <strong>
                            {quotation.customerName ||
                              'Customer'}
                          </strong>

                          <span>
                            {quotation.customerEmail ||
                              'No email'}
                          </span>
                        </td>

                        <td data-label="Product">
                          <strong>
                            {quotation.productName ||
                              'Product'}
                          </strong>

                          <span>
                            {quotation.quantity || 0}{' '}
                            units
                          </span>
                        </td>

                        <td data-label="Estimate">
                          <strong>
                            {formatPrice(
                              quotation.estimatedTotal
                            )}
                          </strong>

                          <span>
                            {quotation.estimatedDiscountPercent ||
                              0}
                            % estimated discount
                          </span>
                        </td>

                        <td data-label="Status">
                          <span
                            className={`quote-status ${
                              quotation.status || 'pending'
                            }`}
                          >
                            {STATUS_OPTIONS.find(
                              (item) =>
                                item.value ===
                                quotation.status
                            )?.label || 'Pending'}
                          </span>
                        </td>

                        <td data-label="Action">
                          <button
                            type="button"
                            className="quote-review-button"
                            onClick={() =>
                              openReview(quotation)
                            }
                          >
                            <Eye size={15} />
                            Review
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {/* REVIEW MODAL */}

      {selectedQuotation && (
        <div
          className="quote-modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            closeReview()
          }
        >
          <section
            className="quote-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-review-title"
          >
            <header>
              <div>
                <span>
                  {getReference(
                    selectedQuotation.id,
                    selectedQuotation.requestType
                  )}
                </span>

                <h2 id="quote-review-title">
                  {isBulkRequest
                    ? 'Review Bulk Order'
                    : 'Review Quotation'}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close quotation review"
                onClick={closeReview}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </header>

            <div className="quote-modal-content">
              {/* CUSTOMER DETAILS */}

              <div className="quote-details-grid">
                <article>
                  <h3>
                    <UserRound size={16} />
                    Customer
                  </h3>

                  <strong>
                    {selectedQuotation.customerName}
                  </strong>

                  {selectedQuotation.company && (
                    <span>
                      {selectedQuotation.company}
                    </span>
                  )}

                  <a
                    href={`mailto:${selectedQuotation.customerEmail}`}
                  >
                    <Mail size={14} />

                    {selectedQuotation.customerEmail ||
                      'No email'}
                  </a>

                  <a
                    href={`tel:${selectedQuotation.customerPhone}`}
                  >
                    <Phone size={14} />

                    {selectedQuotation.customerPhone ||
                      'No phone'}
                  </a>

                  {selectedQuotation.deliveryAddress && (
                    <span>
                      <strong>
                        Delivery address:
                      </strong>{' '}
                      {selectedQuotation.deliveryAddress}
                    </span>
                  )}
                </article>

                <article>
                  <h3>
                    <Package size={16} />
                    Request
                  </h3>

                  {isBulkRequest ? (
                    <>
                      <strong>
                        Bulk Order Request
                      </strong>

                      <span>
                        Total quantity:{' '}
                        {selectedQuotation.totalQuantity ||
                          0}{' '}
                        units
                      </span>

                      <span>
                        Estimated total:{' '}
                        {formatPrice(
                          selectedQuotation.estimatedRegularTotal
                        )}
                      </span>

                      <span>
                        Source:{' '}
                        {selectedQuotation.source ||
                          'Storefront'}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>
                        {selectedQuotation.productName}
                      </strong>

                      <span>
                        {selectedQuotation.productCategory ||
                          'Uncategorised'}
                      </span>

                      <span>
                        {selectedQuotation.quantity} units ×{' '}
                        {formatPrice(
                          selectedQuotation.unitPrice
                        )}
                      </span>

                      <span>
                        Estimate:{' '}
                        {formatPrice(
                          selectedQuotation.estimatedTotal
                        )}
                      </span>
                    </>
                  )}
                </article>
              </div>

              {/* BULK PRODUCTS */}

              {isBulkRequest &&
                selectedQuotation.products?.length > 0 && (
                  <div className="quote-customer-note">
                    <strong>Selected Products</strong>

                    {selectedQuotation.products.map(
                      (product, index) => (
                        <p
                          key={`${
                            product.productId || index
                          }-${index}`}
                        >
                          <strong>
                            {product.name}
                          </strong>

                          {' — '}

                          {product.quantity} units ×{' '}
                          {formatPrice(
                            product.unitPrice
                          )}

                          {product.selectedColor
                            ? ` | Colour: ${product.selectedColor}`
                            : ''}

                          {product.selectedSize
                            ? ` | Size: ${product.selectedSize}`
                            : ''}
                        </p>
                      )
                    )}
                  </div>
                )}

              {selectedQuotation.message && (
                <div className="quote-customer-note">
                  <strong>
                    Customer Requirements
                  </strong>

                  <p>
                    {selectedQuotation.message}
                  </p>
                </div>
              )}

              {/* PRICING FORM */}

              <form
                className="quote-pricing-form"
                onSubmit={handleSave}
              >
                <div className="quote-pricing-title">
                  <div>
                    <IndianRupee size={18} />
                    <h3>Final Pricing</h3>
                  </div>

                  <p>
                    {isBulkRequest
                      ? 'Set a final unit price for every product in this bulk request.'
                      : 'Set the confirmed price and update the request status.'}
                  </p>
                </div>

                {/* BULK PRICING */}

                {isBulkRequest ? (
                  <>
                    <div className="quote-product-pricing">
                      <div
                        className="quote-product-pricing-header"
                        aria-hidden="true"
                      >
                        <span>Product</span>
                        <span>Quantity</span>
                        <span>Original price</span>
                        <span>Final price</span>
                      </div>

                      {selectedBulkProducts.map(
                        (product, index) => {
                          const quantity =
                            toFiniteNumber(
                              product.quantity
                            );

                          const originalUnitPrice =
                            toFiniteNumber(
                              product.unitPrice
                            );

                          const finalUnitPrice =
                            toFiniteNumber(
                              draft.bulkProductPrices[
                                index
                              ]
                            );

                          return (
                            <div
                              className="quote-product-pricing-row"
                              key={getBulkProductLineId(
                                product,
                                index
                              )}
                            >
                              <div className="quote-product-pricing-info">
                                <strong>
                                  {product.name ||
                                    `Product ${index + 1}`}
                                </strong>

                                <span>
                                  {[
                                    product.selectedColor,
                                    product.selectedSize,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                    'Standard selection'}
                                </span>
                              </div>

                              <div className="quote-product-pricing-value">
                                <span>Quantity</span>

                                <strong>
                                  {quantity} units
                                </strong>
                              </div>

                              <div className="quote-product-pricing-value">
                                <span>
                                  Original price
                                </span>

                                <strong>
                                  {formatPrice(
                                    originalUnitPrice
                                  )}
                                </strong>

                                <small>
                                  {formatPrice(
                                    originalUnitPrice *
                                      quantity
                                  )}{' '}
                                  total
                                </small>
                              </div>

                              <label className="quote-product-price-field">
                                <span>
                                  Final unit price (₹)
                                </span>

                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={
                                    draft.bulkProductPrices[
                                      index
                                    ] ?? ''
                                  }
                                  onChange={(event) =>
                                    setDraft(
                                      (current) => ({
                                        ...current,

                                        bulkProductPrices:
                                          current.bulkProductPrices.map(
                                            (
                                              price,
                                              priceIndex
                                            ) =>
                                              priceIndex ===
                                              index
                                                ? event.target
                                                    .value
                                                : price
                                          ),
                                      })
                                    )
                                  }
                                  aria-label={`Final unit price for ${
                                    product.name ||
                                    `product ${index + 1}`
                                  }`}
                                  disabled={saving}
                                  required
                                />

                                <small>
                                  {formatPrice(
                                    finalUnitPrice *
                                      quantity
                                  )}{' '}
                                  total
                                </small>
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* BULK STATUS IS AUTOMATICALLY APPROVED */}

                    <div className="quote-form-grid quote-bulk-status-grid">
                      <label>
                        Status

                        <select
                          value="approved"
                          disabled
                          aria-label="Bulk quotation status"
                        >
                          <option value="approved">
                            Approved
                          </option>
                        </select>

                        <small>
                          The quotation will be approved
                          automatically when you save
                          the final pricing.
                        </small>
                      </label>
                    </div>
                  </>
                ) : (
                  /* NORMAL QUOTATION PRICING */

                  <div className="quote-form-grid">
                    <label>
                      Final unit price (₹)

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.finalUnitPrice}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            finalUnitPrice:
                              event.target.value,
                          }))
                        }
                        disabled={saving}
                        required
                      />
                    </label>

                    <label>
                      Discount (%)

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={
                          draft.finalDiscountPercent
                        }
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            finalDiscountPercent:
                              event.target.value,
                          }))
                        }
                        disabled={saving}
                        required
                      />
                    </label>

                    <label>
                      Status

                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                        disabled={saving}
                      >
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={status.value}
                              value={status.value}
                            >
                              {status.label}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>
                )}

                {/* FINAL SUMMARY */}

                <div className="quote-final-summary">
                  <div>
                    <span>Subtotal</span>

                    <strong>
                      {formatPrice(summarySubtotal)}
                    </strong>
                  </div>

                  <div>
                    <span>Overall discount</span>

                    <strong>
                      {formatPercentage(
                        summaryDiscountPercent
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Discount amount</span>

                    <strong>
                      {formatDiscountAmount(
                        summaryDiscountAmount
                      )}
                    </strong>
                  </div>

                  <div className="quote-final-total">
                    <span>Final total</span>

                    <strong>
                      {formatPrice(summaryFinalTotal)}
                    </strong>
                  </div>
                </div>

                {/* ADMIN NOTES */}

                <label className="quote-admin-notes">
                  Internal notes

                  <textarea
                    rows="3"
                    placeholder="Add pricing or review notes for the admin team…"
                    value={draft.adminNotes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        adminNotes: event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </label>

                {/* ACTION BUTTONS */}

                <div className="quote-modal-actions">
                  <button
                    type="button"
                    className="quote-cancel-button"
                    onClick={closeReview}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="quote-save-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <LoaderCircle
                        className="admin-quotes-spinner"
                        size={16}
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {saving
                      ? 'Saving…'
                      : 'Save Review'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminQuotations;