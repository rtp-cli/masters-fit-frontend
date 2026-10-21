import { describe, expect, it } from "@jest/globals";

import { formatPhoneAsTyped, formatPhoneDisplay, toUsE164 } from "@/utils/phone";

describe("toUsE164", () => {
  it("accepts the shapes people type", () => {
    expect(toUsE164("(312) 555-0123")).toBe("+13125550123");
    expect(toUsE164("312.555.0123")).toBe("+13125550123");
    expect(toUsE164("1 312 555 0123")).toBe("+13125550123");
    expect(toUsE164("+1 312 555 0123")).toBe("+13125550123");
  });

  it("rejects incomplete or impossible numbers", () => {
    expect(toUsE164("(312) 555-01")).toBeNull();
    expect(toUsE164("(012) 555-0123")).toBeNull();
    expect(toUsE164("(312) 155-0123")).toBeNull();
    expect(toUsE164("")).toBeNull();
  });
});

describe("formatPhoneAsTyped", () => {
  it("builds up the (xxx) xxx-xxxx mask as digits arrive", () => {
    expect(formatPhoneAsTyped("3")).toBe("(3");
    expect(formatPhoneAsTyped("3125")).toBe("(312) 5");
    expect(formatPhoneAsTyped("3125550")).toBe("(312) 555-0");
    expect(formatPhoneAsTyped("3125550123")).toBe("(312) 555-0123");
  });

  it("drops a leading country 1 and caps at 10 digits", () => {
    expect(formatPhoneAsTyped("13125550123")).toBe("(312) 555-0123");
    expect(formatPhoneAsTyped("31255501239999")).toBe("(312) 555-0123");
  });

  it("is empty when there are no digits (so backspace can clear it)", () => {
    expect(formatPhoneAsTyped("(")).toBe("");
  });
});

describe("formatPhoneDisplay", () => {
  it("formats stored E.164", () => {
    expect(formatPhoneDisplay("+13125550123")).toBe("(312) 555-0123");
    expect(formatPhoneDisplay(null)).toBe("");
  });
});
