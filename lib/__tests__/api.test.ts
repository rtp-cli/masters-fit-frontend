jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("@/config", () => ({ API_URL: "http://test.local/api" }));

import * as SecureStore from "expo-secure-store";
import { apiRequest, setAuthFailureCallback } from "@/lib/api";

const mockedGetItemAsync = SecureStore.getItemAsync as jest.Mock;

describe("apiRequest — 401 token refresh [LR-045]", () => {
  const authFailureSpy = jest.fn();
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthFailureCallback(authFailureSpy);
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  it("refreshes the token on a 401 and retries the original request", async () => {
    mockedGetItemAsync.mockImplementation(async (key: string) => {
      if (key === "token") return "expired-token";
      if (key === "refreshToken") return "valid-refresh-token";
      return null;
    });

    fetchMock
      // 1st call: original request, gets a 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: "Unauthorized" }),
      })
      // 2nd call: the refresh request itself, succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          token: "new-token",
          refreshToken: "new-refresh-token",
        }),
      })
      // 3rd call: the retried original request, now succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: "retried-ok" }),
      });

    // After refresh, getAuthToken() is called again to fetch the new token.
    mockedGetItemAsync.mockImplementationOnce(async () => "expired-token"); // initial call inside apiRequest
    let callCount = 0;
    mockedGetItemAsync.mockImplementation(async (key: string) => {
      callCount++;
      if (key === "token") return callCount <= 1 ? "expired-token" : "new-token";
      if (key === "refreshToken") return "valid-refresh-token";
      return null;
    });

    const result = await apiRequest<{ success: boolean; data: string }>(
      "/some-endpoint"
    );

    expect(result).toEqual({ success: true, data: "retried-ok" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(authFailureSpy).not.toHaveBeenCalled();

    // The retry (3rd call) must carry the NEW token, not the expired one.
    const retryCallArgs = fetchMock.mock.calls[2];
    const retryHeaders = retryCallArgs[1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer new-token");
  });

  it("triggers the auth-failure callback and throws when the refresh request itself fails", async () => {
    mockedGetItemAsync.mockImplementation(async (key: string) => {
      if (key === "token") return "expired-token";
      if (key === "refreshToken") return "valid-refresh-token";
      return null;
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })
      // Refresh endpoint itself fails
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: "Invalid refresh token" }),
      });

    await expect(apiRequest("/some-endpoint")).rejects.toThrow(
      "Session expired"
    );
    expect(authFailureSpy).toHaveBeenCalledTimes(1);
  });

  it("triggers auth-failure immediately on a 401 with no token at all (no refresh attempt)", async () => {
    mockedGetItemAsync.mockResolvedValue(null);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });

    await expect(apiRequest("/some-endpoint")).rejects.toThrow(
      "Session expired"
    );
    expect(authFailureSpy).toHaveBeenCalledTimes(1);
    // Only the original request — no refresh attempt possible with no token.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
