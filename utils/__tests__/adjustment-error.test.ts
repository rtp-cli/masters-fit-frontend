import { describeAdjustmentError } from "@/utils/adjustment-error";

/** Shaped like the Error `apiRequest` throws (message + status + parsed body). */
const httpError = (status: number, message = `HTTP error ${status}`) =>
  Object.assign(new Error(message), { status });

describe("describeAdjustmentError", () => {
  it("explains a 409 as a still-running adjustment, not a failure", () => {
    const copy = describeAdjustmentError(httpError(409, "Another AI job is already running"), "week");
    expect(copy.title).toBe("Still finishing your last change");
    expect(copy.description).toMatch(/still building/i);
    expect(copy.description).toMatch(/give it a minute/i);
  });

  it("explains a 429 as too many recent changes", () => {
    const copy = describeAdjustmentError(httpError(429), "week");
    expect(copy.title).toBe("Too many changes right now");
    expect(copy.description).toMatch(/few minutes/i);
  });

  it("names the offline case from a fetch TypeError", () => {
    expect(describeAdjustmentError(new TypeError("Network request failed")).title).toBe(
      "You're offline"
    );
    expect(describeAdjustmentError(new Error("Failed to fetch")).title).toBe("You're offline");
  });

  it("does not call a 5xx 'offline'", () => {
    const copy = describeAdjustmentError(httpError(500, "Internal server error"));
    expect(copy.title).toBe("Something went wrong on our end");
  });

  it("shows the server's own message for other 4xx", () => {
    const copy = describeAdjustmentError(httpError(400, "This date already has a workout scheduled"));
    expect(copy.description).toBe("This date already has a workout scheduled");
  });

  it("falls back to generic copy for a bare 4xx with no useful message", () => {
    const copy = describeAdjustmentError(httpError(418), "day");
    expect(copy.description).toBe("Your workout hasn't changed. Please try again.");
  });

  it("falls back to generic copy when there is no error object at all (result came back unsuccessful)", () => {
    const copy = describeAdjustmentError(undefined, "week");
    expect(copy.title).toBe("Couldn't start the adjustment");
    expect(copy.description).toBe("Your week hasn't changed. Please try again.");
  });

  it("uses the right noun for the scope", () => {
    expect(describeAdjustmentError(httpError(409), "week").description).toContain("your week");
    expect(describeAdjustmentError(httpError(409), "day").description).toContain("your workout");
  });

  it("always reassures that nothing changed, and never leaks jargon", () => {
    const cases: unknown[] = [
      httpError(409),
      httpError(429),
      httpError(500),
      httpError(418),
      new TypeError("Network request failed"),
      undefined,
    ];
    for (const error of cases) {
      const copy = describeAdjustmentError(error);
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.description).toMatch(/hasn't changed|try again/i);
      expect(`${copy.title} ${copy.description}`).not.toMatch(
        /CONCURRENCY_LIMIT|RATE_LIMIT|409|429|5\d\d|reservation|ai_operations/i
      );
    }
  });
});
