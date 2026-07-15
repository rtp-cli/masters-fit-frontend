import React, { createContext, useContext } from "react";

import { useSecretActivation } from "@/hooks/use-secret-activation";

type SecretActivationContextValue = ReturnType<typeof useSecretActivation>;

const SecretActivationContext = createContext<SecretActivationContextValue | null>(null);

export function SecretActivationProvider({ children }: { children: React.ReactNode }) {
  const value = useSecretActivation();
  return (
    <SecretActivationContext.Provider value={value}>
      {children}
    </SecretActivationContext.Provider>
  );
}

export function useSecretActivationContext(): SecretActivationContextValue {
  const ctx = useContext(SecretActivationContext);
  if (!ctx) throw new Error("useSecretActivationContext must be used within SecretActivationProvider");
  return ctx;
}
