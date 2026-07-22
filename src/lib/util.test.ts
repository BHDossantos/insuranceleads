import { describe, it, expect } from "vitest";
import {
  csvToList,
  listToCsv,
  normalizeEmail,
  normalizePhone,
  isValidEmail,
  isValidPhone,
  safeJson,
} from "./util";

describe("csv helpers", () => {
  it("parses and trims CSV into a list", () => {
    expect(csvToList("MA, NH ,RI")).toEqual(["MA", "NH", "RI"]);
    expect(csvToList("")).toEqual([]);
    expect(csvToList(null)).toEqual([]);
  });
  it("round-trips list <-> csv", () => {
    expect(listToCsv(["MA", " NH ", "", "RI"])).toBe("MA,NH,RI");
  });
});

describe("normalizers", () => {
  it("lowercases and trims emails", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("strips non-digits from phones", () => {
    expect(normalizePhone("(617) 555-1234")).toBe("6175551234");
  });
  it("canonicalizes 11-digit US numbers to 10 digits (drops leading 1)", () => {
    expect(normalizePhone("+1 (617) 555-1234")).toBe("6175551234");
    expect(normalizePhone("16175551234")).toBe("6175551234");
    expect(normalizePhone("6175551234")).toBe("6175551234");
    // 11 digits not starting with 1 is left as-is (invalid US)
    expect(normalizePhone("26175551234")).toBe("26175551234");
  });
});

describe("validators", () => {
  it("validates emails", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
  it("validates US phone numbers (canonicalized)", () => {
    expect(isValidPhone("6175551234")).toBe(true);
    expect(isValidPhone("16175551234")).toBe(true);
    expect(isValidPhone("(617) 555-1234")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("26175551234")).toBe(false);
  });
});

describe("safeJson", () => {
  it("parses valid json", () => {
    expect(safeJson('{"a":1}', {})).toEqual({ a: 1 });
  });
  it("falls back on invalid json", () => {
    expect(safeJson("not json", { fallback: true })).toEqual({ fallback: true });
    expect(safeJson(null, [])).toEqual([]);
  });
});
