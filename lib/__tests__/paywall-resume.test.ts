import {
  clearPendingResume,
  runPendingResume,
  setPendingResume,
} from "../paywall-resume";

describe("paywall-resume registry", () => {
  afterEach(() => {
    clearPendingResume();
  });

  it("runs the armed thunk on runPendingResume", () => {
    const fn = jest.fn();
    setPendingResume(fn);
    runPendingResume();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("is single-shot — a second run does not re-fire the thunk", () => {
    const fn = jest.fn();
    setPendingResume(fn);
    runPendingResume();
    runPendingResume();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nothing is armed", () => {
    expect(() => runPendingResume()).not.toThrow();
  });

  it("clearPendingResume disarms the thunk", () => {
    const fn = jest.fn();
    setPendingResume(fn);
    clearPendingResume();
    runPendingResume();
    expect(fn).not.toHaveBeenCalled();
  });

  it("a newer arm overwrites the previous thunk", () => {
    const first = jest.fn();
    const second = jest.fn();
    setPendingResume(first);
    setPendingResume(second);
    runPendingResume();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
