import { describe, expect, it } from "vitest";
import { PRODUCTS } from "./products";
import { initialQuoteProduct, reviewDetails, validateQuoteContact } from "./quoteReview";

const contact = { firstName: "Test", lastName: "Visitor", email: " test@example.test ", phone: "+1 (617) 555-0123", state: "MA", zip: "02110" };
describe("quote review", () => {
  it("only skips product selection for a known product", () => {
    for (const p of PRODUCTS) expect(initialQuoteProduct(p.slug)).toBe(p.slug);
    for (const invalid of [null, "", "unknown", "constructor", "__proto__"]) expect(initialQuoteProduct(invalid)).toBe("");
  });
  it("uses server-compatible phone/email validation before review", () => {
    expect(validateQuoteContact(contact)).toBeNull();
    for (const phone of ["123", "226175550123", "123456789012345"]) expect(validateQuoteContact({ ...contact, phone })).toContain("phone");
    expect(validateQuoteContact({ ...contact, email: "bad" })).toContain("email");
    expect(validateQuoteContact({ ...contact, firstName: " " })).toContain("name");
    expect(validateQuoteContact({ ...contact, state: "ZZ" })).toContain("state");
    expect(validateQuoteContact({ ...contact, zip: "123" })).toContain("ZIP");
    expect(validateQuoteContact({ ...contact, zip: "02110-1234" })).toBeNull();
    expect(validateQuoteContact({ ...contact, zip: "" })).toBeNull();
  });
  it("distinguishes explicit no from unanswered and excludes stale product answers", () => {
    const rows = reviewDetails(PRODUCTS[0], { currentlyInsured: false, accidentsTickets: true, vehiclesCount: "2", lifeOnly: "secret" });
    expect(rows.find(r => r.label === "Currently insured?")?.value).toBe("No");
    expect(rows.find(r => r.label.startsWith("Accidents"))?.value).toBe("Yes");
    expect(rows.find(r => r.label === "Number of vehicles")?.value).toBe("2");
    expect(rows.find(r => r.label === "Current carrier")?.value).toBe("Not provided");
    expect(JSON.stringify(rows)).not.toContain("secret");
  });
});
