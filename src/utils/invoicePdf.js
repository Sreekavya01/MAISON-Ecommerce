import { getInvoiceData } from './invoice.js';

const NAVY = [23, 43, 77];
const GOLD = [198, 161, 91];
const TEXT = [37, 42, 50];
const MUTED = [108, 118, 132];
const BORDER = [225, 228, 232];

const pdfCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safeFilenamePart = (value) =>
  String(value || 'invoice').replace(/[^a-z0-9-_]/gi, '-');

export async function buildInvoicePdf(order) {
  const { jsPDF } = await import('jspdf');
  const invoice = getInvoiceData(order);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;

  const drawBrandHeader = (compact = false) => {
    const height = compact ? 62 : 108;
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, pageWidth, height, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(compact ? 18 : 24);
    pdf.text('MAISON', margin, compact ? 38 : 48);
    pdf.setTextColor(...GOLD);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('THE ART OF SHOPPING', margin, compact ? 51 : 64);

    if (!compact) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('INVOICE', pageWidth - margin, 43, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(invoice.invoiceNumber, pageWidth - margin, 61, { align: 'right' });
      pdf.setTextColor(211, 218, 228);
      pdf.text(`Order ${invoice.orderReference}`, pageWidth - margin, 77, {
        align: 'right',
      });
    }

    return height;
  };

  const drawItemsHeader = (y) => {
    pdf.setFillColor(245, 246, 248);
    pdf.rect(margin, y, contentWidth, 25, 'F');
    pdf.setTextColor(...NAVY);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('PRODUCT', margin + 9, y + 16);
    pdf.text('QTY', 364, y + 16, { align: 'center' });
    pdf.text('UNIT PRICE', 455, y + 16, { align: 'right' });
    pdf.text('TOTAL', pageWidth - margin - 9, y + 16, { align: 'right' });
    return y + 25;
  };

  drawBrandHeader();

  let y = 137;
  pdf.setTextColor(...GOLD);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('BILLED TO', margin, y);
  pdf.text('INVOICE DETAILS', 350, y);

  pdf.setTextColor(...TEXT);
  pdf.setFontSize(11);
  pdf.text(invoice.customer.name, margin, y + 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  const customerLines = [
    invoice.customer.email,
    invoice.customer.phone,
    ...invoice.customer.address,
  ].filter(Boolean);
  customerLines.slice(0, 4).forEach((line, index) => {
    pdf.text(String(line), margin, y + 36 + index * 13);
  });

  const detailRows = [
    ['Invoice date', invoice.invoiceDate],
    ['Payment', invoice.paymentMethod],
    ['Status', invoice.paymentStatus],
  ];
  detailRows.forEach(([label, value], index) => {
    const rowY = y + 20 + index * 20;
    pdf.setTextColor(...MUTED);
    pdf.text(label, 350, rowY);
    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(value), pageWidth - margin, rowY, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
  });

  y = 232;
  pdf.setDrawColor(...BORDER);
  pdf.line(margin, y - 16, pageWidth - margin, y - 16);
  pdf.setTextColor(...NAVY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Purchase summary', margin, y);
  y = drawItemsHeader(y + 13);

  invoice.products.forEach((product) => {
    const nameLines = pdf.splitTextToSize(product.name, 245).slice(0, 2);
    const variant = [
      product.category,
      product.selectedColor && `Colour: ${product.selectedColor}`,
      product.selectedSize && `Size: ${product.selectedSize}`,
    ].filter(Boolean).join(' | ');
    const rowHeight = Math.max(43, nameLines.length * 11 + (variant ? 14 : 5) + 12);

    if (y + rowHeight > pageHeight - 150) {
      pdf.addPage();
      drawBrandHeader(true);
      y = drawItemsHeader(78);
    }

    pdf.setDrawColor(...BORDER);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(nameLines, margin + 9, y + 15);

    if (variant) {
      pdf.setTextColor(...MUTED);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text(pdf.splitTextToSize(variant, 250)[0], margin + 9, y + 29);
    }

    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(String(product.quantity), 364, y + 18, { align: 'center' });
    pdf.text(pdfCurrency(product.unitPrice), 455, y + 18, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      pdfCurrency(product.unitPrice * product.quantity),
      pageWidth - margin - 9,
      y + 18,
      { align: 'right' }
    );
    y += rowHeight;
  });

  const summaryRows = [
    ['Subtotal', pdfCurrency(invoice.subtotal)],
    ['Shipping', invoice.shipping === 0 ? 'FREE' : pdfCurrency(invoice.shipping)],
    ...(invoice.discount > 0
      ? [[
          invoice.couponCode ? `Discount (${invoice.couponCode})` : 'Discount',
          `- ${pdfCurrency(invoice.discount)}`,
        ]]
      : []),
    ...(invoice.tax > 0 ? [['Tax', pdfCurrency(invoice.tax)]] : []),
  ];
  const summaryHeight = summaryRows.length * 21 + 62;

  if (y + summaryHeight > pageHeight - 55) {
    pdf.addPage();
    drawBrandHeader(true);
    y = 90;
  }

  const summaryX = pageWidth - margin - 230;
  y += 22;
  summaryRows.forEach(([label, value]) => {
    pdf.setTextColor(...MUTED);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(label, summaryX, y);
    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, pageWidth - margin, y, { align: 'right' });
    y += 21;
  });

  pdf.setFillColor(...NAVY);
  pdf.roundedRect(summaryX - 12, y - 4, 242, 42, 5, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL', summaryX, y + 21);
  pdf.setFontSize(14);
  pdf.text(pdfCurrency(invoice.total), pageWidth - margin - 9, y + 21, {
    align: 'right',
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...BORDER);
    pdf.line(margin, pageHeight - 37, pageWidth - margin, pageHeight - 37);
    pdf.setTextColor(...MUTED);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text('Prices include applicable taxes. Thank you for choosing MAISON.', margin, pageHeight - 21);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 21, {
      align: 'right',
    });
  }

  return {
    pdf,
    filename: `MAISON-Invoice-${safeFilenamePart(invoice.invoiceNumber)}.pdf`,
  };
}

export async function downloadInvoicePdf(order) {
  const { pdf, filename } = await buildInvoicePdf(order);
  pdf.save(filename);
}
