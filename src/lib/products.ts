// Product catalog + product-specific intake form definitions.
//
// These power both the consumer multi-step quote form and server-side
// validation / scoring. Keeping them declarative lets us add lines of business
// without touching the form renderer.

export type FieldType = "text" | "number" | "select" | "boolean" | "date";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
}

export interface ProductDef {
  slug: string;
  label: string;
  group: "personal" | "life" | "commercial";
  tagline: string;
  fields: FormField[];
}

export const PRODUCTS: ProductDef[] = [
  {
    slug: "auto",
    label: "Auto",
    group: "personal",
    tagline: "Car, truck & multi-vehicle coverage",
    fields: [
      { name: "currentlyInsured", label: "Currently insured?", type: "boolean" },
      { name: "currentCarrier", label: "Current carrier", type: "text", placeholder: "e.g. Geico" },
      { name: "vehiclesCount", label: "Number of vehicles", type: "number", required: true },
      { name: "vehicleYear", label: "Primary vehicle year", type: "number" },
      { name: "vehicleMake", label: "Primary vehicle make", type: "text" },
      { name: "vehicleModel", label: "Primary vehicle model", type: "text" },
      { name: "accidentsTickets", label: "Accidents or tickets in last 3 years?", type: "boolean" },
      { name: "desiredStartDate", label: "Desired start date", type: "date" },
      { name: "bundleHome", label: "Interested in bundling with home?", type: "boolean" },
    ],
  },
  {
    slug: "home",
    label: "Home",
    group: "personal",
    tagline: "Homeowners & property coverage",
    fields: [
      { name: "propertyType", label: "Property type", type: "select", options: ["Single family", "Condo", "Townhouse", "Multi-family"] },
      { name: "ownership", label: "Own or rent?", type: "select", options: ["Own", "Rent"], required: true },
      { name: "yearBuilt", label: "Year built", type: "number" },
      { name: "squareFeet", label: "Square footage", type: "number" },
      { name: "roofAge", label: "Roof age (years)", type: "number" },
      { name: "currentlyInsured", label: "Currently insured?", type: "boolean" },
      { name: "currentCarrier", label: "Current carrier", type: "text" },
      { name: "claimsHistory", label: "Claims in last 5 years?", type: "boolean" },
      { name: "bundleAuto", label: "Interested in bundling with auto?", type: "boolean" },
      { name: "desiredStartDate", label: "Desired effective date", type: "date" },
    ],
  },
  {
    slug: "renters",
    label: "Renters",
    group: "personal",
    tagline: "Protect your belongings",
    fields: [
      { name: "propertyType", label: "Dwelling type", type: "select", options: ["Apartment", "Condo", "House"] },
      { name: "personalPropertyValue", label: "Estimated belongings value ($)", type: "number" },
      { name: "currentlyInsured", label: "Currently insured?", type: "boolean" },
      { name: "desiredStartDate", label: "Desired start date", type: "date" },
    ],
  },
  {
    slug: "life",
    label: "Life",
    group: "life",
    tagline: "Term, whole & final expense",
    fields: [
      { name: "age", label: "Age", type: "number", required: true },
      { name: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Prefer not to say"] },
      { name: "coverageAmount", label: "Coverage amount ($)", type: "number", required: true },
      { name: "termLength", label: "Term length", type: "select", options: ["10 years", "20 years", "30 years", "Whole life", "Final expense"] },
      { name: "tobacco", label: "Tobacco use?", type: "boolean" },
      { name: "healthRating", label: "Self-rated health", type: "select", options: ["Excellent", "Good", "Average", "Poor"] },
      { name: "majorConditions", label: "Any major health conditions?", type: "boolean" },
      { name: "purpose", label: "Primary purpose", type: "select", options: ["Family protection", "Mortgage protection", "Final expense", "Business"] },
    ],
  },
  {
    slug: "commercial",
    label: "Commercial / Business",
    group: "commercial",
    tagline: "GL, workers comp, BOP, commercial auto",
    fields: [
      { name: "businessName", label: "Business name", type: "text", required: true },
      { name: "industry", label: "Industry", type: "text", required: true, placeholder: "e.g. Restaurant, Contractor" },
      { name: "yearsInBusiness", label: "Years in business", type: "number" },
      { name: "annualRevenue", label: "Annual revenue ($)", type: "number" },
      { name: "payroll", label: "Annual payroll ($)", type: "number" },
      { name: "employeesCount", label: "Number of employees", type: "number" },
      { name: "vehiclesCount", label: "Number of vehicles", type: "number" },
      {
        name: "coverageNeeded",
        label: "Coverage needed",
        type: "select",
        options: [
          "General liability",
          "Workers comp",
          "Commercial auto",
          "Business owner policy (BOP)",
          "Commercial property",
          "Professional liability",
          "Cyber liability",
        ],
      },
      { name: "currentCarrier", label: "Current carrier", type: "text" },
      { name: "claimsHistory", label: "Claims in last 5 years?", type: "boolean" },
      { name: "renewalDate", label: "Policy renewal date", type: "date" },
      { name: "urgency", label: "How soon do you need coverage?", type: "select", options: ["Immediately", "Within 30 days", "1-3 months", "Just researching"] },
    ],
  },
];

export const PRODUCT_BY_SLUG: Record<string, ProductDef> = Object.fromEntries(
  PRODUCTS.map((p) => [p.slug, p]),
);

export function getProduct(slug: string): ProductDef | undefined {
  return PRODUCT_BY_SLUG[slug];
}
