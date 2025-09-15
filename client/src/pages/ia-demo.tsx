import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Calendar, MessageSquare, Mic, Play, Video } from "lucide-react";

export default function IADemo() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-600" />
            Asistente IA
          </h1>
          <p className="text-muted-foreground">
            Descubre cómo nuestro asistente de inteligencia artificial revoluciona la gestión de tu negocio
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Bot className="h-4 w-4 mr-2" />
          Powered by GPT-4o
        </Badge>
      </div>

      {/* Video Demo Principal */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-3">
            <Video className="h-6 w-6" />
            Demo: Creación de Citas con IA
          </CardTitle>
          <CardDescription className="text-blue-100">
            Observa cómo nuestro asistente IA crea citas automáticamente usando comandos de texto o voz
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Demo Interactivo de Chat */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-dashed border-gray-300">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-xl font-bold mb-6 text-center">Simulación en Tiempo Real</h3>
                
                {/* Interfaz de Chat Simulada */}
                <div className="bg-white rounded-lg shadow-lg border">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="h-6 w-6" />
                      <span className="font-semibold">Asistente IA - Caja SAS Enterprise</span>
                      <div className="ml-auto flex gap-1">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">En línea</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 max-h-96 overflow-y-auto space-y-4">
                    {/* Mensaje del Usuario */}
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white rounded-lg p-3 max-w-xs">
                        <p className="text-sm">Crear cita para María García teléfono 555-1234 el 2025-07-10 a las 14:30 para consulta de productos</p>
                        <p className="text-xs opacity-75 mt-1">15:30</p>
                      </div>
                    </div>
                    
                    {/* Indicador de escritura */}
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Respuesta de la IA */}
                    <div className="flex justify-start">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">Asistente IA</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-green-800">✅ Cita creada exitosamente</p>
                          <div className="bg-white rounded-md p-3 text-sm">
                            <p><span className="font-semibold">Cliente:</span> María García</p>
                            <p><span className="font-semibold">Teléfono:</span> 555-1234</p>
                            <p><span className="font-semibold">Fecha:</span> 10 de julio 2025</p>
                            <p><span className="font-semibold">Hora:</span> 2:30 PM</p>
                            <p><span className="font-semibold">Motivo:</span> Consulta de productos</p>
                            <p><span className="font-semibold">Estado:</span> Programada</p>
                          </div>
                          <p className="text-xs text-green-600">La cita aparece automáticamente en el calendario y registro de citas</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">15:31</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white border rounded-lg p-2 text-gray-500 text-sm">
                        Escribe tu mensaje aquí...
                      </div>
                      <Button size="sm" className="bg-blue-600">
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="bg-green-600">
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vista Previa del Calendario */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Vista en Calendario
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm">
                    <div className="font-semibold text-blue-800">10 de Julio, 2025</div>
                    <div className="mt-2 bg-white rounded p-2 border-l-4 border-blue-500">
                      <div className="font-medium">14:30 - María García</div>
                      <div className="text-gray-600 text-xs">555-1234 • Consulta de productos</div>
                      <Badge variant="outline" className="mt-1 text-xs">Programada</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  Registro de Citas
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    <div className="bg-white rounded p-3 border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">María García</div>
                          <div className="text-gray-600">555-1234</div>
                          <div className="text-gray-600">Consulta de productos</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">10/07/25</div>
                          <div className="text-sm">14:30</div>
                          <Badge variant="secondary" className="mt-1">Programada</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botón de Prueba en Vivo */}
            <div className="text-center">
              <Card className="inline-block">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <Bot className="h-8 w-8 text-blue-600" />
                      <div className="text-left">
                        <h4 className="font-semibold">¿Quieres probarlo en vivo?</h4>
                        <p className="text-sm text-muted-foreground">Usa el chat IA flotante para crear una cita ahora mismo</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Probar con Texto
                      </Button>
                      <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                        <Mic className="h-4 w-4 mr-2" />
                        Probar con Voz
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Busca el ícono del robot en la esquina inferior derecha para abrir el chat IA
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Características del Asistente IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Comandos de Texto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Crea citas escribiendo comandos naturales en español
            </p>
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                "Agendar cita con Juan Pérez 555-5678 mañana 15:00"
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                "Crear cita para María 555-9999 el 5 de julio 10:30"
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-green-600" />
              Comandos de Voz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Usa comandos de voz para crear citas sin escribir
            </p>
            <div className="space-y-2">
              <div className="bg-green-50 rounded-lg p-3 text-sm flex items-center gap-2">
                <Mic className="h-4 w-4 text-green-600" />
                "Programar cita Carlos López..."
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-sm flex items-center gap-2">
                <Mic className="h-4 w-4 text-green-600" />
                "Agendar cliente Ana Ruiz..."
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Integración Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Las citas aparecen automáticamente en todos los módulos
            </p>
            <div className="space-y-2">
              <Badge variant="outline" className="mr-2">
                Calendario
              </Badge>
              <Badge variant="outline" className="mr-2">
                Registro de Citas
              </Badge>
              <Badge variant="outline">
                Registro Venta
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Más Funcionalidades de IA */}
      <Card>
        <CardHeader>
          <CardTitle>Otras Funcionalidades del Asistente IA</CardTitle>
          <CardDescription>
            Descubre todo lo que puedes hacer con comandos de texto o voz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-700">📦 Gestión de Productos</h4>
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  "Crear producto Coca Cola precio 15 costo 8"
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  "Agregar hamburguesa precio 35 stock 50"
                </div>
              </div>
              
              <h4 className="font-semibold text-green-700">💰 Ventas POS</h4>
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  "Vender 2 Coca Cola efectivo 30 pesos"
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  "Procesar venta 1 chorizo tarjeta 35"
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-purple-700">🏢 Proveedores</h4>
              <div className="space-y-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  "Crear proveedor Coca Cola email contacto@coca-cola.com"
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                  "Dar de alta proveedor Bimbo teléfono 555-1111"
                </div>
              </div>
              
              <h4 className="font-semibold text-orange-700">📊 Consultas de Negocio</h4>
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  "¿Cuántas ventas tuve hoy?"
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  "¿Cuál es mi producto más vendido?"
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplo de Flujo Completo */}
      <Card>
        <CardHeader>
          <CardTitle>Flujo Completo de Creación de Citas</CardTitle>
          <CardDescription>
            Proceso paso a paso de cómo la IA procesa y crea citas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">1. Input del Usuario</h4>
                <p className="text-muted-foreground">
                  El usuario escribe o dice: "Crear cita para María García teléfono 555-1234 el 10 de julio a las 14:30 para consulta"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 rounded-full p-2 mt-1">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold">2. Procesamiento IA</h4>
                <p className="text-muted-foreground">
                  La IA analiza el texto, extrae la información (nombre, teléfono, fecha, hora, motivo) y valida los datos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 rounded-full p-2 mt-1">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold">3. Creación Automática</h4>
                <p className="text-muted-foreground">
                  El sistema crea la cita automáticamente en la base de datos con todos los campos completos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-100 rounded-full p-2 mt-1">
                <Video className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">4. Visualización Inmediata</h4>
                <p className="text-muted-foreground">
                  La cita aparece instantáneamente en el calendario y en el registro de citas, lista para gestionar
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}