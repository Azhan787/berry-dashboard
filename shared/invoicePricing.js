const decimalToUnits = (value, fractionDigits) => {
  const text = String(value ?? '').trim();
  if (text === '') return 0n;
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] || '').length > fractionDigits) return null;
  const scale = 10n ** BigInt(fractionDigits);
  const fraction = (match[2] || '').padEnd(fractionDigits, '0');
  return BigInt(match[1]) * scale + BigInt(fraction || '0');
};

export const moneyToCents = (value) => decimalToUnits(value, 2);
const quantityToMilliunits = (value) => decimalToUnits(value, 3);

export function getInvoiceItemValidationError(items) {
  if (!Array.isArray(items) || items.length === 0 || !items.some((item) => {
    const priceValue = item?.unit_price ?? item?.unitPrice ?? item?.price;
    return item?.description?.trim() && quantityToMilliunits(item.quantity) > 0n && String(priceValue ?? '').trim() !== '' && moneyToCents(priceValue) !== null;
  })) {
    return 'Add at least one valid invoice item.';
  }
  const hasInvalidItem = items.some((item) => {
    const quantity = quantityToMilliunits(item?.quantity);
    const priceValue = item?.unit_price ?? item?.unitPrice ?? item?.price;
    const price = moneyToCents(priceValue);
    return !item?.description?.trim() || quantity === null || quantity <= 0n || String(priceValue ?? '').trim() === '' || price === null;
  });
  return hasInvalidItem ? 'Complete each invoice item with a description, quantity greater than zero, and valid unit price.' : '';
}

export function calculateSubtotalCents(items = []) {
  let subtotal = 0n;
  for (const item of items) {
    const quantityMilliunits = quantityToMilliunits(item.quantity);
    const unitPriceCents = moneyToCents(item.unit_price ?? item.unitPrice ?? item.price);
    if (quantityMilliunits === null || unitPriceCents === null) return null;
    subtotal += (quantityMilliunits * unitPriceCents + 500n) / 1000n;
  }
  return subtotal;
}

export function calculateDiscountCents(subtotalCents, discountType, discountValue) {
  if (typeof subtotalCents !== 'bigint' || subtotalCents < 0n) return null;
  if (discountType === 'fixed') return moneyToCents(discountValue);
  if (discountType !== 'percentage') return null;

  const percentageBasisPoints = decimalToUnits(discountValue, 2);
  if (percentageBasisPoints === null || percentageBasisPoints > 10000n) return null;
  return (subtotalCents * percentageBasisPoints + 5000n) / 10000n;
}

export function formatCents(cents) {
  if (typeof cents !== 'bigint' || cents < 0n) return '0.00';
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export function calculateInvoiceTotals({ items, discountType, discountValue, taxAmount }) {
  const subtotalCents = calculateSubtotalCents(items);
  const discountCents = calculateDiscountCents(subtotalCents, discountType, discountValue);
  const taxCents = moneyToCents(taxAmount);
  if (subtotalCents === null || discountCents === null || taxCents === null) return null;
  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents + taxCents,
  };
}

export function getDiscountValidationError(totals, discountType, discountValue, currency = 'USD') {
  if (discountType === 'percentage') {
    const percentageBasisPoints = moneyToCents(discountValue);
    if (percentageBasisPoints === null) return 'Enter a valid discount percentage.';
    if (percentageBasisPoints > 10000n) return 'Percentage discount cannot exceed 100%.';
  }
  if (!totals) return 'Enter valid quantities, prices, discount, and tax amounts.';
  if (totals.discountCents > totals.subtotalCents) {
    const subtotal = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(totals.subtotalCents) / 100);
    return `Discount cannot exceed the subtotal of ${subtotal}.`;
  }
  return '';
}
