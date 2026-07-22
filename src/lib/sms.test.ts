import { describe, it, expect } from "vitest";
import { parseSmsKeyword } from "./sms";

describe("parseSmsKeyword", () => {
  it("recognizes opt-out keywords case/punctuation-insensitively", () => {
    for (const w of ["STOP", "stop", " Stop! ", "unsubscribe", "CANCEL", "quit", "end", "stopall"]) {
      expect(parseSmsKeyword(w)).toBe("opt_out");
    }
  });

  it("recognizes opt-in keywords", () => {
    for (const w of ["START", "start", "Yes", "unstop"]) {
      expect(parseSmsKeyword(w)).toBe("opt_in");
    }
  });

  it("recognizes help keywords", () => {
    expect(parseSmsKeyword("HELP")).toBe("help");
    expect(parseSmsKeyword("info")).toBe("help");
  });

  it("returns none for unrelated messages or empty input", () => {
    expect(parseSmsKeyword("hello there")).toBe("none");
    expect(parseSmsKeyword("")).toBe("none");
    expect(parseSmsKeyword("   ")).toBe("none");
  });
});
