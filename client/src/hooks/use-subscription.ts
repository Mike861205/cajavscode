import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  plan: string;
  status: string;
  daysRemaining: number;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  canAccess: boolean;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute to keep timer updated
    retry: false,
  });

  return {
    subscription: subscription as SubscriptionStatus | undefined,
    isLoading,
    isActive: subscription?.isActive || false,
    isTrial: subscription?.isTrial || false,
    isExpired: subscription?.isExpired || false,
    canAccess: subscription?.canAccess || false,
    daysRemaining: subscription?.daysRemaining || 0,
    plan: subscription?.plan || 'trial',
  };
}