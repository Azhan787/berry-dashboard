import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscountCents, calculateInvoiceTotals, calculateSubtotalCents, formatCents, getDiscountValidationError, getInvoiceItemValidationError } from '../../shared/invoicePricing.js';
import { addInvoiceItem, createInvoiceItem, removeInvoiceItem, selectInvoiceProduct, updateInvoiceItem } from '../../shared/invoiceItems.js';
import { invoiceSchema } from '../src/routes/api.js';

const items = [
  { description: 'Consulting', quantity: '2', unit_price: '10.00' },
  { product_id: 'catalog-product', quantity: '1', unit_price: '5.00' },
];

test('the API normalizes an empty discount to zero and rejects client-submitted totals', () => {
  const parsed = invoiceSchema.parse({
    customer_id: '00000000-0000-4000-8000-000000000001',
    currency: 'USD',
    issue_date: '2026-11-01',
    due_date: '2026-12-01',
    items: [{ description: 'Consulting', quantity: '1', unit_price: '10.00' }],
    discount_amount: '',
    tax_amount: '0',
  });
  assert.equal(parsed.discount_amount, '0');
  assert.throws(() => invoiceSchema.parse({ ...parsed, subtotal: '10.00', total_amount: '10.00' }));
});

test('selecting a catalogue product stores its name, quantity, and canonical unit price', () => {
  const productItem = selectInvoiceProduct([createInvoiceItem()], 0, 'product-1', [{ id: 'product-1', name: 'Design work', unitPrice: '49.95' }])[0];
  assert.deepEqual(productItem, { product_id: 'product-1', description: 'Design work', quantity: '1', unit_price: '49.95' });
  assert.equal(formatCents(calculateSubtotalCents([productItem])), '49.95');
  const missingProductPrice = selectInvoiceProduct([createInvoiceItem()], 0, 'product-2', [{ id: 'product-2', name: 'Missing price' }])[0];
  assert.equal(missingProductPrice.unit_price, '');
  assert.equal(getInvoiceItemValidationError([missingProductPrice]), 'Add at least one valid invoice item.');
});

test('a manually entered custom item calculates from quantity and unit price', () => {
  let customItems = [createInvoiceItem()];
  customItems = updateInvoiceItem(customItems, 0, 'description', 'Consulting');
  customItems = updateInvoiceItem(customItems, 0, 'quantity', '2.5');
  customItems = updateInvoiceItem(customItems, 0, 'unit_price', '12.40');
  assert.equal(formatCents(calculateSubtotalCents(customItems)), '31.00');
  assert.equal(getInvoiceItemValidationError(customItems), '');
});

test('adding and removing invoice items immediately changes the subtotal', () => {
  const first = { description: 'First', quantity: '1', unit_price: '10.00' };
  let invoiceItems = addInvoiceItem([first]);
  invoiceItems = updateInvoiceItem(invoiceItems, 1, 'description', 'Second');
  invoiceItems = updateInvoiceItem(invoiceItems, 1, 'unit_price', '4.00');
  assert.equal(formatCents(calculateSubtotalCents(invoiceItems)), '14.00');
  invoiceItems = removeInvoiceItem(invoiceItems, 0);
  assert.equal(formatCents(calculateSubtotalCents(invoiceItems)), '4.00');
});

test('editing quantity and unit price recalculates from the updated item state', () => {
  const updated = updateInvoiceItem([{ description: 'Service', quantity: '1', unit_price: '5.00' }], 0, 'quantity', '3');
  const repriced = updateInvoiceItem(updated, 0, 'unit_price', '7.25');
  assert.equal(formatCents(calculateSubtotalCents(repriced)), '21.75');
});

test('empty invoice and invalid item prices are reported as item errors', () => {
  assert.equal(getInvoiceItemValidationError([]), 'Add at least one valid invoice item.');
  assert.equal(getInvoiceItemValidationError([{ description: '', quantity: '1', unit_price: '' }]), 'Add at least one valid invoice item.');
  assert.notEqual(getInvoiceItemValidationError([{ description: 'Service', quantity: '1', unit_price: 'not-money' }]), '');
  assert.equal(calculateSubtotalCents([{ description: 'Service', quantity: '1', unit_price: 'not-money' }]), null);
});

test('zero and empty fixed discounts are accepted as zero', () => {
  const totals = calculateInvoiceTotals({ items, discountType: 'fixed', discountValue: '', taxAmount: '0' });
  assert.equal(formatCents(totals.subtotalCents), '25.00');
  assert.equal(formatCents(totals.discountCents), '0.00');
  assert.equal(formatCents(totals.totalCents), '25.00');
  assert.equal(getDiscountValidationError(totals, 'fixed', ''), '');
});

test('a valid fixed discount is subtracted from the computed subtotal', () => {
  const totals = calculateInvoiceTotals({ items, discountType: 'fixed', discountValue: '3.50', taxAmount: '0' });
  assert.equal(formatCents(totals.discountCents), '3.50');
  assert.equal(formatCents(totals.totalCents), '21.50');
  assert.equal(getDiscountValidationError(totals, 'fixed', '3.50'), '');
});

test('a percentage discount is converted to cents using the subtotal', () => {
  const totals = calculateInvoiceTotals({ items, discountType: 'percentage', discountValue: '10', taxAmount: '0' });
  assert.equal(formatCents(totals.discountCents), '2.50');
  assert.equal(formatCents(totals.totalCents), '22.50');
  assert.equal(getDiscountValidationError(totals, 'percentage', '10'), '');
});

test('a discount equal to the subtotal is valid', () => {
  const totals = calculateInvoiceTotals({ items, discountType: 'fixed', discountValue: '25.00', taxAmount: '0' });
  assert.equal(formatCents(totals.totalCents), '0.00');
  assert.equal(getDiscountValidationError(totals, 'fixed', '25.00'), '');
});

test('a discount greater than the subtotal is rejected before submission', () => {
  const totals = calculateInvoiceTotals({ items, discountType: 'fixed', discountValue: '25.01', taxAmount: '0' });
  assert.match(getDiscountValidationError(totals, 'fixed', '25.01'), /^Discount cannot exceed the subtotal/);
});

test('percentage discounts above 100 percent are rejected', () => {
  assert.equal(calculateDiscountCents(2500n, 'percentage', '100'), 2500n);
  assert.equal(calculateDiscountCents(2500n, 'percentage', '100.01'), null);
  const totals = calculateInvoiceTotals({ items, discountType: 'percentage', discountValue: '100.01', taxAmount: '0' });
  assert.equal(getDiscountValidationError(totals, 'percentage', '100.01'), 'Percentage discount cannot exceed 100%.');
});
