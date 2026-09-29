import { formatSetDuration } from "../index";

describe("formatSetDuration", () => {
  it("keeps short holds in seconds", () => {
    expect(formatSetDuration(45)).toBe("45s");
    expect(formatSetDuration(0)).toBe("0s");
  });

  it("shows whole minutes as minutes", () => {
    expect(formatSetDuration(60)).toBe("1 min");
    expect(formatSetDuration(1200)).toBe("20 min");
  });

  it("keeps leftover seconds past a minute", () => {
    expect(formatSetDuration(90)).toBe("1 min 30s");
  });

  it("rounds fractional seconds", () => {
    expect(formatSetDuration(59.6)).toBe("1 min");
  });
});
