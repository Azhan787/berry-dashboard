import { PDFDocument } from 'pdfkit';

const formatMoney = (amount, currency) => new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));

export function buildInvoicePdf(invoice, organizationName) {
  const snapshot = invoice.issued_snapshot;
  if (!snapshot) throw Object.assign(new Error('Only issued invoices have a fixed printable snapshot.'), { status: 409 });
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Invoice ${snapshot.invoice_number}`, Author: 'Berry Dashboard' } });
  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fillColor('#596273').fontSize(10).text(String(organizationName || 'Berry workspace').slice(0, 160));
    doc.moveDown(1.2).fillColor('#241940').fontSize(24).text('INVOICE');
    doc.moveDown(0.35).fontSize(11).fillColor('#596273').text(snapshot.invoice_number);
    doc.moveDown(1.3).fontSize(10).fillColor('#596273').text('BILL TO');
    doc.moveDown(0.4).fontSize(13).fillColor('#161b2e').text(snapshot.customer?.company_name || snapshot.customer?.name || 'Customer');
    if (snapshot.customer?.company_name && snapshot.customer?.name) doc.fontSize(10).text(snapshot.customer.name);
    if (snapshot.customer?.email) doc.fontSize(10).fillColor('#596273').text(snapshot.customer.email);
    if (snapshot.customer?.country) doc.fontSize(10).text(snapshot.customer.country);
    doc.moveDown(1).fontSize(10).fillColor('#596273').text(`Issued ${snapshot.issue_date}    Due ${snapshot.due_date}`);

    let y = doc.y + 28;
    const headers = [['Description', 48, 278], ['Qty', 335, 45], ['Unit price', 390, 75], ['Amount', 475, 75]];
    doc.rect(48, y, 500, 26).fill('#f1eef8');
    doc.fillColor('#241940').fontSize(9);
    for (const [label, x, width] of headers) doc.text(label, x, y + 8, { width, align: label === 'Description' ? 'left' : 'right' });
    y += 34;
    for (const item of snapshot.items || []) {
      if (y > 700) { doc.addPage(); y = 58; }
      doc.fillColor('#262b36').fontSize(9).text(String(item.description).slice(0, 500), 48, y, { width: 278 });
      doc.text(String(item.quantity), 335, y, { width: 45, align: 'right' });
      doc.text(formatMoney(item.unit_price, snapshot.currency), 390, y, { width: 75, align: 'right' });
      doc.text(formatMoney(item.line_total, snapshot.currency), 475, y, { width: 75, align: 'right' });
      y = Math.max(doc.y, y + 20) + 9;
    }
    y += 12;
    doc.moveTo(350, y).lineTo(548, y).strokeColor('#d9d4e5').stroke();
    y += 13;
    const totals = [['Subtotal', snapshot.subtotal], ['Discount', -Number(snapshot.discount_amount)], ['Tax', snapshot.tax_amount], ['Total', snapshot.total_amount]];
    for (const [label, amount] of totals) {
      doc.fontSize(label === 'Total' ? 12 : 10).fillColor(label === 'Total' ? '#241940' : '#596273').text(label, 350, y, { width: 90 });
      doc.fontSize(label === 'Total' ? 12 : 10).text(formatMoney(amount, snapshot.currency), 440, y, { width: 108, align: 'right' });
      y += label === 'Total' ? 25 : 20;
    }
    if (snapshot.notes) { doc.moveDown(1.3).fontSize(10).fillColor('#241940').text('Notes'); doc.moveDown(0.3).fontSize(9).fillColor('#596273').text(String(snapshot.notes).slice(0, 2000)); }
    if (snapshot.terms) { doc.moveDown(1).fontSize(10).fillColor('#241940').text('Terms'); doc.moveDown(0.3).fontSize(9).fillColor('#596273').text(String(snapshot.terms).slice(0, 2000)); }
    doc.end();
  });
}

export function buildReportPdf({ title, organizationName, columns, rows, generatedAt = new Date() }) {
  const doc = new PDFDocument({ size: 'A4', margin: 42, layout: 'landscape', info: { Title: title, Author: 'Berry Dashboard' } });
  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fillColor('#241940').fontSize(20).text(String(title).slice(0, 120));
    doc.moveDown(0.25).fillColor('#596273').fontSize(9).text(`${String(organizationName || 'Berry workspace').slice(0, 160)} · Generated ${generatedAt.toISOString()}`);
    const firstHeaderY = 112;
    const widths = columns.map(() => (doc.page.width - 84) / columns.length);
    const drawHeader = (y) => {
      doc.rect(42, y, doc.page.width - 84, 24).fill('#f1eef8');
      let x = 46;
      columns.forEach((column, index) => {
        doc.fillColor('#241940').fontSize(8).text(String(column.label).slice(0, 40), x, y + 7, { width: widths[index] - 8, ellipsis: true });
        x += widths[index];
      });
      return y + 31;
    };
    let cursorY = drawHeader(firstHeaderY);
    rows.forEach((row, rowIndex) => {
      const values = columns.map(({ key }) => row[key] == null ? '' : String(row[key]));
      const height = 30;
      if (cursorY + height > doc.page.height - 42) { doc.addPage({ size: 'A4', layout: 'landscape', margin: 42 }); cursorY = drawHeader(42); }
      let x = 46;
      columns.forEach((_, index) => {
        doc.fillColor('#262b36').fontSize(8).text(values[index].slice(0, 500), x, cursorY, { width: widths[index] - 8, height: height - 3, ellipsis: true });
        x += widths[index];
      });
      cursorY += height;
      doc.moveTo(42, cursorY).lineTo(doc.page.width - 42, cursorY).strokeColor('#e7e4ed').stroke();
      cursorY += rowIndex % 2 === 0 ? 5 : 3;
    });
    if (!rows.length) doc.fillColor('#596273').fontSize(10).text('No records found.');
    doc.end();
  });
}
