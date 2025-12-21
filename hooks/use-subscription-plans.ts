import { useState, useEffect, useCallback } from "react";
import { fetchSubscriptionPlans } from "@/lib/api";
import { SubscriptionPlan } from "@/types/api";

interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscriptionPlans(): UseSubscriptionPlansReturn {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSubscriptionPlans();

      if (result.success) {
        setPlans(result.plans);
      } else {
        setError(result.error || "Failed to fetch subscription plans");
        setPlans([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch subscription plans";
      setError(errorMessage);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    isLoading,
    error,
    refetch: fetchPlans,
  };
}
