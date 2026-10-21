import { useCallback, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { startAddContactAPI, verifyAddContactAPI } from "@/lib/api";
import { isValidEmail } from "@/utils";
import { toUsE164 } from "@/utils/phone";

export type ContactKind = "email" | "phone";

/**
 * Settings "Add email" / "Add phone": enter it → we send a code → enter the
 * code → it's attached to this account (one account, both identifiers).
 *
 * The backend refuses an email or number that's already on another account
 * (TAKEN) before sending anything, so nobody waits on a code they can't use.
 */
export function useAddContact(kind: ContactKind, onDone: () => void) {
  const { user, setUserData } = useAuth();
  const [step, setStep] = useState<"enter" | "code">("enter");
  // The normalized value the code was sent to (email lowercased, phone E.164).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const contactFor = (value: string) =>
    kind === "email" ? { email: value } : { phone: value };

  const sendCode = useCallback(
    async (raw: string) => {
      const value =
        kind === "email" ? raw.trim().toLowerCase() : toUsE164(raw);
      if (!value || (kind === "email" && !isValidEmail(value))) {
        setError(
          kind === "email"
            ? "That doesn’t look like an email address."
            : "Enter a 10-digit US or Canadian mobile number.",
        );
        return;
      }

      setError("");
      setIsBusy(true);
      try {
        const res = await startAddContactAPI(contactFor(value));
        if (res.success) {
          setSentTo(value);
          setStep("code");
        } else {
          setError(res.error ?? "We couldn’t send your code. Try again.");
        }
      } finally {
        setIsBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!sentTo) return;
      setError("");
      setIsBusy(true);
      try {
        const res = await verifyAddContactAPI({ ...contactFor(sentTo), code });
        if (res.success && res.user && user) {
          // Merge rather than replace: the server's user payload doesn't carry
          // client-only fields (uuid, needsOnboarding) the app relies on.
          await setUserData({
            ...user,
            email: res.user.email,
            phone: res.user.phone,
          });
          onDone();
        } else if (res.errorCode === "EXPIRED_CODE" || res.errorCode === "CODE_EXHAUSTED") {
          setError(res.error ?? "That code has expired. Send a new one.");
        } else {
          setError(res.error ?? "That code didn’t match.");
        }
      } finally {
        setIsBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sentTo, user, setUserData, onDone],
  );

  const reset = useCallback(() => {
    setStep("enter");
    setSentTo(null);
    setError("");
  }, []);

  return { step, sentTo, isBusy, error, sendCode, verifyCode, reset, setError };
}
