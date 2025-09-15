import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionGuard } from "./subscription-guard";

interface SubscriptionGuardWrapperProps {
  children: React.ReactNode;
}

export function SubscriptionGuardWrapper({ children }: SubscriptionGuardWrapperProps) {
  const { subscription, isLoading } = useSubscription();

  // Show loading while checking subscription status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Verificando suscripción...</span>
      </div>
    );
  }

  // If subscription is expired or inactive, show the guard
  if (subscription && subscription.isExpired) {
    return <SubscriptionGuard>{children}</SubscriptionGuard>;
  }

  // Otherwise, render children normally
  return <>{children}</>;
}