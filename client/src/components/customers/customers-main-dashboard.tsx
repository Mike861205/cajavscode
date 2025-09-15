import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Wallet, Star, TrendingUp, BarChart3, DollarSign, Target, CreditCard } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface CustomerStats {
  totalCustomers: number;
  eligibleCustomers: number;
  ineligibleCustomers: number;
  totalCreditAvailable: number;
  totalCreditUsed: number;
  avgCreditAvailable: number;
  avgCreditUsed: number;
  creditUtilizationRate: number;
  topCreditCustomers: Array<{
    id: number;
    name: string;
    creditAvailable: number;
    creditUsed: number;
    utilizationRate: number;
  }>;
  topUsageCustomers: Array<{
    id: number;
    name: string;
    creditAvailable: number;
    creditUsed: number;
    utilizationRate: number;
  }>;
}

export default function CustomersMainDashboard() {
  const { formatCurrency } = useSettings();
  const { data: stats, isLoading } = useQuery<CustomerStats>({
    queryKey: ['/api/customers/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <Users className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
              <p className="text-blue-100 text-lg">Centro de control y análisis de cartera de clientes</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm text-blue-100">Total Clientes</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">$0.00</div>
              <div className="text-sm text-blue-100">Crédito Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">0%</div>
              <div className="text-sm text-blue-100">Tasa Utilización</div>
            </div>
          </div>
        </div>

        {/* Mensaje sin datos */}
        <Card className="text-center p-8">
          <CardContent>
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay clientes registrados</h3>
            <p className="text-gray-500 mb-4">Comienza registrando tus primeros clientes para ver las estadísticas</p>
            <p className="text-sm text-gray-400">Las estadísticas aparecerán aquí cuando tengas clientes registrados</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eligibilityRate = stats.totalCustomers > 0 
    ? (stats.eligibleCustomers / stats.totalCustomers) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Principal con Estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <Users className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-blue-100 text-lg">Centro de control y análisis de cartera de clientes</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.totalCustomers}</div>
            <div className="text-sm text-blue-100">Total Clientes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{formatCurrency(stats.totalCreditAvailable)}</div>
            <div className="text-sm text-blue-100">Crédito Total</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.creditUtilizationRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-100">Tasa Utilización</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{eligibilityRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-100">Elegibilidad</div>
          </div>
        </div>
      </div>

      {/* Métricas Detalladas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Elegibles</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.eligibleCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Con acceso a crédito
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Elegibilidad</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.ineligibleCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Sin acceso a crédito
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédito Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.avgCreditAvailable)}</div>
            <p className="text-xs text-muted-foreground">
              Por cliente
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso Promedio</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${stats.avgCreditUsed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Por cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes con Mayor Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 - Mayor Crédito Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topCreditCustomers.length > 0 ? (
                stats.topCreditCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-400' : 'bg-green-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">
                          Usado: ${customer.creditUsed.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${customer.creditAvailable.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{customer.utilizationRate.toFixed(1)}% usado</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay clientes con crédito asignado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clientes con Mayor Uso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Top 5 - Mayor Uso de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topUsageCustomers.length > 0 ? (
                stats.topUsageCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">
                          Disponible: ${customer.creditAvailable.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">${customer.creditUsed.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{customer.utilizationRate.toFixed(1)}% usado</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay clientes con uso de crédito</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Crediticio */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-700" />
            Resumen Crediticio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">${stats.totalCreditAvailable.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Disponible</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">${stats.totalCreditUsed.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Utilizado</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.creditUtilizationRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Tasa de Utilización</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}