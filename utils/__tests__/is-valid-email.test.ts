import { isValidEmail } from "@/utils";

describe("isValidEmail", () => {
  it("accepts a well-formed email", () => {
    expect(isValidEmail("rich@example.com")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects a string with no domain", () => {
    expect(isValidEmail("rich@")).toBe(false);
  });
});
