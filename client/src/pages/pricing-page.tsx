import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Star, ArrowRight, Zap, Shield, Headphones } from "lucide-react";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Unisucursal Básico",
      description: "Ideal para pequeños negocios que inician",
      monthlyPrice: 27,
      annualPrice: 270,
      features: [
        "Hasta 100 productos",
        "1 usuario",
        "1 sucursal",
        "Punto de Venta completo",
        "Reportes de Compras y Ventas",
        "Gestión de Proveedores",
        "Control de Inventarios",
        "Cierre de Cajas",
        "Soporte por email",
      ],
      isPopular: false,
      ctaText: "Comenzar Prueba",
      ctaVariant: "outline" as const,
    },
    {
      name: "Unisucursal Pro",
      description: "Para negocios en crecimiento",
      monthlyPrice: 44,
      annualPrice: 440,
      features: [
        "Hasta 500 productos",
        "2 usuarios",
        "2 sucursales",
        "Punto de Venta avanzado",
        "Reportes completos",
        "Gestión de Proveedores",
        "Control de Inventarios",
        "Cierre de Cajas",
        "Facturación (costo extra)",
        "Soporte prioritario",
      ],
      isPopular: false,
      ctaText: "Comenzar Prueba",
      ctaVariant: "outline" as const,
    },
    {
      name: "Profesional",
      description: "La opción más popular para medianos negocios",
      monthlyPrice: 63,
      annualPrice: 630,
      features: [
        "Hasta 1,000 productos",
        "6 usuarios",
        "3 sucursales",
        "Punto de Venta completo",
        "Reportes de Costos",
        "Estado de Resultados",
        "Control de Inventarios",
        "Cierre de Cajas",
        "Facturación (costo extra)",
        "Soporte telefónico",
      ],
      isPopular: true,
      ctaText: "Comenzar Ahora",
      ctaVariant: "default" as const,
    },
    {
      name: "Empresarial",
      description: "Para grandes empresas",
      monthlyPrice: 89,
      annualPrice: 833,
      features: [
        "Hasta 5,000 productos",
        "12 usuarios",
        "6 sucursales",
        "Punto de Venta empresarial",
        "Reportes de Costos",
        "Estado de Resultados",
        "Balance General",
        "Nóminas",
        "Facturación (costo extra)",
        "Soporte 24/7",
        "Gerente de cuenta dedicado",
      ],
      isPopular: false,
      ctaText: "Contactar Ventas",
      ctaVariant: "outline" as const,
    },
  ];

  const savings = (monthlyPrice: number, annualPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const saved = monthlyCost - annualPrice;
    const percentage = Math.round((saved / monthlyCost) * 100);
    return { saved, percentage };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">
                Caja SAS Enterprise
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setLocation("/auth")}>
                Iniciar Sesión
              </Button>
              <Button onClick={() => setLocation("/auth")}>
                Prueba Gratis
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Planes Modernos y Flexibles
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Elige el plan que mejor se adapte a tu negocio. Todos incluyen 7
            días de prueba gratuita y soporte en español.
          </p>

          {/* Annual Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <Label htmlFor="annual-toggle" className="text-sm font-medium">
              Mensual
            </Label>
            <Switch
              id="annual-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="annual-toggle" className="text-sm font-medium">
              Anual
            </Label>
            <Badge
              variant="secondary"
              className="ml-2 bg-green-100 text-green-700"
            >
              Ahorra hasta 17%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const period = isAnnual ? "año" : "mes";
            const savingsData = savings(plan.monthlyPrice, plan.annualPrice);

            return (
              <Card
                key={index}
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  plan.isPopular
                    ? "border-primary shadow-lg scale-105"
                    : "border-gray-200 hover:border-primary/50"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1 flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Más Popular</span>
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {plan.description}
                  </CardDescription>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ${price.toLocaleString()}
                      </span>
                      <span className="text-gray-600 ml-1">/{period}</span>
                    </div>

                    {isAnnual && (
                      <div className="mt-2">
                        <span className="text-sm text-green-600 font-medium">
                          Ahorras ${savingsData.saved.toLocaleString()} (
                          {savingsData.percentage}%)
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <Button
                      className={`w-full ${plan.isPopular ? "bg-primary hover:bg-primary/90" : ""}`}
                      variant={plan.ctaVariant}
                      onClick={() => setLocation("/auth")}
                    >
                      {plan.ctaText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    {/* Payment buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const planMapping = {
                            'Unisucursal Básico': 'basic',
                            'Unisucursal Pro': 'pro', 
                            'Profesional': 'professional',
                            'Empresarial': 'enterprise'
                          };
                          const planId = planMapping[plan.name as keyof typeof planMapping];
                          setLocation(`/subscribe?plan=${planId}&interval=month`);
                        }}
                      >
                        Pagar Mensual
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const planMapping = {
                            'Unisucursal Básico': 'basic',
                            'Unisucursal Pro': 'pro',
                            'Profesional': 'professional', 
                            'Empresarial': 'enterprise'
                          };
                          const planId = planMapping[plan.name as keyof typeof planMapping];
                          setLocation(`/subscribe?plan=${planId}&interval=year`);
                        }}
                      >
                        Pagar Anual
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir Caja SAS Enterprise?
            </h2>
            <p className="text-lg text-gray-600">
              La solución más completa para gestionar tu negocio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Rápido y Confiable
              </h3>
              <p className="text-gray-600">
                Sistema optimizado para el mercado con actualizaciones
                automáticas
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Datos Seguros
              </h3>
              <p className="text-gray-600">
                Base de datos aislada por cliente con respaldos automáticos
                diarios
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Soporte en Español
              </h3>
              <p className="text-gray-600">
                Equipo de soporte técnico disponible por chat
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-gradient-to-r from-primary to-primary/80 rounded-2xl py-16 px-8 text-white">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para transformar tu negocio?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a más de 1,000 empresas que confían en nosotros
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-gray-100"
              onClick={() => setLocation("/auth")}
            >
              Comenzar Prueba Gratuita
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              Contactar Ventas
            </Button>
          </div>
          <p className="text-sm text-blue-200 mt-4">
            7 días gratis • Sin tarjeta de crédito • Cancela cuando quieras
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-gray-600">
                Sí, puedes actualizar o degradar tu plan en cualquier momento.
                Los cambios se reflejan en tu siguiente facturación.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Qué incluye la facturación electrónica?
              </h3>
              <p className="text-gray-600">
                La facturación está disponible como módulo adicional con costo
                por timbre según tarifas del SAT.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Hay penalización por cancelación?
              </h3>
              <p className="text-gray-600">
                No, puedes cancelar tu suscripción en cualquier momento sin
                penalizaciones. Solo pagas por el tiempo utilizado.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Incluye capacitación?
              </h3>
              <p className="text-gray-600">
                Todos los planes incluyen videos tutoriales. Los planes
                Profesional y Empresarial incluyen capacitación personalizada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Caja SAS Enterprise. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
