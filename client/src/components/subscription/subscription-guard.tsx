import { useSubscription } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown, Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { subscription, isLoading } = useSubscription();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Verificando suscripción...</span>
      </div>
    );
  }

  // Block access if subscription is expired or not active
  if (subscription && !subscription.canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-gray-900">
              {subscription.isTrial ? "Prueba Gratuita Expirada" : "Suscripción Expirada"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Acceso Restringido</p>
                  <p className="text-red-700 text-sm mt-1">
                    {subscription.isTrial 
                      ? "Tu período de prueba de 7 días ha terminado. Para continuar usando el sistema, necesitas elegir un plan."
                      : "Tu suscripción ha expirado. Renueva tu plan para continuar usando todas las funciones del sistema."
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/pricing")} 
                className="w-full"
              >
                <Crown className="w-4 h-4 mr-2" />
                {subscription.isTrial ? "Elegir Plan" : "Renovar Suscripción"}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Una vez que selecciones y pagues un plan, tendrás acceso inmediato al sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}