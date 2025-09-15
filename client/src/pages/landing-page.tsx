import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScanBarcode,
  Boxes,
  ChartLine,
  File,
  ShoppingCart,
  Cloud,
  Check,
  Rocket,
  Play,
  Menu,
  X,
  Bot,
  Calendar,
  MessageSquare,
  Mic,
  Video,
  Star,
  Quote,
} from "lucide-react";

// Importar las imágenes de testimonios
import testimonialImage1 from "@assets/20250702_1023_Mujer Empresaria Organizada_simple_compose_01jz62h2nnemvs2q7ef5cx89jr_1751477159018.png";
import testimonialImage2 from "@assets/20250702_1018_Mecánico y Caja Sas_simple_compose_01jz628yj5ez2avk8v3e3z4746_1751477159019.png";
import testimonialImage3 from "@assets/20250702_1014_Sistema Empresarial Eficiente_simple_compose_01jz620hwses89m8sm3fpfxq1w_1751477159020.png";


export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados para la animación del demo
  const [demoStep, setDemoStep] = useState(0);
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const [showAiResponse, setShowAiResponse] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);

  const fullUserMessage = "Crear cita para María García teléfono 555-1234 el 2025-07-10 a las 14:30 para consulta de productos";
  const fullAiResponse = "✅ Cita creada exitosamente";

  useEffect(() => {
    if (demoStep === 0) {
      // Iniciar la animación automáticamente
      const timer = setTimeout(() => setDemoStep(1), 2000);
      return () => clearTimeout(timer);
    }

    if (demoStep === 1) {
      // Simular escritura del usuario
      let currentText = "";
      const interval = setInterval(() => {
        if (currentText.length < fullUserMessage.length) {
          currentText += fullUserMessage[currentText.length];
          setUserMessage(currentText);
        } else {
          clearInterval(interval);
          setDemoStep(2);
        }
      }, 50); // Velocidad de escritura
      return () => clearInterval(interval);
    }

    if (demoStep === 2) {
      // Mostrar indicador de escritura de IA
      setShowTyping(true);
      const timer = setTimeout(() => {
        setShowTyping(false);
        setDemoStep(3);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (demoStep === 3) {
      // Mostrar respuesta de IA
      setShowAiResponse(true);
      let currentText = "";
      const interval = setInterval(() => {
        if (currentText.length < fullAiResponse.length) {
          currentText += fullAiResponse[currentText.length];
          setAiResponse(currentText);
        } else {
          clearInterval(interval);
          setDemoStep(4);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    if (demoStep === 4) {
      // Mostrar aparición en calendario
      const timer = setTimeout(() => {
        setShowCalendar(true);
        setDemoStep(5);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (demoStep === 5) {
      // Mostrar aparición en registro
      const timer = setTimeout(() => {
        setShowRegistry(true);
        setDemoStep(6);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (demoStep === 6) {
      // Reiniciar la animación después de un tiempo
      const timer = setTimeout(() => {
        setUserMessage("");
        setAiResponse("");
        setShowTyping(false);
        setShowAiResponse(false);
        setShowCalendar(false);
        setShowRegistry(false);
        setDemoStep(1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [demoStep]);

  const features = [
    {
      icon: ScanBarcode,
      title: "Punto de Venta",
      description:
        "Sistema POS completo con interfaz táctil, gestión de productos, descuentos y múltiples formas de pago.",
      highlights: [
        "Interfaz táctil moderna",
        "Múltiples formas de pago",
        "Gestión de descuentos",
      ],
    },
    {
      icon: Boxes,
      title: "Gestión de Inventario",
      description:
        "Control total de stock, alertas de inventario bajo, códigos de barras y categorización avanzada.",
      highlights: [
        "Control de stock en tiempo real",
        "Códigos de barras",
        "Alertas automáticas",
      ],
    },
    {
      icon: ChartLine,
      title: "Reportes y Ventas",
      description:
        "Análisis detallado de ventas, gráficos interactivos y reportes personalizables para tomar decisiones informadas.",
      highlights: [
        "Dashboards interactivos",
        "Reportes personalizables",
        "Análisis de tendencias",
      ],
    },
    {
      icon: File,
      title: "Facturación",
      description:
        "Genera facturas profesionales, notas de crédito y maneja la contabilidad básica de tu negocio.",
      highlights: [
        "Facturas profesionales",
        "Notas de crédito",
        "Contabilidad básica",
      ],
    },
    {
      icon: ShoppingCart,
      title: "Gestión de Compras",
      description:
        "Administra proveedores, órdenes de compra y controla los costos de adquisición de productos.",
      highlights: [
        "Gestión de proveedores",
        "Órdenes de compra",
        "Control de costos",
      ],
    },
    {
      icon: Cloud,
      title: "Multi-Tenant",
      description:
        "Cada licencia con su propia base de datos aislada. Seguridad y privacidad garantizada.",
      highlights: [
        "Datos completamente aislados",
        "Subdominio personalizado",
        "Escalabilidad garantizada",
      ],
    },
  ];

  const plans = [
    {
      name: "Unisucursal Básico",
      price: 27,
      annualPrice: 270,
      description: "Ideal para pequeños negocios que inician",
      features: [
        "Hasta 100 productos",
        "1 usuario",
        "1 sucursal",
        "Punto de Venta",
        "Reportes Compras/Ventas",
        "Gestión de Proveedores",
        "Control de Inventarios",
        "Cierre de Cajas",
      ],
      popular: false,
    },
    {
      name: "Unisucursal Pro",
      price: 44,
      annualPrice: 440,
      description: "Para negocios en crecimiento",
      features: [
        "Hasta 500 productos",
        "2 usuarios",
        "2 sucursales",
        "Punto de Venta avanzado",
        "Reportes completos",
        "Gestión de Proveedores",
        "Control de Inventarios",
        "Facturación (costo extra)",
        "Soporte prioritario",
      ],
      popular: false,
    },
    {
      name: "Profesional",
      price: 63,
      annualPrice: 630,
      description: "Perfecto para medianos negocios",
      features: [
        "Hasta 1,000 productos",
        "6 usuarios",
        "3 sucursales",
        "Punto de Venta completo",
        "Reportes de Costos",
        "Estado de Resultados",
        "Control de Inventarios",
        "Facturación (costo extra)",
      ],
      popular: true,
    },
    {
      name: "Empresarial",
      price: 89,
      annualPrice: 833,
      description: "Para grandes empresas",
      features: [
        "Hasta 5,000 productos",
        "12 usuarios",
        "6 sucursales",
        "Punto de Venta empresarial",
        "Balance General",
        "Nóminas",
        "Facturación (costo extra)",
        "Soporte 24/7",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">
                Caja Sas Enterprise
              </h1>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a
                  href="#features"
                  className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Módulos
                </a>
                <a
                  href="#pricing"
                  className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Precios
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/admin/login")}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Suscriptores
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLocation("/auth")}
                >
                  Iniciar Sesión
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-200/50"
                  onClick={() => setLocation("/auth")}
                >
                  Sistema Gratis × 7 Días
                </Button>
              </div>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a
                  href="#features"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary"
                >
                  Módulos
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary"
                >
                  Precios
                </a>
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/auth")}
                  >
                    Iniciar Sesión
                  </Button>
                  <Button
                    className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-200/50"
                    onClick={() => setLocation("/auth")}
                  >
                    Sistema Gratis × 7 Días
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary to-primary/80 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Sistema de Gestión <br />
              <span className="text-yellow-300">Todo en Uno</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Caja Sas Enterprise es la solución multi-tenant completa para
              gestionar tu negocio. Punto de venta, inventario, facturación,
              reportes y más en una sola plataforma.
            </p>
            <div className="flex justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold px-10 py-6 text-xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-4 border-yellow-200/50"
                onClick={() => setLocation("/auth")}
              >
                <Rocket className="mr-3 h-6 w-6" />
                SISTEMA GRATIS × 7 DÍAS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo de Asistente IA Section */}
      <div className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="h-12 w-12 text-blue-600" />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Asistente IA Integrado
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Crea citas, gestiona productos y procesa ventas usando comandos de voz o texto natural
            </p>
            <Badge variant="secondary" className="px-4 py-2 mt-4">
              <Bot className="h-4 w-4 mr-2" />
              Powered by GPT-4o
            </Badge>
          </div>

          {/* Demo Interactivo */}
          <div className="max-w-5xl mx-auto">
            <Card className="overflow-hidden shadow-2xl border-0">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center gap-3">
                  <Video className="h-6 w-6" />
                  <h3 className="text-xl font-semibold">Demo: Creación de Citas con IA</h3>
                  <div className="ml-auto flex gap-1">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">En línea</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-blue-100">
                    Observa cómo nuestro asistente IA crea citas automáticamente usando comandos naturales
                  </p>
                  {demoStep === 0 && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-yellow-200">Iniciando demo...</span>
                    </div>
                  )}
                  {demoStep > 0 && demoStep < 6 && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-200">Demo en vivo</span>
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Interfaz de Chat Simulada */}
                <div className="bg-white rounded-lg shadow-lg border mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="h-6 w-6" />
                      <span className="font-semibold">Asistente IA - Caja SAS Enterprise</span>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4 min-h-[300px]">
                    {/* Mensaje del Usuario - Animado */}
                    {userMessage && (
                      <div className="flex justify-end animate-in slide-in-from-right duration-500">
                        <div className="bg-blue-500 text-white rounded-lg p-3 max-w-md">
                          <p className="text-sm">
                            {userMessage}
                            {demoStep === 1 && <span className="animate-pulse">|</span>}
                          </p>
                          <p className="text-xs opacity-75 mt-1">15:30</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Indicador de escritura de IA */}
                    {showTyping && (
                      <div className="flex justify-start animate-in slide-in-from-left duration-500">
                        <div className="bg-gray-100 border rounded-lg p-4 max-w-md">
                          <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-blue-600 animate-pulse" />
                            <span className="text-sm text-gray-600">Asistente IA está escribiendo</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Respuesta de la IA - Animada */}
                    {showAiResponse && (
                      <div className="flex justify-start animate-in slide-in-from-left duration-500">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">Asistente IA</span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-green-800">
                              {aiResponse}
                              {demoStep === 3 && <span className="animate-pulse">|</span>}
                            </p>
                            {demoStep > 3 && (
                              <div className="bg-white rounded-md p-3 text-sm animate-in fade-in duration-1000">
                                <p><span className="font-semibold">Cliente:</span> María García</p>
                                <p><span className="font-semibold">Teléfono:</span> 555-1234</p>
                                <p><span className="font-semibold">Fecha:</span> 10 de julio 2025</p>
                                <p><span className="font-semibold">Hora:</span> 2:30 PM</p>
                                <p><span className="font-semibold">Motivo:</span> Consulta de productos</p>
                              </div>
                            )}
                            {demoStep > 3 && (
                              <p className="text-xs text-green-600 animate-in fade-in duration-1000 delay-500">
                                La cita aparece automáticamente en el calendario y registro
                              </p>
                            )}
                          </div>
                          {demoStep > 3 && (
                            <p className="text-xs text-gray-500 mt-2">15:31</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resultados Visuales - Animados */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`bg-blue-50 rounded-lg p-4 border border-blue-200 transition-all duration-1000 ${
                    showCalendar ? 'animate-in slide-in-from-bottom opacity-100 transform-none' : 'opacity-50 transform translate-y-4'
                  }`}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Aparece en Calendario
                      {showCalendar && (
                        <div className="ml-2 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-normal">¡Actualizado!</span>
                        </div>
                      )}
                    </h4>
                    <div className={`bg-white rounded p-3 border-l-4 border-blue-500 transition-all duration-500 ${
                      showCalendar ? 'animate-in zoom-in scale-100' : 'scale-95'
                    }`}>
                      <div className="font-medium text-sm">14:30 - María García</div>
                      <div className="text-gray-600 text-xs">555-1234 • Consulta de productos</div>
                      <Badge variant="outline" className="mt-1 text-xs">Programada</Badge>
                      {showCalendar && (
                        <div className="mt-2 text-xs text-green-600 animate-in fade-in duration-1000">
                          ✓ Registrada automáticamente
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`bg-purple-50 rounded-lg p-4 border border-purple-200 transition-all duration-1000 ${
                    showRegistry ? 'animate-in slide-in-from-bottom opacity-100 transform-none' : 'opacity-50 transform translate-y-4'
                  }`}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      Registro de Citas
                      {showRegistry && (
                        <div className="ml-2 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-normal">¡Actualizado!</span>
                        </div>
                      )}
                    </h4>
                    <div className={`bg-white rounded p-3 transition-all duration-500 ${
                      showRegistry ? 'animate-in zoom-in scale-100' : 'scale-95'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">María García</div>
                          <div className="text-gray-600 text-xs">555-1234</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs">10/07/25 14:30</div>
                          <Badge variant="secondary" className="mt-1 text-xs">Programada</Badge>
                        </div>
                      </div>
                      {showRegistry && (
                        <div className="mt-2 text-xs text-purple-600 animate-in fade-in duration-1000">
                          ✓ Disponible para seguimiento
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Otros Comandos */}
                <div className="mt-8 text-center">
                  <h4 className="font-semibold text-lg mb-4">Más Funcionalidades con IA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">Ventas por Voz</span>
                      </div>
                      <p className="text-sm text-gray-600">"Vender 2 Coca Cola efectivo 30 pesos"</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-700">Gestión de Productos</span>
                      </div>
                      <p className="text-sm text-gray-600">"Crear producto Coca Cola precio 15 costo 8"</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => setLocation("/auth")}
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      Probar Asistente IA Gratis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Interactive Modules Showcase */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Módulos en Acción
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mira cómo funciona cada módulo de nuestro sistema en tiempo real
            </p>
          </div>
          
          {/* Punto de Venta Module */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm ml-4">Punto de Venta - Sistema Real</span>
                    </div>
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Venta Rápida</h3>
                        <div className="flex space-x-2">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">En línea</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Caja #1</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-200 rounded-lg mx-auto mb-2"></div>
                            <p className="text-sm font-medium">Coca Cola</p>
                            <p className="text-xs text-gray-600">$25.00</p>
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-green-200 rounded-lg mx-auto mb-2"></div>
                            <p className="text-sm font-medium">Sabritas</p>
                            <p className="text-xs text-gray-600">$18.50</p>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-purple-200 rounded-lg mx-auto mb-2"></div>
                            <p className="text-sm font-medium">Pan Bimbo</p>
                            <p className="text-xs text-gray-600">$32.00</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Coca Cola x2</span>
                          <span className="font-medium">$50.00</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Sabritas x1</span>
                          <span className="font-medium">$18.50</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center font-bold">
                            <span>Total:</span>
                            <span className="text-lg text-green-600">$68.50</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
                          Tarjeta
                        </button>
                        <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          Efectivo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <ScanBarcode className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Punto de Venta</h3>
                    <p className="text-gray-600">Sistema POS táctil y moderno</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Interfaz Táctil Intuitiva</h4>
                      <p className="text-gray-600 text-sm">Diseño moderno optimizado para velocidad de venta</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Múltiples Formas de Pago</h4>
                      <p className="text-gray-600 text-sm">Efectivo, tarjetas, transferencias y pagos digitales</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Gestión de Descuentos</h4>
                      <p className="text-gray-600 text-sm">Descuentos por porcentaje, cantidad fija o promociones</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Impresión de Tickets</h4>
                      <p className="text-gray-600 text-sm">Tickets térmicos y facturas automáticas</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Resultado:</strong> Ventas 3x más rápidas con interfaz optimizada para alto volumen
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventario Module */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <Boxes className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h3>
                    <p className="text-gray-600">Control total de stock en tiempo real</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Control de Stock en Tiempo Real</h4>
                      <p className="text-gray-600 text-sm">Actualización automática con cada venta y compra</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Códigos de Barras</h4>
                      <p className="text-gray-600 text-sm">Generación y lectura automática de códigos</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Alertas de Stock Bajo</h4>
                      <p className="text-gray-600 text-sm">Notificaciones automáticas para reposición</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Inventario Físico</h4>
                      <p className="text-gray-600 text-sm">Herramientas para conteos y ajustes de inventario</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Resultado:</strong> 95% precisión en inventarios y reducción de pérdidas por desabasto
                  </p>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm ml-4">Gestión de Inventario</span>
                    </div>
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Control de Stock</h3>
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">3 Alertas</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900">Coca Cola 600ml</p>
                              <p className="text-sm text-gray-600">Stock: 2 unidades</p>
                            </div>
                          </div>
                          <span className="text-red-600 font-medium">Stock Bajo</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900">Sabritas Clásicas</p>
                              <p className="text-sm text-gray-600">Stock: 45 unidades</p>
                            </div>
                          </div>
                          <span className="text-green-600 font-medium">Óptimo</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900">Pan Bimbo Integral</p>
                              <p className="text-sm text-gray-600">Stock: 8 unidades</p>
                            </div>
                          </div>
                          <span className="text-yellow-600 font-medium">Medio</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Resumen de Inventario</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total Productos:</p>
                            <p className="font-bold">1,247</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Valor Total:</p>
                            <p className="font-bold">$89,432</p>
                          </div>
                        </div>
                      </div>
                      
                      <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Realizar Inventario Físico
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reportes Module */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm ml-4">Dashboard de Reportes</span>
                    </div>
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Dashboard Ejecutivo</h3>
                        <div className="flex space-x-2">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Hoy</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-green-600 text-sm font-medium">Ventas Hoy</p>
                          <p className="text-2xl font-bold text-green-700">$4,532</p>
                          <p className="text-xs text-green-600">+12% vs ayer</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-blue-600 text-sm font-medium">Productos Vendidos</p>
                          <p className="text-2xl font-bold text-blue-700">347</p>
                          <p className="text-xs text-blue-600">+8% vs ayer</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold mb-3">Productos Más Vendidos</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Coca Cola 600ml</span>
                            <span className="font-medium">47 unidades</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Sabritas Clásicas</span>
                            <span className="font-medium">32 unidades</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Pan Bimbo</span>
                            <span className="font-medium">28 unidades</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Margen de Ganancia</span>
                          <span className="text-lg font-bold text-purple-700">34.2%</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{width: '34.2%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <ChartLine className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h3>
                    <p className="text-gray-600">Insights poderosos para tu negocio</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Dashboards Interactivos</h4>
                      <p className="text-gray-600 text-sm">Visualiza tus métricas clave en tiempo real</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Reportes Personalizables</h4>
                      <p className="text-gray-600 text-sm">Crea reportes específicos para tu industria</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Análisis de Tendencias</h4>
                      <p className="text-gray-600 text-sm">Identifica patrones y oportunidades de crecimiento</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Exportación Automática</h4>
                      <p className="text-gray-600 text-sm">PDF, Excel y reportes para contabilidad</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Resultado:</strong> Decisiones 60% más rápidas basadas en datos precisos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Compras Module */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <ShoppingCart className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Gestión de Compras</h3>
                    <p className="text-gray-600">Control completo de proveedores y adquisiciones</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Gestión de Proveedores</h4>
                      <p className="text-gray-600 text-sm">Base de datos completa con historial de compras</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Órdenes de Compra</h4>
                      <p className="text-gray-600 text-sm">Genera y rastrea órdenes automáticamente</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Control de Costos</h4>
                      <p className="text-gray-600 text-sm">Compara precios y optimiza márgenes de ganancia</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Actualización Automática</h4>
                      <p className="text-gray-600 text-sm">Inventario se actualiza automáticamente con cada compra</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Resultado:</strong> Reducción de 25% en costos de adquisición y mejor control de inventario
                  </p>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm ml-4">Nueva Compra</span>
                    </div>
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Registrar Compra</h3>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Borrador</span>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
                        <div className="bg-gray-50 p-3 rounded-lg border">
                          <p className="font-medium">Distribuidora Los Pinos S.A.</p>
                          <p className="text-sm text-gray-600">RFC: DLP890123ABC</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Productos</label>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Coca Cola 600ml x 24</span>
                            <span className="font-medium">$432.00</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Sabritas Clásicas x 20</span>
                            <span className="font-medium">$280.00</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Subtotal:</span>
                          <span className="font-medium">$712.00</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">IVA (16%):</span>
                          <span className="font-medium">$113.92</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center font-bold">
                            <span>Total:</span>
                            <span className="text-lg text-blue-600">$825.92</span>
                          </div>
                        </div>
                      </div>
                      
                      <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
                        Registrar Compra
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cierre de Caja Module */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400 text-sm ml-4">Cierre de Caja</span>
                    </div>
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Cierre de Turno</h3>
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">En Proceso</span>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium">Monto Inicial:</span>
                          <span className="text-lg font-bold text-blue-600">$500.00</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="font-medium">Ventas en Efectivo:</span>
                          <span className="text-lg font-bold text-green-600">$2,847.50</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                          <span className="font-medium">Ventas con Tarjeta:</span>
                          <span className="text-lg font-bold text-purple-600">$1,684.50</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span className="font-medium">Gastos/Retiros:</span>
                          <span className="text-lg font-bold text-red-600">-$150.00</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-100 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Efectivo Esperado:</span>
                          <span className="font-medium">$3,197.50</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Efectivo Contado:</span>
                          <input type="number" className="w-24 px-2 py-1 border rounded text-right" placeholder="0.00" />
                        </div>
                      </div>
                      
                      <button className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors">
                        Cerrar Caja
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2">
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-xl mr-4">
                    <File className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Cierre de Caja</h3>
                    <p className="text-gray-600">Control preciso de efectivo y arqueos</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Arqueo Automático</h4>
                      <p className="text-gray-600 text-sm">Calcula automáticamente el efectivo esperado</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Detección de Diferencias</h4>
                      <p className="text-gray-600 text-sm">Identifica faltantes o sobrantes al instante</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Historial de Cierres</h4>
                      <p className="text-gray-600 text-sm">Reportes detallados de todos los turnos</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Multi-Usuario</h4>
                      <p className="text-gray-600 text-sm">Cada usuario tiene su propia caja independiente</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Resultado:</strong> 99.8% precisión en arqueos y eliminación de diferencias no justificadas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Planes Modernos y Flexibles
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              Elige el plan que mejor se adapte a tu negocio
            </p>
            <div className="inline-flex items-center bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="mr-2">🎉</span>
              Ahorra hasta un 20% al pagar anual
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative transition-all duration-300 hover:shadow-lg ${plan.popular ? "border-2 border-primary shadow-lg scale-105" : "border-gray-200 hover:border-primary/50"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-3 py-1 flex items-center space-x-1">
                      <span>⭐</span>
                      <span>Más Popular</span>
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-primary">
                        ${plan.price.toLocaleString()} USD
                      </span>
                      <span className="text-gray-500 text-sm">/mes</span>
                    </div>
                    <div className="mb-3">
                      <span className="text-lg font-semibold text-green-600">
                        ${plan.annualPrice.toLocaleString()} USD
                      </span>
                      <span className="text-gray-500 text-xs">/año</span>
                    </div>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <Button
                      className={`w-full text-sm ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-gray-900 hover:bg-gray-800"}`}
                      onClick={() => setLocation("/auth")}
                    >
                      Comenzar Prueba
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const planIds = ['basic', 'pro', 'professional', 'enterprise'];
                          setLocation(`/subscribe?plan=${planIds[index]}&interval=month`);
                        }}
                      >
                        Pagar Mensual
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const planIds = ['basic', 'pro', 'professional', 'enterprise'];
                          setLocation(`/subscribe?plan=${planIds[index]}&interval=year`);
                        }}
                      >
                        Pagar Anual
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Empresarios de diferentes sectores confían en Caja SAS Enterprise para transformar sus negocios
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Testimonio 1 - Mujer Empresaria */}
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative">
                <img 
                  src={testimonialImage1} 
                  alt="Empresaria de cosméticos exitosa"
                  className="w-full h-64 object-cover object-top"
                />
                <div className="absolute top-4 left-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary mb-4 opacity-50" />
                <blockquote className="text-gray-700 mb-4 leading-relaxed">
                  "Caja SAS Enterprise lleva a la medida mis inventarios de shampoos, cosméticos y artículos de alto valor. Además, mis agendas de servicios están bien organizadas."
                </blockquote>
                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-900">María Elena Rodríguez</div>
                  <div className="text-sm text-gray-500">Propietaria - Salón de Belleza Premium</div>
                  <div className="text-xs text-primary mt-1">Sector: Cosméticos y Belleza</div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonio 2 - Mecánico */}
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative">
                <img 
                  src={testimonialImage2} 
                  alt="Mecánico profesional satisfecho"
                  className="w-full h-64 object-cover object-top"
                />
                <div className="absolute top-4 left-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary mb-4 opacity-50" />
                <blockquote className="text-gray-700 mb-4 leading-relaxed">
                  "El sistema Caja SAS Enterprise tiene mejor organizadas las citas de mi taller y la cobranza de mi negocio. Todo está más profesional ahora."
                </blockquote>
                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-900">Carlos Mendoza</div>
                  <div className="text-sm text-gray-500">Propietario - Taller Mecánico Automotriz</div>
                  <div className="text-xs text-primary mt-1">Sector: Servicios Automotrices</div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonio 3 - Empresaria Corporativa */}
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="relative">
                <img 
                  src={testimonialImage3} 
                  alt="Empresaria corporativa exitosa"
                  className="w-full h-64 object-cover object-top"
                />
                <div className="absolute top-4 left-4">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary mb-4 opacity-50" />
                <blockquote className="text-gray-700 mb-4 leading-relaxed">
                  "Gracias a Caja SAS Enterprise llevamos mejor nuestro negocio. El sistema nos permite llevar de manera más organizada nuestras ventas, compras, agendas e inventarios."
                </blockquote>
                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-900">Ana Patricia Vega</div>
                  <div className="text-sm text-gray-500">Directora General - Consultoría Empresarial</div>
                  <div className="text-xs text-primary mt-1">Sector: Servicios Profesionales</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas de confianza */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">1000+</div>
                <div className="text-gray-600 text-sm">Empresas Activas</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">50k+</div>
                <div className="text-gray-600 text-sm">Ventas Procesadas</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-gray-600 text-sm">Tiempo Activo</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
                <div className="text-gray-600 text-sm">Calificación Promedio</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              ¿Listo para transformar tu negocio?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Únete a más de 1000 empresas que confían en nosotros
            </p>
            <div className="mb-6 text-blue-200">
              <p className="text-sm">
                7 días gratis • Sin tarjeta de crédito • Cancela cuando quieras
              </p>
            </div>
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
              onClick={() => setLocation("/auth")}
            >
              Comenzar Ahora
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
