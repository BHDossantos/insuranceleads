import type { ProductDef } from './products';
export function validateProductDetails(product: ProductDef | undefined, details: Record<string, unknown>): string | null {
  if (!product) return 'Please select a product.';
  for (const field of product.fields) {
    const value = details[field.name];
    const empty = value === undefined || value === null || (typeof value === 'string' && !value.trim());
    if (empty) { if (field.required) return `Please complete: ${field.label}`; continue; }
    if (field.type === 'number' && ((typeof value !== 'string' && typeof value !== 'number') || !Number.isFinite(Number(value)) || Number(value) < 0)) return `Enter a valid non-negative number: ${field.label}`;
    if (field.type === 'select' && !field.options?.includes(String(value))) return `Choose an available option: ${field.label}`;
    if (field.type === 'boolean' && typeof value !== 'boolean') return `Choose yes or no: ${field.label}`;
  }
  return null;
}
