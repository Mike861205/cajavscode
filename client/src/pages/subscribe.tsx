import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Shield, Lock, Star } from "lucide-react";
import { useLocation } from "wouter";
import whiteBoxImage from "@assets/20250622_2216_Logo Caja Sas Enterprise_simple_compose_01jydkcxwhejf8w0phs9jtcnxd_1750711420416.png";
import goldBoxImage from "@assets/20250622_2220_Caja Sas Enterprise Logo_simple_compose_01jydkkxm9e1b98jpdvmw5p3vz_1750711420414.png";

// Load Stripe with error handling
let stripePromise: Promise<any> | null = null;
try {
  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    console.error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
  } else {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
} catch (error) {
  console.error('Failed to load Stripe:', error);
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

const CheckoutForm = ({ selectedPlan }: { selectedPlan: SubscriptionPlan }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/success",
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Error en el pago",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Pago exitoso!",
        description: "Tu suscripción ha sido activada correctamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Badges */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center text-green-700">
            <Shield className="mr-2 h-4 w-4" />
            <span className="font-medium">Pago Seguro</span>
          </div>
          <div className="flex items-center text-green-700">
            <Lock className="mr-2 h-4 w-4" />
            <span className="font-medium">SSL Encriptado</span>
          </div>
          <div className="flex items-center text-green-700">
            <Star className="mr-2 h-4 w-4" />
            <span className="font-medium">Stripe Verificado</span>
          </div>
        </div>
        <p className="text-center text-xs text-green-600 mt-2">
          🔒 Tu información está protegida con encriptación de nivel bancario
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <PaymentElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
              },
            }}
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 text-lg"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3" />
              Procesando pago seguro...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Lock className="mr-3 h-5 w-5" />
              Confirmar Suscripción Segura - ${selectedPlan.price} USD
            </div>
          )}
        </Button>
        
        {/* Trust Indicators */}
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Procesado por Stripe</p>
          <div className="flex items-center justify-center space-x-3 text-xs text-gray-400">
            <span>256-bit SSL</span>
            <span>•</span>
            <span>PCI DSS Compliant</span>
            <span>•</span>
            <span>Cancela cuando quieras</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  // Get plan from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');
    const interval = urlParams.get('interval') as 'month' | 'year';
    
    if (planId && interval) {
      const plans = {
        basic: {
          id: 'basic',
          name: 'Unisucursal Básico',
          price: interval === 'month' ? 27 : 270,
          currency: 'usd',
          interval,
          features: [
            'Hasta 500 productos',
            '1 usuario',
            '1 sucursal', 
            'Punto de Venta avanzado',
            'Reportes Compra/Ventas'
          ],
          stripePriceId: interval === 'month' ? 'price_1RdGFjBrS7UtssxxOeUyYcNR' : 'price_1RdGGIBrS7UtssxxBi3Cvcd6'
        },
        pro: {
          id: 'pro',
          name: 'Unisucursal Pro',
          price: interval === 'month' ? 44 : 440,
          currency: 'usd',
          interval,
          features: [
            'Hasta 500 productos',
            '2 usuarios',
            '2 sucursales',
            'Punto de Venta avanzado',
            'Reportes completos'
          ],
          stripePriceId: interval === 'month' ? 'price_1RdDoMBrS7UtssxxFdfbibaI' : 'price_1RdDnRBrS7UtssxxegGJHq81'
        },
        professional: {
          id: 'professional',
          name: 'Profesional',
          price: interval === 'month' ? 63 : 630,
          currency: 'usd',
          interval,
          features: [
            'Productos ilimitados',
            '5 usuarios',
            '5 sucursales',
            'Punto de Venta avanzado',
            'Reportes avanzados',
            'Inventario físico'
          ],
          stripePriceId: interval === 'month' ? 'price_1Rd3byBrS7Utssxx96QCKxQ2' : 'price_1RdGHcBrS7UtssxxFfv9FspO'
        },
        enterprise: {
          id: 'enterprise',
          name: 'Empresarial',
          price: interval === 'month' ? 89 : 833,
          currency: 'usd',
          interval,
          features: [
            'Productos ilimitados',
            'Usuarios ilimitados',
            'Sucursales ilimitadas',
            'Punto de Venta avanzado',
            'Reportes empresariales',
            'Inventario físico',
            'Soporte prioritario'
          ],
          stripePriceId: interval === 'month' ? 'price_1RdGIDBrS7Utssxx3GyvqCJi' : 'price_1RdGIcBrS7Utssxx6YDYEJea'
        }
      };

      const plan = plans[planId as keyof typeof plans];
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, []);

  // Create subscription when plan is selected
  useEffect(() => {
    if (selectedPlan) {
      console.log('Creating subscription for plan:', selectedPlan);
      apiRequest("POST", "/api/create-subscription", {
        planId: selectedPlan.id,
        stripePriceId: selectedPlan.stripePriceId,
        interval: selectedPlan.interval
      })
        .then((res) => {
          console.log('Subscription API response status:', res.status);
          return res.json();
        })
        .then((data) => {
          console.log('Subscription data received:', data);
          
          // Handle trial subscriptions (no immediate payment needed)
          if (data.isTrial) {
            console.log('Trial subscription created successfully');
            toast({
              title: "¡Suscripción Activada!",
              description: `Período de prueba de 7 días iniciado. Tu suscripción estará activa hasta ${new Date(data.trialEnd).toLocaleDateString()}.`,
              variant: "default"
            });
            
            // Redirect to dashboard after trial activation
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 2000);
            return;
          }
          
          // Handle regular paid subscriptions
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            console.error('No client secret received:', data);
            toast({
              title: "Error",
              description: "No se pudo crear la suscripción. Intenta nuevamente.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error('Error creating subscription:', error);
          toast({
            title: "Error de Suscripción",
            description: "No se pudo procesar la suscripción. Verifique su conexión e intente nuevamente.",
            variant: "destructive",
          });
        });
    }
  }, [selectedPlan]);

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeft className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Plan no encontrado</h3>
              <p className="text-gray-600 mb-6">No se pudo cargar la información del plan seleccionado.</p>
              <Button 
                onClick={() => setLocation("/")} 
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a planes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" aria-label="Loading"/>
          <p className="text-lg font-medium text-gray-700">Preparando tu suscripción...</p>
          <p className="text-sm text-gray-500 mt-2">Configurando pago seguro con Stripe</p>
        </div>
      </div>
    );
  }

  const getBoxImage = () => {
    if (selectedPlan?.id === 'professional' || selectedPlan?.id === 'enterprise') {
      return goldBoxImage;
    }
    return whiteBoxImage;
  };

  const getPlanColor = () => {
    switch (selectedPlan?.id) {
      case 'basic': return 'from-green-400 to-green-600';
      case 'pro': return 'from-blue-400 to-blue-600';
      case 'professional': return 'from-purple-400 to-purple-600';
      case 'enterprise': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Plan Information */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <Button 
                  onClick={() => setLocation("/")} 
                  variant="ghost" 
                  className="mb-6 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a planes
                </Button>
                
                <div className={`bg-gradient-to-r ${getPlanColor()} rounded-xl p-6 text-white mb-6 shadow-lg`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedPlan?.name}</h2>
                      <p className="text-white/90 mt-1">{selectedPlan?.interval === 'month' ? 'Suscripción Mensual' : 'Suscripción Anual'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">${selectedPlan?.price} USD</div>
                      <div className="text-white/80">/{selectedPlan?.interval === 'month' ? 'mes' : 'año'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Check className="mr-2 h-5 w-5 text-green-500" />
                    Características incluidas:
                  </h3>
                  {selectedPlan?.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-gray-600">
                      <Check className="mr-3 h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Product Box Image */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center shadow-inner">
                  <img 
                    src={getBoxImage()} 
                    alt="Caja SAS Enterprise" 
                    className="w-32 h-32 mx-auto object-contain mb-4 drop-shadow-lg"
                  />
                  <p className="text-sm text-gray-700 font-medium">
                    {selectedPlan?.id === 'professional' || selectedPlan?.id === 'enterprise' 
                      ? '🏆 Edición Premium Dorada' 
                      : '💎 Edición Estándar'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sistema completo de punto de venta
                  </p>
                  <div className="mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    💰 Pago en Dólares Americanos (USD)
                  </div>
                  <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    📱 Soporte WhatsApp: 624-137-0820
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                    <Lock className="mr-2 h-5 w-5 text-blue-500" />
                    Información de Pago Seguro
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Procesamiento seguro con encriptación de nivel bancario
                  </p>
                </div>
                
                <CheckoutForm selectedPlan={selectedPlan} />
              </div>
            </div>
          </Elements>
        </div>
      </div>
    </div>
  );
}