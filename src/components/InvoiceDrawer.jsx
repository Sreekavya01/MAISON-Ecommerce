import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  Printer,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { formatInvoiceCurrency, getInvoiceData } from '../utils/invoice';
import { downloadInvoicePdf } from '../utils/invoicePdf';

import './InvoiceDrawer.css';

function InvoiceDrawer({ open, onClose, order }) {
  const closeButtonRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDownloading) onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDownloading, onClose, open]);

  if (!open || !order) return null;

  const invoice = getInvoiceData(order);

  const handleDownload = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      await downloadInvoicePdf(order);
      toast.success('Invoice PDF downloaded.');
    } catch (error) {
      console.error('Invoice PDF generation error:', error);
      toast.error('Unable to generate the invoice PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="invoice-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDownloading) onClose();
      }}
    >
      <aside
        className="invoice-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-drawer-title"
      >
        <header className="invoice-drawer-toolbar">
          <div>
            <span><FileText size={15} /> ORDER DOCUMENT</span>
            <h2 id="invoice-drawer-title">Invoice {invoice.invoiceNumber}</h2>
          </div>

          <div className="invoice-drawer-actions">
            <button type="button" onClick={() => window.print()}>
              <Printer size={16} /> <span>Print</span>
            </button>
            <button type="button" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <LoaderCircle className="invoice-spinner" size={16} /> : <Download size={16} />}
              <span>{isDownloading ? 'Preparing...' : 'Download PDF'}</span>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className="invoice-drawer-close"
              onClick={onClose}
              disabled={isDownloading}
              aria-label="Close invoice"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="invoice-sheet">
          <div className="invoice-sheet-brand">
            <div>
              <h3>MAISON<span>.</span></h3>
              <p>THE ART OF SHOPPING</p>
            </div>
            <div>
              <span>PAYMENT DOCUMENT</span>
              <h3>INVOICE</h3>
              <p>{invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="invoice-sheet-meta">
            <section>
              <span className="invoice-label">BILLED TO</span>
              <h4>{invoice.customer.name}</h4>
              {invoice.customer.email && <p>{invoice.customer.email}</p>}
              {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
              {invoice.customer.address.map((line) => <p key={line}>{line}</p>)}
            </section>

            <section>
              <div><span>Invoice date</span><strong>{invoice.invoiceDate}</strong></div>
              <div><span>Order reference</span><strong>{invoice.orderReference}</strong></div>
              <div><span>Payment method</span><strong>{invoice.paymentMethod}</strong></div>
              <div className="invoice-payment-status">
                <span>Payment status</span>
                <strong><CheckCircle2 size={14} /> {invoice.paymentStatus}</strong>
              </div>
            </section>
          </div>

          <section className="invoice-sheet-items">
            <div className="invoice-sheet-section-heading">
              <span className="invoice-label">PURCHASE SUMMARY</span>
              <h4>Order items</h4>
            </div>

            <div className="invoice-sheet-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>QTY</th>
                    <th>UNIT PRICE</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.products.map((product) => (
                    <tr key={`${product.id}-${product.selectedColor}-${product.selectedSize}`}>
                      <td>
                        <strong>{product.name}</strong>
                        <span>
                          {[
                            product.category,
                            product.selectedColor && `Colour: ${product.selectedColor}`,
                            product.selectedSize && `Size: ${product.selectedSize}`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </td>
                      <td>{product.quantity}</td>
                      <td>{formatInvoiceCurrency(product.unitPrice)}</td>
                      <td>{formatInvoiceCurrency(product.unitPrice * product.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="invoice-sheet-bottom">
            <div className="invoice-thank-you">
              <span className="invoice-label">THANK YOU FOR SHOPPING</span>
              <h4>We appreciate your purchase.</h4>
              <p>Prices include applicable taxes. Keep this invoice for your records.</p>
            </div>

            <div className="invoice-sheet-totals">
              <div><span>Subtotal</span><strong>{formatInvoiceCurrency(invoice.subtotal)}</strong></div>
              <div>
                <span>Shipping</span>
                <strong>{invoice.shipping === 0 ? 'FREE' : formatInvoiceCurrency(invoice.shipping)}</strong>
              </div>
              {invoice.discount > 0 && (
                <div className="invoice-discount-row">
                  <span>{invoice.couponCode ? `Discount (${invoice.couponCode})` : 'Discount'}</span>
                  <strong>-{formatInvoiceCurrency(invoice.discount)}</strong>
                </div>
              )}
              {invoice.tax > 0 && (
                <div><span>Tax</span><strong>{formatInvoiceCurrency(invoice.tax)}</strong></div>
              )}
              <div className="invoice-total-row">
                <span>Total</span><strong>{formatInvoiceCurrency(invoice.total)}</strong>
              </div>
            </div>
          </div>

          <footer className="invoice-sheet-footer">
            <span>MAISON - Own Your Style. Elevate Your Lifestyle.</span>
            <span>Computer-generated invoice</span>
          </footer>
        </div>
      </aside>
    </div>
  );
}

export default InvoiceDrawer;
