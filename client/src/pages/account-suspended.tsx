import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CreditCard, Phone } from "lucide-react";
import { Link } from "wouter";

export default function AccountSuspended() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 dark:border-red-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-red-600 dark:text-red-400">
            Cuenta Suspendida
          </CardTitle>
          <CardDescription>
            Tu cuenta ha sido pausada por falta de pago
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Para continuar utilizando Caja SAS Enterprise, necesitas activar un plan de suscripción.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-center">¿Qué puedes hacer?</h3>
            
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/subscription-plans">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ver Planes de Suscripción
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <a href="https://wa.me/524371370900" target="_blank" rel="noopener noreferrer">
                  <Phone className="w-4 h-4 mr-2" />
                  Contactar Soporte
                </a>
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>¿Necesitas ayuda?</p>
            <p>Contáctanos al <span className="font-semibold">+52 437 137 0900</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}