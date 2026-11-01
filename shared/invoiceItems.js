import { formatCents, moneyToCents } from './invoicePricing.js';

export function createInvoiceItem() {
  return { description: '', quantity: '1', unit_price: '' };
}

export function addInvoiceItem(items) {
  return [...items, createInvoiceItem()];
}

export function removeInvoiceItem(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function updateInvoiceItem(items, index, field, value) {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
}

export function selectInvoiceProduct(items, index, productId, products) {
  return items.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    if (!productId) {
      const customItem = { ...item };
      delete customItem.product_id;
      return customItem;
    }

    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return item;

    const rawPrice = product.unit_price ?? product.unitPrice ?? product.price;
    const priceCents = String(rawPrice ?? '').trim() === '' ? null : moneyToCents(rawPrice);
    return {
      ...item,
      product_id: product.id,
      description: product.name ?? product.description ?? '',
      quantity: item.quantity || '1',
      unit_price: priceCents === null ? String(rawPrice ?? '') : formatCents(priceCents),
    };
  });
}
