import { PRODUCTS, type ProductDef } from "./products";
import { US_STATES } from "./constants";
import { isValidEmail, isValidPhone } from "./util";

// Check catalog entries rather than indexing a plain object with untrusted URL input.
export function initialQuoteProduct(value: string | null): string {
  return PRODUCTS.some((p) => p.slug === value) ? value! : "";
}

export function validateQuoteContact(contact: {
  firstName: string; lastName: string; email: string; phone: string; state: string; zip: string;
}): string | null {
  if (!contact.firstName.trim() || !contact.lastName.trim()) return "Please enter your name.";
  if (!isValidEmail(contact.email)) return "Please enter a valid email.";
  if (!isValidPhone(contact.phone)) return "Please enter a valid US phone number.";
  if (!US_STATES.includes(contact.state)) return "Please select your state.";
  if (contact.zip && !/^\d{5}(-\d{4})?$/.test(contact.zip.trim())) return "Please enter a valid ZIP code.";
  return null;
}

export function reviewDetails(product: ProductDef, details: Record<string, string | boolean>) {
  return product.fields.map((field) => {
    const value = details[field.name];
    return {
      label: field.label,
      value: typeof value === "boolean" ? (value ? "Yes" : "No")
        : typeof value === "string" && value.trim() ? value : "Not provided",
    };
  });
}
