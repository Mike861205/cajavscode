import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, Crown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function SubscriptionTimer() {
  const { subscription, isLoading } = useSubscription();
  const [, setLocation] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!subscription) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const endDate = subscription.isTrial 
        ? new Date(subscription.trialEndsAt!).getTime()
        : new Date(subscription.subscriptionEndsAt!).getTime();
      
      const difference = endDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [subscription]);

  useEffect(() => {
    // Show dialog when subscription is expired or about to expire
    if (subscription && (subscription.isExpired || subscription.daysRemaining <= 1)) {
      setShowDialog(true);
    }
  }, [subscription]);

  if (isLoading || !subscription) {
    return null;
  }

  const getPlanDisplayName = (plan: string) => {
    const planNames = {
      trial: "Prueba Gratuita",
      basic: "Básico",
      pro: "Pro", 
      professional: "Profesional",
      enterprise: "Empresarial"
    };
    return planNames[plan as keyof typeof planNames] || plan;
  };

  const getStatusColor = () => {
    if (subscription.isExpired) return "bg-red-500";
    if (subscription.daysRemaining <= 3) return "bg-orange-500";
    if (subscription.isTrial) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (subscription.isExpired) {
      return "Expirado";
    }
    
    if (subscription.isTrial) {
      return `Prueba: ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    }
    
    return `${getPlanDisplayName(subscription.plan)}: ${timeRemaining.days}d ${timeRemaining.hours}h`;
  };

  const handleUpgrade = () => {
    setShowDialog(false);
    setLocation("/pricing");
  };

  return (
    <>
      <div className="flex items-center space-x-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-gray-600">{getStatusText()}</span>
        {(subscription.isTrial || subscription.daysRemaining <= 7) && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs px-2 py-1 h-6"
            onClick={() => setLocation("/pricing")}
          >
            <Crown className="w-3 h-3 mr-1" />
            Actualizar
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>
                {subscription.isExpired ? "Suscripción Expirada" : "Suscripción por Vencer"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {subscription.isExpired 
                ? "Tu suscripción ha expirado. Para continuar usando el sistema, necesitas renovar tu plan."
                : `Tu ${subscription.isTrial ? "prueba gratuita" : "suscripción"} vence en ${subscription.daysRemaining} días. Renueva ahora para evitar interrupciones.`
              }
            </p>
            
            {subscription.isExpired && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-red-800 text-sm">
                  <strong>Sistema bloqueado:</strong> No puedes acceder a ningún módulo hasta que renueves tu suscripción.
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={handleUpgrade} className="flex-1">
                <Crown className="w-4 h-4 mr-2" />
                Ver Planes
              </Button>
              {!subscription.isExpired && (
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Recordar Después
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}