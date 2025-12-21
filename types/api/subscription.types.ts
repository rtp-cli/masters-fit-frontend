export type BillingPeriod = "monthly" | "annual";

export interface SubscriptionPlan {
  id: number;
  planId: string; // RevenueCat product ID (e.g., "masters_fit_monthly")
  name: string; // e.g., "Monthly Premium"
  description: string | null;
  billingPeriod: BillingPeriod;
  priceUsd: number; // e.g., 9.99
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SubscriptionPlansResponse {
  success: boolean;
  plans: SubscriptionPlan[];
  error?: string;
}

export interface PaywallLimits {
  weeklyGenerations?: {
    used: number;
    limit: number;
  };
  dailyRegenerations?: {
    used: number;
    limit: number;
  };
  tokens?: {
    used: number;
    limit: number;
  };
}

export interface PaywallInfo {
  type:
    | "subscription_required"
    | "weekly_limit_exceeded"
    | "daily_limit_exceeded"
    | "feature_locked";
  message: string;
  limits?: PaywallLimits;
}

export interface PaywallErrorResponse {
  success: false;
  error: string;
  paywall: PaywallInfo;
}
